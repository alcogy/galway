import { fail } from '@sveltejs/kit';
import { eq, asc, like, or, and, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import { productSchema } from '$lib/validation';
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

export async function createProduct(
	ctx: ServiceCtx,
	data: { code: string; name: string; unit: string; description: string | null; category_id: string | null; min_quantity: number }
) {
	const parsed = productSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { code, name, unit, description, category_id, min_quantity } = parsed.data;

	const now = new Date().toISOString();
	let productId: string | null = null;
	try {
		const [product] = await ctx.db
			.insert(schema.products)
			.values({ code, name, unit, description, category_id: category_id ?? null, min_quantity })
			.returning({ id: schema.products.id });
		productId = product.id;
		await ctx.db
			.insert(schema.inventory)
			.values({ product_id: product.id, quantity: 0, updated_at: now })
			.onConflictDoNothing();
	} catch (err: any) {
		if (productId) await ctx.db.delete(schema.products).where(eq(schema.products.id, productId)).catch(() => {});
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'That product code is already in use' });
		console.error('Failed to create product:', err);
		return fail(500, { error: 'Failed to create product' });
	}
	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'product', target_label: `${code} ${name}` });
	return { success: true };
}

export async function updateProduct(
	ctx: ServiceCtx,
	data: { id: string; code: string; name: string; unit: string; description: string | null; category_id: string | null; min_quantity: number }
) {
	if (!data.id) return fail(400, { error: 'ID is required' });
	const parsed = productSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { code, name, unit, description, category_id, min_quantity } = parsed.data;

	try {
		await ctx.db
			.update(schema.products)
			.set({ code, name, unit, description, category_id: category_id ?? null, min_quantity, updated_at: new Date().toISOString() })
			.where(eq(schema.products.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'product', target_id: data.id, target_label: `${code} ${name}` });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'That product code is already in use' });
		console.error('Failed to update product:', err);
		return fail(500, { error: 'Failed to update product' });
	}
}

export async function deleteProduct(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'ID is required' });

	try {
		const [target] = await ctx.db.select({ code: schema.products.code, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, id));
		await ctx.db.delete(schema.products).where(eq(schema.products.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'product', target_id: id, target_label: target ? `${target.code} ${target.name}` : id });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete product:', err);
		return fail(500, { error: 'Failed to delete product' });
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
	if (mode !== 'append' && mode !== 'replace') return fail(400, { error: 'Invalid import mode' });

	const rows = parseCSV(csvText);
	if (rows.length < 2) return fail(400, { error: 'CSV has no data (requires a header row plus at least one data row)' });

	const [header, ...dataRows] = rows;
	const codeIdx = header.findIndex((h) => h.trim() === 'Product Code');
	const nameIdx = header.findIndex((h) => h.trim() === 'Product Name');
	const unitIdx = header.findIndex((h) => h.trim() === 'Unit');
	const descIdx = header.findIndex((h) => h.trim() === 'Description');

	if (codeIdx === -1) return fail(400, { error: 'CSV must include a "Product Code" column' });
	if (nameIdx === -1) return fail(400, { error: 'CSV must include a "Product Name" column' });
	if (unitIdx === -1) return fail(400, { error: 'CSV must include a "Unit" column' });


	const records = dataRows
		.filter((row) => row[codeIdx]?.trim() && row[nameIdx]?.trim())
		.map((row) => ({
			code: row[codeIdx].trim(),
			name: row[nameIdx].trim(),
			unit: row[unitIdx]?.trim() || '',
			description: descIdx >= 0 ? row[descIdx]?.trim() || null : null,
		}));

	if (records.length === 0) return fail(400, { error: 'No valid data found' });

	const now = new Date().toISOString();
	try {
		if (mode === 'replace') await ctx.db.delete(schema.products);
		const inserted = await ctx.db.insert(schema.products).values(records).returning({ id: schema.products.id });
		for (const p of inserted) {
			await ctx.db.insert(schema.inventory).values({ product_id: p.id, quantity: 0, updated_at: now }).onConflictDoNothing();
		}
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'Duplicate product codes detected' });
		console.error('Failed to import products:', err);
		return fail(500, { error: 'Failed to import products' });
	}
	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'product', detail: { count: records.length, mode } });
	return { success: true, count: records.length };
}
