import { makeCtx } from '$lib/services';
export type { Customer } from '$lib/types/shipping';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '$lib/services/customer';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	listCustomers(makeCtx(platform!, locals));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createCustomer(makeCtx(platform!, locals), {
			name: f.get('name')?.toString().trim() ?? '',
			tel: f.get('tel')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			email: f.get('email')?.toString().trim() || null,
			note: f.get('note')?.toString().trim() || null,
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateCustomer(makeCtx(platform!, locals), {
			id: f.get('id')?.toString() ?? '',
			name: f.get('name')?.toString().trim() ?? '',
			tel: f.get('tel')?.toString().trim() || null,
			zipcode: f.get('zipcode')?.toString().trim() || null,
			address: f.get('address')?.toString().trim() || null,
			email: f.get('email')?.toString().trim() || null,
			note: f.get('note')?.toString().trim() || null,
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteCustomer(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},
} satisfies Actions;
