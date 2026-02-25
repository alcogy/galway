import { redirect, fail } from '@sveltejs/kit';
import { like, desc, asc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const [suppliers, products] = await Promise.all([
		db
			.select({ id: schema.suppliers.id, name: schema.suppliers.name })
			.from(schema.suppliers)
			.orderBy(asc(schema.suppliers.name)),
		db
			.select({
				id: schema.products.id,
				code: schema.products.code,
				name: schema.products.name,
				unit: schema.products.unit,
			})
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	return { suppliers, products };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const account_id = locals.user!.id;
		const data = await request.formData();

		const received_at = data.get('received_at')?.toString();
		const supplier_id = data.get('supplier_id')?.toString();
		const detailsJson = data.get('details')?.toString();
		const note = data.get('note')?.toString() ?? '';

		if (!received_at) return fail(400, { error: '入荷日は必須です' });
		if (!supplier_id) return fail(400, { error: '仕入先は必須です' });
		if (!detailsJson) return fail(400, { error: '明細が必要です' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: '明細データが不正です' });
		}

		const validDetails = details.filter((d) => d.product_id && d.quantity > 0);
		if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

		const year = new Date(received_at).getFullYear();
		const [last] = await db
			.select({ n: schema.receivingSlips.slip_number })
			.from(schema.receivingSlips)
			.where(like(schema.receivingSlips.slip_number, `RCV-${year}-%`))
			.orderBy(desc(schema.receivingSlips.slip_number))
			.limit(1);
		const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
		const slip_number = `RCV-${year}-${String(lastNum + 1).padStart(3, '0')}`;

		const now = new Date().toISOString();

		const [slip] = await db
			.insert(schema.receivingSlips)
			.values({ slip_number, received_at, supplier_id, account_id, note })
			.returning({ id: schema.receivingSlips.id });

		await db.batch([
			...validDetails.map((d, i) =>
				db.insert(schema.receivingSlipDetails).values({
					slip_id: slip.id,
					product_id: d.product_id,
					line_no: i + 1,
					quantity: d.quantity,
				})
			),
			...validDetails.map((d) =>
				db
					.insert(schema.inventory)
					.values({ product_id: d.product_id, quantity: d.quantity, updated_at: now })
					.onConflictDoUpdate({
						target: schema.inventory.product_id,
						set: {
							quantity: sql`${schema.inventory.quantity} + ${d.quantity}`,
							updated_at: now,
						},
					})
			),
		] as any);

		redirect(303, '/receiving');
	},
} satisfies Actions;
