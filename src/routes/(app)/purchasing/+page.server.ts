import { makeCtx } from '$lib/services';
import { listPurchaseOrders } from '$lib/services/purchasing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listPurchaseOrders(
		makeCtx(platform!, locals),
		url.searchParams.get('status') || '',
		parseInt(url.searchParams.get('page') || '1')
	);
