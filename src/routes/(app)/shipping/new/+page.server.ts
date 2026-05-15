import { redirect, fail } from '@sveltejs/kit';
import { like, desc, asc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { logAudit } from '$lib/server/audit';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const [products, customers] = await Promise.all([
		db
			.select({
				id: schema.products.id,
				code: schema.products.code,
				name: schema.products.name,
				unit: schema.products.unit,
			})
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
		db
			.select({ id: schema.customers.id, name: schema.customers.name })
			.from(schema.customers)
			.orderBy(asc(schema.customers.name)),
	]);

	return { products, customers };
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const account_id = locals.user!.id;
		const data = await request.formData();

		const shipped_at = data.get('shipped_at')?.toString();
		const detailsJson = data.get('details')?.toString();
		const note = data.get('note')?.toString() ?? '';
		const customer_id = data.get('customer_id')?.toString() || null;

		if (!shipped_at) return fail(400, { error: '出荷日は必須です' });
		if (!detailsJson) return fail(400, { error: '明細が必要です' });

		let details: { product_id: string; quantity: number }[];
		try {
			details = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: '明細データが不正です' });
		}

		const validDetails = details.filter((d) => d.product_id && d.quantity > 0);
		if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

		try {
			await db.transaction(async (tx) => {
				const year = new Date(shipped_at).getFullYear();
				const [last] = await tx
					.select({ n: schema.shippingSlips.slip_number })
					.from(schema.shippingSlips)
					.where(like(schema.shippingSlips.slip_number, `SHP-${year}-%`))
					.orderBy(desc(schema.shippingSlips.slip_number))
					.limit(1);
				const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
				const slip_number = `SHP-${year}-${String(lastNum + 1).padStart(3, '0')}`;

				const now = new Date().toISOString();

				const [slip] = await tx
					.insert(schema.shippingSlips)
					.values({ slip_number, shipped_at, customer_id, account_id, note })
					.returning({ id: schema.shippingSlips.id });

				for (let i = 0; i < validDetails.length; i++) {
					const d = validDetails[i];
					await tx.insert(schema.shippingSlipDetails).values({
						slip_id: slip.id,
						product_id: d.product_id,
						line_no: i + 1,
						quantity: d.quantity,
					});
				}

				for (const d of validDetails) {
					await tx
						.update(schema.inventory)
						.set({
							quantity: sql`${schema.inventory.quantity} - ${d.quantity}`,
							updated_at: now,
						})
						.where(eq(schema.inventory.product_id, d.product_id));
				}
			});
		} catch (err) {
			const message = String(err);
			if (message.includes('UNIQUE constraint failed') && message.includes('slip_number')) {
				return fail(409, { error: '伝票番号が競合しました。再度お試しください。' });
			}
			throw err;
		}

		await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'create', target_type: 'shipping_slip', detail: { shipped_at, customer_id, item_count: validDetails.length } });
		redirect(303, '/shipping');
	},
} satisfies Actions;
