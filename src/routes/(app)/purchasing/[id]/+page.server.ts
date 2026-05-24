import { makeCtx } from '$lib/services';
import { getPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder, convertToReceivingSlip } from '$lib/services/purchasing';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getPurchaseOrder(makeCtx(platform!, locals), params.id);

export const actions = {
	updateStatus: async ({ params, request, platform, locals }) => {
		const f = await request.formData();
		return updatePurchaseOrderStatus(
			makeCtx(platform!, locals),
			params.id,
			f.get('status')?.toString() as 'draft' | 'ordered' | 'received' | 'cancelled'
		);
	},

	convertToReceiving: async ({ params, request, platform, locals }) => {
		const f = await request.formData();
		const detailsJson = f.get('details')?.toString();
		let details: { product_id: string; quantity: number }[] = [];
		try {
			details = detailsJson ? JSON.parse(detailsJson) : [];
		} catch {
			return { error: '明細データが不正です' };
		}
		return convertToReceivingSlip(makeCtx(platform!, locals), params.id, {
			received_at: f.get('received_at')?.toString() ?? '',
			note: f.get('note')?.toString() ?? '',
			details,
		});
	},

	delete: async ({ params, platform, locals }) =>
		deletePurchaseOrder(makeCtx(platform!, locals), params.id),
} satisfies Actions;
