import { error, redirect, fail } from '@sveltejs/kit';
import { eq, count, asc, isNull, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { logAudit } from '$lib/server/audit';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export interface ShippingDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details, products] = await Promise.all([
		db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
				customer_id: schema.shippingSlips.customer_id,
				customer_name: schema.customers.name,
				account_id: schema.shippingSlips.account_id,
				user_name: schema.accounts.name,
				note: schema.shippingSlips.note,
				created_at: schema.shippingSlips.created_at,
				item_count: count(schema.shippingSlipDetails.id),
			})
			.from(schema.shippingSlips)
			.leftJoin(schema.accounts, eq(schema.shippingSlips.account_id, schema.accounts.id))
			.leftJoin(schema.customers, eq(schema.shippingSlips.customer_id, schema.customers.id))
			.leftJoin(
				schema.shippingSlipDetails,
				eq(schema.shippingSlips.id, schema.shippingSlipDetails.slip_id)
			)
			.where(eq(schema.shippingSlips.id, params.id))
			.groupBy(schema.shippingSlips.id),

		db
			.select({
				id: schema.shippingSlipDetails.id,
				product_id: schema.shippingSlipDetails.product_id,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.shippingSlipDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.shippingSlipDetails)
			.leftJoin(schema.products, eq(schema.shippingSlipDetails.product_id, schema.products.id))
			.where(eq(schema.shippingSlipDetails.slip_id, params.id))
			.orderBy(schema.shippingSlipDetails.line_no),

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

	if (!slipRows[0]) error(404, '出荷伝票が見つかりません');

	return { slip: slipRows[0], details, products };
};

export const actions = {
	delete: async ({ params, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const now = new Date().toISOString();

		try {
			await db.transaction(async (tx) => {
				const oldDetails = await tx
					.select({
						product_id: schema.shippingSlipDetails.product_id,
						quantity: schema.shippingSlipDetails.quantity,
					})
					.from(schema.shippingSlipDetails)
					.where(eq(schema.shippingSlipDetails.slip_id, params.id));

				await tx.delete(schema.shippingSlips).where(eq(schema.shippingSlips.id, params.id));

				for (const d of oldDetails) {
					await tx
						.update(schema.inventory)
						.set({
							quantity: sql`${schema.inventory.quantity} + ${d.quantity}`,
							updated_at: now,
						})
						.where(eq(schema.inventory.product_id, d.product_id));
				}
			});
		} catch (err) {
			console.error('Failed to delete shipping slip:', err);
			return fail(500, { error: '出荷伝票の削除に失敗しました。' });
		}

		await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'delete', target_type: 'shipping_slip', target_id: params.id });
		redirect(303, '/shipping');
	},
} satisfies Actions;
