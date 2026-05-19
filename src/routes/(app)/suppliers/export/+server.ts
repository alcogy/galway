import type { RequestHandler } from './$types';
import { makeCtx } from '$lib/services';
import { getExportData } from '$lib/services/supplier';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	const data = await getExportData(makeCtx(platform!, locals), url.searchParams.get('search') || '');

	const headers = ['仕入先名', '電話番号', 'FAX', '郵便番号', '住所', 'メールアドレス'];
	const rows = data.map((s) => [s.name, s.tel ?? '', s.fax ?? '', s.zipcode ?? '', s.address ?? '', s.email ?? '']);

	const csv = '﻿' + generateCSV(headers, rows);
	const filename = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
