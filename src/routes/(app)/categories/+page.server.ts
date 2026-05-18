import { makeCtx } from '$lib/services';
export type { ProductCategory as Category } from '$lib/types/product';
import { listCategories, createCategory, updateCategory, deleteCategory } from '$lib/services/category';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	listCategories(makeCtx(platform!, locals));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createCategory(makeCtx(platform!, locals), {
			name: f.get('name')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateCategory(makeCtx(platform!, locals), {
			id: f.get('id')?.toString() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteCategory(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},
} satisfies Actions;
