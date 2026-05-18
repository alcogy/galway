import { makeCtx } from '$lib/services';
import { getReceivingSlip, deleteReceivingSlip } from '$lib/services/receiving';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) =>
	getReceivingSlip(makeCtx(platform!, locals), params.id);

export const actions = {
	delete: async ({ params, platform, locals }) =>
		deleteReceivingSlip(makeCtx(platform!, locals), params.id),
} satisfies Actions;
