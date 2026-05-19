import { fail } from '@sveltejs/kit';
import { eq, asc, like, or, and, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';

export async function listProducts(ctx: ServiceCtx, search: string, page: number, category: string) {
	const itemsPerPage = 20;
	const currentPage = Math.max(1, page);

	const searchCondition = search
		? or(like(schema.products.code, `%${search}%`), like(schema.products.name, `%${search}%`))
		: undefined;
	const categoryCondition = category ? eq(schema.products.category_id, category) : undefined;
	const whereClause =
		searchCondition && categoryCondition
			? and(searchCondition, categoryCondition)
			: searchCondition ?? categoryCondition;

	const offset = (currentPage - 1) * itemsPerPage;

	const [countResult, products, categories] = await Promise.all([
		ctx.db.select({ count: count() }).from(schema.products).where(whereClause),
		ctx.db
			.select({
				id: schema.products.id,
				code: schema.products.code,
				name: schema.products.name,
				unit: schema.products.unit,
				description: schema.products.description,
				category_id: schema.products.category_id,
				category_name: schema.productCategories.name,
				min_quantity: schema.products.min_quantity,
			})
			.from(schema.products)
			.leftJoin(schema.productCategories, eq(schema.products.category_id, schema.productCategories.id))
			.where(whereClause)
			.orderBy(asc(schema.products.code))
			.limit(itemsPerPage)
			.offset(offset),
		ctx.db
			.select({ id: schema.productCategories.id, name: schema.productCategories.name })
			.from(schema.productCategories)
			.orderBy(asc(schema.productCategories.name)),
	]);

	return {
		products,
		categories,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery: search,
		categoryFilter: category,
	};
}

export async function createProduct(ctx: ServiceCtx, data: {
	code: string;
	name: string;
	unit: string;
	description: string | null;
	category_id: string | null;
	min_quantity: number;
}) {
	if (!data.code) return fail(400, { error: '商品コードは必須です' });
	if (!data.name) return fail(400, { error: '商品名は必須です' });
	if (!data.unit) return fail(400, { error: '単位は必須です' });

	const now = new Date().toISOString();
	try {
		await ctx.db.transaction(async (tx) => {
			const [product] = await tx
				.insert(schema.products)
				.values(data)
				.returning({ id: schema.products.id });
			await tx
				.insert(schema.inventory)
				.values({ product_id: product.id, quantity: 0, updated_at: now })
				.onConflictDoNothing();
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'product', target_label: `${data.code} ${data.name}` });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'この商品コードはすでに使用されています' });
		console.error('Failed to create product:', err);
		return fail(500, { error: '商品の登録に失敗しました。' });
	}
}

export async function updateProduct(ctx: ServiceCtx, data: {
	id: string;
	code: string;
	name: string;
	unit: string;
	description: string | null;
	category_id: string | null;
	min_quantity: number;
}) {
	if (!data.id) return fail(400, { error: 'IDが必要です' });
	if (!data.code) return fail(400, { error: '商品コードは必須です' });
	if (!data.name) return fail(400, { error: '商品名は必須です' });
	if (!data.unit) return fail(400, { error: '単位は必須です' });

	try {
		await ctx.db
			.update(schema.products)
			.set({ ...data, updated_at: new Date().toISOString() })
			.where(eq(schema.products.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'product', target_id: data.id, target_label: `${data.code} ${data.name}` });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'この商品コードはすでに使用されています' });
		console.error('Failed to update product:', err);
		return fail(500, { error: '商品の更新に失敗しました。' });
	}
}

export async function deleteProduct(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'IDが必要です' });

	try {
		const [target] = await ctx.db.select({ code: schema.products.code, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, id));
		await ctx.db.delete(schema.products).where(eq(schema.products.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'product', target_id: id, target_label: target ? `${target.code} ${target.name}` : id });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete product:', err);
		return fail(500, { error: '商品の削除に失敗しました。' });
	}
}

export async function getExportData(ctx: ServiceCtx, search: string, category: string) {
	const searchCondition = search
		? or(like(schema.products.code, `%${search}%`), like(schema.products.name, `%${search}%`))
		: undefined;
	const categoryCondition = category ? eq(schema.products.category_id, category) : undefined;
	const whereClause =
		searchCondition && categoryCondition
			? and(searchCondition, categoryCondition)
			: searchCondition ?? categoryCondition;

	return ctx.db
		.select({
			code: schema.products.code,
			name: schema.products.name,
			category_name: schema.productCategories.name,
			unit: schema.products.unit,
			description: schema.products.description,
			min_quantity: schema.products.min_quantity,
		})
		.from(schema.products)
		.leftJoin(schema.productCategories, eq(schema.products.category_id, schema.productCategories.id))
		.where(whereClause)
		.orderBy(asc(schema.products.code));
}

export async function importProducts(ctx: ServiceCtx, csvText: string, mode: string) {
	if (mode !== 'append' && mode !== 'replace') return fail(400, { error: '無効なインポートモードです' });

	const rows = parseCSV(csvText);
	if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

	const [header, ...dataRows] = rows;
	const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
	const nameIdx = header.findIndex((h) => h.trim() === '商品名');
	const unitIdx = header.findIndex((h) => h.trim() === '単位');
	const descIdx = header.findIndex((h) => h.trim() === '説明');

	if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
	if (nameIdx === -1) return fail(400, { error: 'CSVに「商品名」列が必要です' });
	if (unitIdx === -1) return fail(400, { error: 'CSVに「単位」列が必要です' });

	const records = dataRows
		.filter((row) => row[codeIdx]?.trim() && row[nameIdx]?.trim())
		.map((row) => ({
			code: row[codeIdx].trim(),
			name: row[nameIdx].trim(),
			unit: row[unitIdx]?.trim() || '',
			description: descIdx >= 0 ? row[descIdx]?.trim() || null : null,
		}));

	if (records.length === 0) return fail(400, { error: '有効なデータがありません' });

	const now = new Date().toISOString();
	try {
		await ctx.db.transaction(async (tx) => {
			if (mode === 'replace') await tx.delete(schema.products);
			const inserted = await tx.insert(schema.products).values(records).returning({ id: schema.products.id });
			for (const p of inserted) {
				await tx.insert(schema.inventory).values({ product_id: p.id, quantity: 0, updated_at: now }).onConflictDoNothing();
			}
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'product', detail: { count: records.length, mode } });
		return { success: true, count: records.length };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: '重複する商品コードがあります' });
		console.error('Failed to import products:', err);
		return fail(500, { error: '商品のインポートに失敗しました。' });
	}
}
