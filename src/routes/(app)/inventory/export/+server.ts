import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, asc, like, or } from 'drizzle-orm';
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

	const inventory = await db
		.select({
			product_code: schema.products.code,
			product_name: schema.products.name,
			quantity: schema.inventory.quantity,
			unit: schema.products.unit,
			updated_at: schema.inventory.updated_at,
		})
		.from(schema.products)
		.leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.product_id))
		.where(whereClause)
		.orderBy(asc(schema.products.code));

	const headers = ['商品コード', '商品名', '在庫数', '単位', '最終更新日'];
	const rows = inventory.map((item) => [
		item.product_code,
		item.product_name,
		String(item.quantity ?? 0),
		item.unit,
		item.updated_at ?? '',
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);
	const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
	const filename = `inventory-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
