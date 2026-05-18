import { makeCtx } from '$lib/services';
export type { Product } from '$lib/types/product';
import { listProducts, createProduct, updateProduct, deleteProduct, importProducts } from '$lib/services/product';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listProducts(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		parseInt(url.searchParams.get('page') || '1'),
		url.searchParams.get('category') || ''
	);

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const min_quantity = parseFloat(f.get('min_quantity')?.toString() || '0');
		return createProduct(makeCtx(platform!, locals), {
			code: f.get('code')?.toString().trim() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			unit: f.get('unit')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
			category_id: f.get('category_id')?.toString() || null,
			min_quantity: isNaN(min_quantity) ? 0 : min_quantity,
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const min_quantity = parseFloat(f.get('min_quantity')?.toString() || '0');
		return updateProduct(makeCtx(platform!, locals), {
			id: f.get('id')?.toString() ?? '',
			code: f.get('code')?.toString().trim() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			unit: f.get('unit')?.toString().trim() ?? '',
			description: f.get('description')?.toString().trim() || null,
			category_id: f.get('category_id')?.toString() || null,
			min_quantity: isNaN(min_quantity) ? 0 : min_quantity,
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteProduct(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},

	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('file') as File | null;
		if (!file) return { success: false, error: 'ファイルが選択されていません' };
		return importProducts(makeCtx(platform!, locals), await file.text(), f.get('mode')?.toString() ?? '');
	},
} satisfies Actions;
