import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, asc, like, or, and, inArray } from 'drizzle-orm';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = getDb(platform!.env.DB);

	const searchQuery = url.searchParams.get('search') || '';
	const supplierId = url.searchParams.get('supplier') || '';

	let supplierProductIds: string[] | null = null;
	if (supplierId) {
		const spRows = await db
			.select({ product_id: schema.supplierProducts.product_id })
			.from(schema.supplierProducts)
			.where(eq(schema.supplierProducts.supplier_id, supplierId));
		supplierProductIds = spRows.map((r) => r.product_id);
		if (supplierProductIds.length === 0) {
			const csv = '\uFEFF' + generateCSV(['商品コード', '商品名', '在庫数', '単位', '最終更新日'], []);
			const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
			return new Response(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="inventory-${timestamp}.csv"`,
				},
			});
		}
	}

	const searchCondition = searchQuery
		? or(
				like(schema.products.code, `%${searchQuery}%`),
				like(schema.products.name, `%${searchQuery}%`)
			)
		: undefined;
	const supplierCondition = supplierProductIds
		? inArray(schema.products.id, supplierProductIds)
		: undefined;
	const whereClause =
		searchCondition && supplierCondition
			? and(searchCondition, supplierCondition)
			: searchCondition ?? supplierCondition;

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
