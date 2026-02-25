import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details] = await Promise.all([
		db
			.select({
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
			})
			.from(schema.shippingSlips)
			.where(eq(schema.shippingSlips.id, params.id)),

		db
			.select({
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.shippingSlipDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.shippingSlipDetails)
			.leftJoin(schema.products, eq(schema.shippingSlipDetails.product_id, schema.products.id))
			.where(eq(schema.shippingSlipDetails.slip_id, params.id))
			.orderBy(schema.shippingSlipDetails.line_no),
	]);

	if (!slipRows[0]) error(404, '出荷伝票が見つかりません');

	const slip = slipRows[0];

	const headers = ['商品コード', '商品名', '数量', '単位'];
	const rows = details.map((d) => [
		d.product_code ?? '',
		d.product_name ?? '',
		String(d.quantity),
		d.unit ?? '',
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);
	const filename = `${slip.slip_number}_${slip.shipped_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
