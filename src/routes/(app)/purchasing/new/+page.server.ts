import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { getPurchaseOrderForNew, createPurchaseOrder } from '$lib/services/purchasing';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	getPurchaseOrderForNew(makeCtx(platform!, locals));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const detailsJson = f.get('details')?.toString();
		if (!detailsJson) return fail(400, { error: 'Line items are required' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: 'Invalid line item data' });
		}

		return createPurchaseOrder(makeCtx(platform!, locals), {
			supplier_id: f.get('supplier_id')?.toString() ?? '',
			ordered_at: f.get('ordered_at')?.toString() ?? '',
			expected_at: f.get('expected_at')?.toString() || null,
			note: f.get('note')?.toString() ?? '',
			details,
		});
	},
} satisfies Actions;
