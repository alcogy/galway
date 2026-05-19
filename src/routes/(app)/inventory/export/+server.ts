import type { RequestHandler } from './$types';
import { makeCtx } from '$lib/services';
import { getExportData } from '$lib/services/inventory';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	const data = await getExportData(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		url.searchParams.get('supplier') || ''
	);

	const headers = ['商品コード', '商品名', '在庫数', '単位', '最終更新日'];
	const rows = data.map((item) => [
		item.product_code,
		item.product_name,
		String(item.quantity ?? 0),
		item.unit,
		item.updated_at ?? '',
	]);

	const csv = '﻿' + generateCSV(headers, rows);
	const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="inventory-${timestamp}.csv"`,
		},
	});
};
