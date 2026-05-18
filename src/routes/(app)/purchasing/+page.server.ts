import { makeCtx } from '$lib/services';
import { listPurchaseOrders } from '$lib/services/purchasing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	listPurchaseOrders(makeCtx(platform!, locals));
