import { eq, desc, count, asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export interface PurchaseOrder {
	id: string;
	order_number: string;
	ordered_at: string;
	expected_at: string | null;
	supplier_name: string;
	status: 'draft' | 'ordered' | 'received' | 'cancelled';
	item_count: number;
	user_name: string | null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const orders = await db
		.select({
			id: schema.purchaseOrders.id,
			order_number: schema.purchaseOrders.order_number,
			ordered_at: schema.purchaseOrders.ordered_at,
			expected_at: schema.purchaseOrders.expected_at,
			supplier_name: schema.suppliers.name,
			status: schema.purchaseOrders.status,
			item_count: count(schema.purchaseOrderDetails.id),
			user_name: schema.accounts.name,
		})
		.from(schema.purchaseOrders)
		.leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplier_id, schema.suppliers.id))
		.leftJoin(schema.accounts, eq(schema.purchaseOrders.account_id, schema.accounts.id))
		.leftJoin(schema.purchaseOrderDetails, eq(schema.purchaseOrders.id, schema.purchaseOrderDetails.order_id))
		.groupBy(schema.purchaseOrders.id)
		.orderBy(desc(schema.purchaseOrders.ordered_at));

	return { orders };
};
