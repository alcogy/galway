import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		supplierCount: 8,
		productCount: 24,
		receivingCountThisMonth: 13,
		shippingCountThisMonth: 7
	};
};
