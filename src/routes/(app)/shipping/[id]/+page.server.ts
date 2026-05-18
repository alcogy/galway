import { makeCtx } from '$lib/services';
import { getShippingSlip, deleteShippingSlip } from '$lib/services/shipping';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getShippingSlip(makeCtx(platform!, locals), params.id);

export const actions = {
	delete: async ({ params, platform, locals }) =>
		deleteShippingSlip(makeCtx(platform!, locals), params.id),
} satisfies Actions;
