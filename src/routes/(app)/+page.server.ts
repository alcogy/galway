import { count, like, eq, and, asc, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const today = new Date().toISOString().slice(0, 10);
	const year = new Date().getFullYear();
	const month = String(new Date().getMonth() + 1).padStart(2, '0');
	const monthPrefix = `${year}-${month}`;

	const [[sc], [pc], [rc], [shc], lowStockRows, todayReceiving, todayShipping, settingsRows] =
		await Promise.all([
			db.select({ count: count() }).from(schema.suppliers),
			db.select({ count: count() }).from(schema.products),
			db
				.select({ count: count() })
				.from(schema.receivingSlips)
				.where(like(schema.receivingSlips.received_at, `${monthPrefix}%`)),
			db
				.select({ count: count() })
				.from(schema.shippingSlips)
				.where(like(schema.shippingSlips.shipped_at, `${monthPrefix}%`)),

			// 低在庫アラート
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

			// 本日の入荷予定（発注ステータス: ordered、入荷予定日: 今日）
			db
				.select({
					order_number: schema.purchaseOrders.order_number,
					supplier_name: schema.suppliers.name,
					product_code: schema.products.code,
					product_name: schema.products.name,
					quantity: schema.purchaseOrderDetails.quantity,
					unit: schema.products.unit,
				})
				.from(schema.purchaseOrderDetails)
				.innerJoin(schema.purchaseOrders, eq(schema.purchaseOrderDetails.order_id, schema.purchaseOrders.id))
				.innerJoin(schema.suppliers, eq(schema.purchaseOrders.supplier_id, schema.suppliers.id))
				.innerJoin(schema.products, eq(schema.purchaseOrderDetails.product_id, schema.products.id))
				.where(
					and(
						eq(schema.purchaseOrders.expected_at, today),
						eq(schema.purchaseOrders.status, 'ordered')
					)
				)
				.orderBy(asc(schema.purchaseOrders.order_number), asc(schema.purchaseOrderDetails.line_no)),

			// 本日の出荷予定（shipped_at: 今日）
			db
				.select({
					slip_number: schema.shippingSlips.slip_number,
					customer_name: schema.customers.name,
					product_code: schema.products.code,
					product_name: schema.products.name,
					quantity: schema.shippingSlipDetails.quantity,
					unit: schema.products.unit,
				})
				.from(schema.shippingSlipDetails)
				.innerJoin(schema.shippingSlips, eq(schema.shippingSlipDetails.slip_id, schema.shippingSlips.id))
				.leftJoin(schema.customers, eq(schema.shippingSlips.customer_id, schema.customers.id))
				.innerJoin(schema.products, eq(schema.shippingSlipDetails.product_id, schema.products.id))
				.where(eq(schema.shippingSlips.shipped_at, today))
				.orderBy(asc(schema.shippingSlips.slip_number), asc(schema.shippingSlipDetails.line_no)),

			// 設定
			db.select().from(schema.settings),
		]);

	const settingsMap = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
	const lowStockEnabled = settingsMap['low_stock_alert_enabled'] !== 'false';

	return {
		supplierCount: sc.count,
		productCount: pc.count,
		receivingCountThisMonth: rc.count,
		shippingCountThisMonth: shc.count,
		lowStockItems: lowStockEnabled ? lowStockRows : [],
		todayReceiving,
		todayShipping,
	};
};
