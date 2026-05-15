import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { asc, like, or, and, eq } from 'drizzle-orm';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = getDb(platform!.env.DB);

	const searchQuery = url.searchParams.get('search') || '';
	const categoryFilter = url.searchParams.get('category') || '';

	const searchCondition = searchQuery
		? or(
				like(schema.products.code, `%${searchQuery}%`),
				like(schema.products.name, `%${searchQuery}%`)
			)
		: undefined;
	const categoryCondition = categoryFilter
		? eq(schema.products.category_id, categoryFilter)
		: undefined;
	const whereClause =
		searchCondition && categoryCondition
			? and(searchCondition, categoryCondition)
			: searchCondition ?? categoryCondition;

	const products = await db
		.select({
			code: schema.products.code,
			name: schema.products.name,
			category_name: schema.productCategories.name,
			unit: schema.products.unit,
			description: schema.products.description,
			min_quantity: schema.products.min_quantity,
		})
		.from(schema.products)
		.leftJoin(schema.productCategories, eq(schema.products.category_id, schema.productCategories.id))
		.where(whereClause)
		.orderBy(asc(schema.products.code));

	const headers = ['商品コード', '商品名', 'カテゴリ', '単位', '説明', '最低在庫数'];
	const rows = products.map((p) => [
		p.code,
		p.name,
		p.category_name ?? '',
		p.unit,
		p.description ?? '',
		String(p.min_quantity),
	]);

	const csv = '﻿' + generateCSV(headers, rows);
	const timestamp = new Date().toISOString().slice(0, 10);
	const filename = `products-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
