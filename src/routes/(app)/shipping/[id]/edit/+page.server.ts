import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { getShippingSlipForEdit, updateShippingSlip } from '$lib/services/shipping';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getShippingSlipForEdit(makeCtx(platform!, locals), params.id);

export const actions = {
	update: async ({ params, request, platform, locals }) => {
		const f = await request.formData();
		const detailsJson = f.get('details')?.toString();
		if (!detailsJson) return fail(400, { error: '明細が必要です' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: '明細データが不正です' });
		}

		const ctx = makeCtx(platform!, locals);
		const isAdmin = ctx.user.role === 'admin';

		return updateShippingSlip(ctx, params.id, {
			shipped_at: f.get('shipped_at')?.toString() ?? '',
			customer_id: f.get('customer_id')?.toString() || null,
			note: f.get('note')?.toString() ?? '',
			account_id: isAdmin ? f.get('account_id')?.toString() : undefined,
			details,
		});
	},
} satisfies Actions;
