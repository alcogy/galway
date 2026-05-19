import { makeCtx } from '$lib/services';
export type { Supplier } from '$lib/types/supplier';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier, importSuppliers, setSupplierProducts } from '$lib/services/supplier';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listSuppliers(makeCtx(platform!, locals), url.searchParams.get('search') || '', parseInt(url.searchParams.get('page') || '1'));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createSupplier(makeCtx(platform!, locals), {
			name: f.get('name')?.toString().trim() ?? '',
			tel: f.get('tel')?.toString().trim() || null,
			fax: f.get('fax')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			email: f.get('email')?.toString().trim() || null,
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateSupplier(makeCtx(platform!, locals), {
			id: f.get('id')?.toString() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			tel: f.get('tel')?.toString().trim() || null,
			fax: f.get('fax')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			email: f.get('email')?.toString().trim() || null,
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteSupplier(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},

	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('file') as File | null;
		if (!file) return { success: false, error: 'ファイルが選択されていません' };
		return importSuppliers(makeCtx(platform!, locals), await file.text(), f.get('mode')?.toString() ?? '');
	},

	setProducts: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const supplierId = f.get('supplier_id')?.toString() ?? '';
		const productIds = f.getAll('product_ids').map((v) => v.toString());
		return setSupplierProducts(makeCtx(platform!, locals), supplierId, productIds);
	},
} satisfies Actions;
