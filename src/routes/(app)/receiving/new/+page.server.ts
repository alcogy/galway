import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { listReceivingSlips, createReceivingSlip } from '$lib/services/receiving';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const { suppliers, products } = await listReceivingSlips(makeCtx(platform!, locals));
	return { suppliers, products };
};

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

		return createReceivingSlip(makeCtx(platform!, locals), {
			received_at: f.get('received_at')?.toString() ?? '',
			supplier_id: f.get('supplier_id')?.toString() ?? '',
			note: f.get('note')?.toString() ?? '',
			details,
		});
	},
} satisfies Actions;
