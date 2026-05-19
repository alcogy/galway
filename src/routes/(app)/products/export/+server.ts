import type { RequestHandler } from './$types';
import { makeCtx } from '$lib/services';
import { getExportData } from '$lib/services/product';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	const data = await getExportData(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		url.searchParams.get('category') || ''
	);

	const headers = ['商品コード', '商品名', 'カテゴリ', '単位', '説明', '最低在庫数'];
	const rows = data.map((p) => [p.code, p.name, p.category_name ?? '', p.unit, p.description ?? '', String(p.min_quantity)]);

	const csv = '﻿' + generateCSV(headers, rows);
	const filename = `products-${new Date().toISOString().slice(0, 10)}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
