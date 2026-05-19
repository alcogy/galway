import type { RequestHandler } from './$types';
import { makeCtx } from '$lib/services';
import { getSlipExportData } from '$lib/services/shipping';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const { slip, details } = await getSlipExportData(makeCtx(platform!, locals), params.id);

	const headers = ['商品コード', '商品名', '数量', '単位'];
	const rows = details.map((d) => [d.product_code ?? '', d.product_name ?? '', String(d.quantity), d.unit ?? '']);

	const csv = '﻿' + generateCSV(headers, rows);
	const filename = `${slip.slip_number}_${slip.shipped_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
