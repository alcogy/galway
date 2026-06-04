import { fail, error } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import { categorySchema } from '$lib/validation';
import type { ServiceCtx } from '$lib/services';
import type { ProductCategory } from '$lib/types/product';

export async function listCategories(ctx: ServiceCtx) {
	if (ctx.user.role !== 'admin') throw error(403, 'Access denied');
	const rows = await ctx.db
		.select({
			id: schema.productCategories.id,
			name: schema.productCategories.name,
			description: schema.productCategories.description,
			product_count: count(schema.products.id),
		})
		.from(schema.productCategories)
		.leftJoin(schema.products, eq(schema.products.category_id, schema.productCategories.id))
		.groupBy(schema.productCategories.id)
		.orderBy(asc(schema.productCategories.name));

	return { categories: rows as ProductCategory[] };
}

export async function createCategory(ctx: ServiceCtx, data: { name: string; description: string | null }) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });
	const parsed = categorySchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, description } = parsed.data;

	try {
		await ctx.db.insert(schema.productCategories).values({ name, description });
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'category', target_label: name });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'That category name is already in use' });
		console.error('Failed to create category:', err);
		return fail(500, { error: 'Failed to create category' });
	}
}

export async function updateCategory(ctx: ServiceCtx, data: { id: string; name: string; description: string | null }) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });
	if (!data.id) return fail(400, { error: 'ID is required' });
	const parsed = categorySchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, description } = parsed.data;

	try {
		await ctx.db
			.update(schema.productCategories)
			.set({ name, description })
			.where(eq(schema.productCategories.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'category', target_id: data.id, target_label: name });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'That category name is already in use' });
		console.error('Failed to update category:', err);
		return fail(500, { error: 'Failed to update category' });
	}
}

export async function deleteCategory(ctx: ServiceCtx, id: string) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });
	if (!id) return fail(400, { error: 'ID is required' });

	try {
		const [target] = await ctx.db.select({ name: schema.productCategories.name }).from(schema.productCategories).where(eq(schema.productCategories.id, id));
		await ctx.db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'category', target_id: id, target_label: target?.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete category:', err);
		return fail(500, { error: 'Failed to delete category' });
	}
}
