import { fail } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';
import type { ProductCategory } from '$lib/types/product';

export async function listCategories(ctx: ServiceCtx) {
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
	if (!data.name) return fail(400, { error: 'カテゴリ名は必須です' });

	try {
		await ctx.db.insert(schema.productCategories).values(data);
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'category', target_label: data.name });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'このカテゴリ名はすでに使用されています' });
		console.error('Failed to create category:', err);
		return fail(500, { error: 'カテゴリの登録に失敗しました。' });
	}
}

export async function updateCategory(ctx: ServiceCtx, data: { id: string; name: string; description: string | null }) {
	if (!data.id) return fail(400, { error: 'IDが必要です' });
	if (!data.name) return fail(400, { error: 'カテゴリ名は必須です' });

	try {
		await ctx.db
			.update(schema.productCategories)
			.set({ name: data.name, description: data.description })
			.where(eq(schema.productCategories.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'category', target_id: data.id, target_label: data.name });
		return { success: true };
	} catch (err: any) {
		if (err?.message?.includes('UNIQUE')) return fail(409, { error: 'このカテゴリ名はすでに使用されています' });
		console.error('Failed to update category:', err);
		return fail(500, { error: 'カテゴリの更新に失敗しました。' });
	}
}

export async function deleteCategory(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'IDが必要です' });

	try {
		const [target] = await ctx.db.select({ name: schema.productCategories.name }).from(schema.productCategories).where(eq(schema.productCategories.id, id));
		await ctx.db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'category', target_id: id, target_label: target?.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete category:', err);
		return fail(500, { error: 'カテゴリの削除に失敗しました。' });
	}
}
