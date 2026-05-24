import { makeCtx } from '$lib/services';
import { listInventory, stocktake, importInventory } from '$lib/services/inventory';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listInventory(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		parseInt(url.searchParams.get('page') || '1'),
		url.searchParams.get('supplier') || ''
	);

export const actions = {
	stocktake: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const quantity = parseFloat(f.get('quantity')?.toString() ?? '');
		return stocktake(makeCtx(platform!, locals), f.get('product_id')?.toString() ?? '', quantity);
	},

	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('file') as File | null;
		if (!file) return { success: false, error: 'No file selected' };
		return importInventory(makeCtx(platform!, locals), await file.text(), f.get('mode')?.toString() ?? '');
	},
} satisfies Actions;
