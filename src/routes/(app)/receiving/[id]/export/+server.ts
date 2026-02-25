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
				slip_number: schema.receivingSlips.slip_number,
				received_at: schema.receivingSlips.received_at,
				supplier_name: schema.suppliers.name,
			})
			.from(schema.receivingSlips)
			.leftJoin(schema.suppliers, eq(schema.receivingSlips.supplier_id, schema.suppliers.id))
			.where(eq(schema.receivingSlips.id, params.id)),

		db
			.select({
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.receivingSlipDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.receivingSlipDetails)
			.leftJoin(schema.products, eq(schema.receivingSlipDetails.product_id, schema.products.id))
			.where(eq(schema.receivingSlipDetails.slip_id, params.id))
			.orderBy(schema.receivingSlipDetails.line_no),
	]);

	if (!slipRows[0]) error(404, '入荷伝票が見つかりません');

	const slip = slipRows[0];

	const headers = ['商品コード', '商品名', '数量', '単位'];
	const rows = details.map((d) => [
		d.product_code ?? '',
		d.product_name ?? '',
		String(d.quantity),
		d.unit ?? '',
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);

	const safeName = (slip.supplier_name ?? '').replace(/[/\\:*?"<>|]/g, '');
	const filename = `${slip.slip_number}_${safeName}_${slip.received_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
		},
	});
};
