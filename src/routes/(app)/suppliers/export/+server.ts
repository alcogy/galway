import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { desc, and, or, like, eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { generateCSV } from '$lib/utils/csv';

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const searchQuery = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';

	let whereConditions = [];

	// Add search condition
	//if (searchQuery) {
	//	whereConditions.push(
	//		or(
	//			like(schema.customers.name, `%${searchQuery}%`),
	//			like(schema.customers.email, `%${searchQuery}%`),
	//			like(schema.customers.tel, `%${searchQuery}%`)
	//		)
	//	);
	//}

	// Add status condition
	//if (statusFilter && statusFilter !== 'all') {
	//	whereConditions.push(eq(schema.customers.status, statusFilter as 'active' | 'inactive' | 'lead'));
	//}

	//const customers = await db.query.customers.findMany({
	//	where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
	//	orderBy: [desc(schema.customers.created_at)]
	//});

	// Generate CSV
	//const headers = ['ID', 'Name', 'Zipcode', 'Address', 'Email', 'Tel', 'Fax', 'Status', 'Created At'];
	//const rows = customers.map((customer) => [
	//	customer.id,
	//	customer.name,
	//	customer.zipcode || '',
	//	customer.address || '',
	//	customer.email || '',
	//	customer.tel || '',
	//	customer.fax || '',
	//	customer.status,
	//	customer.created_at
	//]);

	//const csv = generateCSV(headers, rows);

	// Generate filename with timestamp
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
	const filename = `supplier-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
