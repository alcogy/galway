import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { getShippingSlipForNew, createShippingSlip } from '$lib/services/shipping';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	getShippingSlipForNew(makeCtx(platform!, locals));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const detailsJson = f.get('details')?.toString();
		if (!detailsJson) return fail(400, { error: '明細が必要です' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: '明細データが不正です' });
		}

		return createShippingSlip(makeCtx(platform!, locals), {
			shipped_at: f.get('shipped_at')?.toString() ?? '',
			customer_id: f.get('customer_id')?.toString() || null,
			note: f.get('note')?.toString() ?? '',
			details,
		});
	},
} satisfies Actions;
