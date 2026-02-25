import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { asc, like, or } from 'drizzle-orm';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = getDb(platform!.env.DB);

	const searchQuery = url.searchParams.get('search') || '';
	const whereClause = searchQuery
		? or(
				like(schema.products.code, `%${searchQuery}%`),
				like(schema.products.name, `%${searchQuery}%`)
			)
		: undefined;

	const products = await db
		.select()
		.from(schema.products)
		.where(whereClause)
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
