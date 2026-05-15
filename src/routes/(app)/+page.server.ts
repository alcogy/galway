import { count, like, eq, and, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const year = new Date().getFullYear();
	const month = String(new Date().getMonth() + 1).padStart(2, '0');
	const monthPrefix = `${year}-${month}`;

	const [[sc], [pc], [rc], [shc], lowStockRows] = await Promise.all([
		db.select({ count: count() }).from(schema.suppliers),
		db.select({ count: count() }).from(schema.products),
		db.select({ count: count() }).from(schema.receivingSlips)
			.where(like(schema.receivingSlips.received_at, `${monthPrefix}%`)),
		db.select({ count: count() }).from(schema.shippingSlips)
			.where(like(schema.shippingSlips.shipped_at, `${monthPrefix}%`)),
		db
			.select({
				product_code: schema.products.code,
				product_name: schema.products.name,
				unit: schema.products.unit,
				quantity: schema.inventory.quantity,
				min_quantity: schema.products.min_quantity,
			})
			.from(schema.products)
			.innerJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id))
			.where(
				and(
					sql`${schema.products.min_quantity} > 0`,
					sql`${schema.inventory.quantity} < ${schema.products.min_quantity}`
				)
			)
			.orderBy(schema.products.code),
	]);

	return {
		supplierCount: sc.count,
		productCount: pc.count,
		receivingCountThisMonth: rc.count,
		shippingCountThisMonth: shc.count,
		lowStockItems: lowStockRows,
	};
};
