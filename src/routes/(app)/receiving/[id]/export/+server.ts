import type { RequestHandler } from './$types';
import { makeCtx } from '$lib/services';
import { getSlipExportData } from '$lib/services/receiving';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const { slip, details } = await getSlipExportData(makeCtx(platform!, locals), params.id);

	const headers = ['Product Code', 'Product Name', 'Quantity', 'Unit'];
	const rows = details.map((d) => [d.product_code ?? '', d.product_name ?? '', String(d.quantity), d.unit ?? '']);

	const csv = '﻿' + generateCSV(headers, rows);
	const safeName = (slip.supplier_name ?? '').replace(/[/\\:*?"<>|]/g, '');
	const filename = `${slip.slip_number}_${safeName}_${slip.received_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
		},
	});
};
