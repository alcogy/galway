import { fail } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export interface Category {
	id: string;
	name: string;
	description: string | null;
	product_count: number;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const rows = await db
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

	return { categories: rows as Category[] };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();

		if (!name) return fail(400, { error: 'カテゴリ名は必須です' });

		try {
			await db.insert(schema.productCategories).values({
				name,
				description: data.get('description')?.toString().trim() || null,
			});
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'create', target_type: 'category', target_label: name });
			return { success: true };
		} catch (error: any) {
			if (error?.message?.includes('UNIQUE')) {
				return fail(409, { error: 'このカテゴリ名はすでに使用されています' });
			}
			console.error('Failed to create category:', error);
			return fail(500, { error: 'カテゴリの登録に失敗しました。' });
		}
	},

	update: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();

		if (!id) return fail(400, { error: 'IDが必要です' });
		if (!name) return fail(400, { error: 'カテゴリ名は必須です' });

		try {
			await db
				.update(schema.productCategories)
				.set({
					name,
					description: data.get('description')?.toString().trim() || null,
				})
				.where(eq(schema.productCategories.id, id));
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'update', target_type: 'category', target_id: id, target_label: name });
			return { success: true };
		} catch (error: any) {
			if (error?.message?.includes('UNIQUE')) {
				return fail(409, { error: 'このカテゴリ名はすでに使用されています' });
			}
			console.error('Failed to update category:', error);
			return fail(500, { error: 'カテゴリの更新に失敗しました。' });
		}
	},

	delete: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'IDが必要です' });

		try {
			const [target] = await db.select({ name: schema.productCategories.name }).from(schema.productCategories).where(eq(schema.productCategories.id, id));
			await db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'delete', target_type: 'category', target_id: id, target_label: target?.name });
			return { success: true };
		} catch (error) {
			console.error('Failed to delete category:', error);
			return fail(500, { error: 'カテゴリの削除に失敗しました。' });
		}
	},
} satisfies Actions;
