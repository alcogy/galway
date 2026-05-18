import { fail } from '@sveltejs/kit';
import { eq, asc, like, or, and, count, inArray } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';

export async function listInventory(ctx: ServiceCtx, search: string, page: number, supplierId: string) {
	const itemsPerPage = 20;
	const currentPage = Math.max(1, page);

	const suppliers = await ctx.db
		.select({ id: schema.suppliers.id, name: schema.suppliers.name })
		.from(schema.suppliers)
		.orderBy(asc(schema.suppliers.name));

	let supplierProductIds: string[] | null = null;
	if (supplierId) {
		const spRows = await ctx.db
			.select({ product_id: schema.supplierProducts.product_id })
			.from(schema.supplierProducts)
			.where(eq(schema.supplierProducts.supplier_id, supplierId));
		supplierProductIds = spRows.map((r) => r.product_id);
		if (supplierProductIds.length === 0) {
			const products = await ctx.db
				.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
				.from(schema.products)
				.orderBy(asc(schema.products.code));
			return { inventory: [], products, totalItems: 0, itemsPerPage, currentPage, searchQuery: search, supplierId, suppliers };
		}
	}

	const searchCondition = search
		? or(like(schema.products.code, `%${search}%`), like(schema.products.name, `%${search}%`))
		: undefined;
	const supplierCondition = supplierProductIds ? inArray(schema.products.id, supplierProductIds) : undefined;
	const whereClause =
		searchCondition && supplierCondition
			? and(searchCondition, supplierCondition)
			: searchCondition ?? supplierCondition;

	const offset = (currentPage - 1) * itemsPerPage;

	const [countResult, inventoryRows, products] = await Promise.all([
		ctx.db.select({ count: count() }).from(schema.products).leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id)).where(whereClause),
		ctx.db
			.select({
				product_id: schema.products.id,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.inventory.quantity,
				unit: schema.products.unit,
				min_quantity: schema.products.min_quantity,
				updated_at: schema.inventory.updated_at,
			})
			.from(schema.products)
			.leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id))
			.where(whereClause)
			.orderBy(asc(schema.products.code))
			.limit(itemsPerPage)
			.offset(offset),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	return {
		inventory: inventoryRows.map((item) => ({ ...item, quantity: item.quantity ?? 0, min_quantity: item.min_quantity ?? 0, updated_at: item.updated_at ?? '' })),
		products,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery: search,
		supplierId,
		suppliers,
	};
}

export async function stocktake(ctx: ServiceCtx, product_id: string, quantity: number) {
	if (!product_id) return fail(400, { error: '商品を選択してください' });
	if (isNaN(quantity) || quantity < 0) return fail(400, { error: '数量は0以上の数値で入力してください' });

	const now = new Date().toISOString();
	try {
		const [prod] = await ctx.db.select({ code: schema.products.code, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, product_id));
		await ctx.db.insert(schema.inventory).values({ product_id, quantity, updated_at: now })
			.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity, updated_at: now } });
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'stocktake', target_type: 'inventory', target_id: product_id, target_label: prod ? `${prod.code} ${prod.name}` : product_id, detail: { quantity } });
		return { success: true };
	} catch (err) {
		console.error('Failed to update inventory:', err);
		return fail(500, { error: '在庫の更新に失敗しました。' });
	}
}

export async function importInventory(ctx: ServiceCtx, csvText: string, mode: string) {
	if (mode !== 'append' && mode !== 'replace') return fail(400, { error: 'インポート方法が不正です' });

	const rows = parseCSV(csvText);
	if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

	const [header, ...dataRows] = rows;
	const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
	const qtyIdx = header.findIndex((h) => h.trim() === '数量' || h.trim() === '在庫数');
	if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
	if (qtyIdx === -1) return fail(400, { error: 'CSVに「数量」または「在庫数」列が必要です' });

	const allProducts = await ctx.db.select({ id: schema.products.id, code: schema.products.code }).from(schema.products);
	const productMap = new Map(allProducts.map((p) => [p.code, p.id]));

	const records: { product_id: string; quantity: number }[] = [];
	for (const row of dataRows) {
		const code = row[codeIdx]?.trim();
		const qty = parseFloat(row[qtyIdx]?.trim() ?? '');
		if (!code || isNaN(qty) || qty < 0) continue;
		const productId = productMap.get(code);
		if (!productId) continue;
		records.push({ product_id: productId, quantity: qty });
	}

	if (records.length === 0) return fail(400, { error: '有効なデータがありません' });

	const now = new Date().toISOString();
	try {
		await ctx.db.transaction(async (tx) => {
			if (mode === 'replace') await tx.delete(schema.inventory);
			for (const r of records) {
				await tx.insert(schema.inventory).values({ product_id: r.product_id, quantity: r.quantity, updated_at: now })
					.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity: r.quantity, updated_at: now } });
			}
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'inventory', detail: { count: records.length, mode } });
		return { success: true, count: records.length };
	} catch (err) {
		console.error('Failed to import inventory:', err);
		return fail(500, { error: '在庫データのインポートに失敗しました。' });
	}
}
