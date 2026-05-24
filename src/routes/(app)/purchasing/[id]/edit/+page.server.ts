import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { getPurchaseOrderForEdit, updatePurchaseOrder } from '$lib/services/purchasing';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getPurchaseOrderForEdit(makeCtx(platform!, locals), params.id);

export const actions = {
	update: async ({ params, request, platform, locals }) => {
		const f = await request.formData();
		const detailsJson = f.get('details')?.toString();
		if (!detailsJson) return fail(400, { error: 'Line items are required' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: 'Invalid line item data' });
		}

		return updatePurchaseOrder(makeCtx(platform!, locals), params.id, {
			supplier_id: f.get('supplier_id')?.toString() ?? '',
			ordered_at: f.get('ordered_at')?.toString() ?? '',
			expected_at: f.get('expected_at')?.toString() || null,
			note: f.get('note')?.toString() ?? '',
			details,
		});
	},
} satisfies Actions;
