import { fail } from '@sveltejs/kit';
import { eq, asc, like, or, count } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import type { Actions, PageServerLoad } from './$types';

export interface InventoryItem {
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
	updated_at: string;
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = getDb(platform!.env.DB);

	const itemsPerPage = 20;
	const searchQuery = url.searchParams.get('search') || '';
	const currentPage = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

	const whereClause = searchQuery
		? or(
				like(schema.products.code, `%${searchQuery}%`),
				like(schema.products.name, `%${searchQuery}%`)
			)
		: undefined;
	const offset = (currentPage - 1) * itemsPerPage;

	const [countResult, inventoryRows, products] = await Promise.all([
		db
			.select({ count: count() })
			.from(schema.products)
			.leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id))
			.where(whereClause),

		db
			.select({
				product_id: schema.products.id,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.inventory.quantity,
				unit: schema.products.unit,
				updated_at: schema.inventory.updated_at,
			})
			.from(schema.products)
			.leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id))
			.where(whereClause)
			.orderBy(asc(schema.products.code))
			.limit(itemsPerPage)
			.offset(offset),

		db
			.select({
				id: schema.products.id,
				code: schema.products.code,
				name: schema.products.name,
				unit: schema.products.unit,
			})
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	return {
		inventory: inventoryRows.map((item) => ({
			...item,
			quantity: item.quantity ?? 0,
			updated_at: item.updated_at ?? '',
		})),
		products,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery,
	};
};

export const actions = {
	stocktake: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const product_id = data.get('product_id')?.toString();
		const quantityStr = data.get('quantity')?.toString();

		if (!product_id) return fail(400, { error: '商品を選択してください' });
		if (!quantityStr) return fail(400, { error: '数量を入力してください' });

		const quantity = parseFloat(quantityStr);
		if (isNaN(quantity) || quantity < 0) return fail(400, { error: '数量は0以上の数値で入力してください' });

		const now = new Date().toISOString();

		try {
			await db
				.insert(schema.inventory)
				.values({ product_id, quantity, updated_at: now })
				.onConflictDoUpdate({
					target: schema.inventory.product_id,
					set: { quantity, updated_at: now },
				});

			return { success: true };
		} catch (err) {
			console.error('Failed to update inventory:', err);
			return fail(500, { error: '在庫の更新に失敗しました。' });
		}
	},

	import: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const file = data.get('file') as File | null;
		const mode = data.get('mode')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (mode !== 'append' && mode !== 'replace') return fail(400, { error: 'インポート方法が不正です' });

		const text = await file.text();
		const rows = parseCSV(text);

		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		const [header, ...dataRows] = rows;
		const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
		const qtyIdx = header.findIndex((h) => h.trim() === '数量' || h.trim() === '在庫数');

		if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
		if (qtyIdx === -1) return fail(400, { error: 'CSVに「数量」または「在庫数」列が必要です' });

		const allProducts = await db
			.select({ id: schema.products.id, code: schema.products.code })
			.from(schema.products);
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
			await db.transaction(async (tx) => {
				if (mode === 'replace') {
					await tx.delete(schema.inventory);
				}
				for (const r of records) {
					await tx
						.insert(schema.inventory)
						.values({ product_id: r.product_id, quantity: r.quantity, updated_at: now })
						.onConflictDoUpdate({
							target: schema.inventory.product_id,
							set: { quantity: r.quantity, updated_at: now },
						});
				}
			});
			return { success: true, count: records.length };
		} catch (err) {
			console.error('Failed to import inventory:', err);
			return fail(500, { error: '在庫データのインポートに失敗しました。' });
		}
	},
} satisfies Actions;
