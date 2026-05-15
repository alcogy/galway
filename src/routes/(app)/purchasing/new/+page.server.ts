import { redirect, fail } from '@sveltejs/kit';
import { like, desc, asc } from 'drizzle-orm';
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
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name })
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

		const supplier_id = data.get('supplier_id')?.toString();
		const ordered_at = data.get('ordered_at')?.toString();
		const expected_at = data.get('expected_at')?.toString() || null;
		const note = data.get('note')?.toString() ?? '';
		const detailsJson = data.get('details')?.toString();

		if (!supplier_id) return fail(400, { error: '仕入先は必須です' });
		if (!ordered_at) return fail(400, { error: '発注日は必須です' });
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
			let newId = '';
			await db.transaction(async (tx) => {
				const year = new Date(ordered_at).getFullYear();
				const [last] = await tx
					.select({ n: schema.purchaseOrders.order_number })
					.from(schema.purchaseOrders)
					.where(like(schema.purchaseOrders.order_number, `PO-${year}-%`))
					.orderBy(desc(schema.purchaseOrders.order_number))
					.limit(1);
				const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
				const order_number = `PO-${year}-${String(lastNum + 1).padStart(3, '0')}`;

				const [order] = await tx
					.insert(schema.purchaseOrders)
					.values({ order_number, ordered_at, expected_at, supplier_id, account_id, note })
					.returning({ id: schema.purchaseOrders.id });

				newId = order.id;

				for (let i = 0; i < validDetails.length; i++) {
					const d = validDetails[i];
					await tx.insert(schema.purchaseOrderDetails).values({
						order_id: order.id,
						product_id: d.product_id,
						line_no: i + 1,
						quantity: d.quantity,
					});
				}
			});

			redirect(303, `/purchasing/${newId}`);
		} catch (err) {
			const message = String(err);
			if (message.includes('UNIQUE constraint failed') && message.includes('order_number')) {
				return fail(409, { error: '発注番号が競合しました。再度お試しください。' });
			}
			throw err;
		}
	},
} satisfies Actions;
