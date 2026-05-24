import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details] = await Promise.all([
		db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
				customer_name: schema.customers.name,
				user_name: schema.accounts.name,
				note: schema.shippingSlips.note,
			})
			.from(schema.shippingSlips)
			.leftJoin(schema.accounts, eq(schema.shippingSlips.account_id, schema.accounts.id))
			.leftJoin(schema.customers, eq(schema.shippingSlips.customer_id, schema.customers.id))
			.where(eq(schema.shippingSlips.id, params.id)),

		db
			.select({
				line_no: schema.shippingSlipDetails.line_no,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.shippingSlipDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.shippingSlipDetails)
			.leftJoin(schema.products, eq(schema.shippingSlipDetails.product_id, schema.products.id))
			.where(eq(schema.shippingSlipDetails.slip_id, params.id))
			.orderBy(asc(schema.shippingSlipDetails.line_no)),
	]);

	if (!slipRows[0]) error(404, 'Shipping slip not found');

	return { slip: slipRows[0], details };
};
