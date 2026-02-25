import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const suppliers = await db
		.select()
		.from(schema.suppliers)
		.orderBy(asc(schema.suppliers.name));

	const headers = ['仕入先名', '電話番号', 'FAX', '郵便番号', '住所', 'メールアドレス'];
	const rows = suppliers.map((s) => [
		s.name,
		s.tel ?? '',
		s.fax ?? '',
		s.zipcode ?? '',
		s.address ?? '',
		s.email ?? '',
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);
	const timestamp = new Date().toISOString().slice(0, 10);
	const filename = `suppliers-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
