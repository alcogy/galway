import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const products = await db
		.select()
		.from(schema.products)
		.orderBy(asc(schema.products.code));

	const headers = ['商品コード', '商品名', '単位', '説明'];
	const rows = products.map((p) => [p.code, p.name, p.unit, p.description ?? '']);

	const csv = '\uFEFF' + generateCSV(headers, rows);
	const timestamp = new Date().toISOString().slice(0, 10);
	const filename = `products-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
