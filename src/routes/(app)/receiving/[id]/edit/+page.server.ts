import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { getReceivingSlipForEdit, updateReceivingSlip } from '$lib/services/receiving';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getReceivingSlipForEdit(makeCtx(platform!, locals), params.id);

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

		const ctx = makeCtx(platform!, locals);
		const isAdmin = ctx.user.role === 'admin';

		return updateReceivingSlip(ctx, params.id, {
			received_at: f.get('received_at')?.toString() ?? '',
			supplier_id: f.get('supplier_id')?.toString() ?? '',
			note: f.get('note')?.toString() ?? '',
			account_id: isAdmin ? f.get('account_id')?.toString() : undefined,
			details,
		});
	},
} satisfies Actions;
