import { eq, like, sum, count, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { ServiceCtx } from '$lib/services';

function monthRange(offset: number) {
	const d = new Date();
	d.setMonth(d.getMonth() + offset);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	return { prefix: `${y}-${m}`, label: `${y}年${m}月` };
}

export async function loadReports(ctx: ServiceCtx) {
	const months = Array.from({ length: 6 }, (_, i) => monthRange(-(5 - i)));

	const [receivingByMonth, shippingByMonth, topProducts, supplierRanking] = await Promise.all([
		Promise.all(
			months.map(async (m) => {
				const [row] = await ctx.db
					.select({ total: sum(schema.receivingSlipDetails.quantity) })
					.from(schema.receivingSlipDetails)
					.innerJoin(schema.receivingSlips, eq(schema.receivingSlipDetails.slip_id, schema.receivingSlips.id))
					.where(like(schema.receivingSlips.received_at, `${m.prefix}%`));
				return { label: m.label, value: Number(row?.total ?? 0) };
			})
		),
		Promise.all(
			months.map(async (m) => {
				const [row] = await ctx.db
					.select({ total: sum(schema.shippingSlipDetails.quantity) })
					.from(schema.shippingSlipDetails)
					.innerJoin(schema.shippingSlips, eq(schema.shippingSlipDetails.slip_id, schema.shippingSlips.id))
					.where(like(schema.shippingSlips.shipped_at, `${m.prefix}%`));
				return { label: m.label, value: Number(row?.total ?? 0) };
			})
		),
		ctx.db
			.select({
				product_code: schema.products.code,
				product_name: schema.products.name,
				unit: schema.products.unit,
				total_shipped: sum(schema.shippingSlipDetails.quantity),
			})
			.from(schema.shippingSlipDetails)
			.innerJoin(schema.products, eq(schema.shippingSlipDetails.product_id, schema.products.id))
			.groupBy(schema.products.id)
			.orderBy(desc(sum(schema.shippingSlipDetails.quantity)))
			.limit(10),
		ctx.db
			.select({
				supplier_name: schema.suppliers.name,
				slip_count: count(schema.receivingSlips.id),
			})
			.from(schema.receivingSlips)
			.innerJoin(schema.suppliers, eq(schema.receivingSlips.supplier_id, schema.suppliers.id))
			.groupBy(schema.suppliers.id)
			.orderBy(desc(count(schema.receivingSlips.id)))
			.limit(10),
	]);

	return {
		receivingByMonth,
		shippingByMonth,
		topProducts: topProducts.map((p) => ({ ...p, total_shipped: Number(p.total_shipped ?? 0) })),
		supplierRanking,
	};
}
