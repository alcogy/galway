import { error, redirect, fail } from '@sveltejs/kit';
import { eq, count, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export interface ReceivingDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details, suppliers, products] = await Promise.all([
		db
			.select({
				id: schema.receivingSlips.id,
				slip_number: schema.receivingSlips.slip_number,
				received_at: schema.receivingSlips.received_at,
				supplier_id: schema.receivingSlips.supplier_id,
				supplier_name: schema.suppliers.name,
				account_id: schema.receivingSlips.account_id,
				user_name: schema.accounts.name,
				note: schema.receivingSlips.note,
				created_at: schema.receivingSlips.created_at,
				item_count: count(schema.receivingSlipDetails.id),
			})
			.from(schema.receivingSlips)
			.leftJoin(schema.suppliers, eq(schema.receivingSlips.supplier_id, schema.suppliers.id))
			.leftJoin(schema.accounts, eq(schema.receivingSlips.account_id, schema.accounts.id))
			.leftJoin(
				schema.receivingSlipDetails,
				eq(schema.receivingSlips.id, schema.receivingSlipDetails.slip_id)
			)
			.where(eq(schema.receivingSlips.id, params.id))
			.groupBy(schema.receivingSlips.id),

		db
			.select({
				id: schema.receivingSlipDetails.id,
				product_id: schema.receivingSlipDetails.product_id,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.receivingSlipDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.receivingSlipDetails)
			.leftJoin(schema.products, eq(schema.receivingSlipDetails.product_id, schema.products.id))
			.where(eq(schema.receivingSlipDetails.slip_id, params.id))
			.orderBy(schema.receivingSlipDetails.line_no),

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

	if (!slipRows[0]) error(404, '入荷伝票が見つかりません');

	return { slip: slipRows[0], details, suppliers, products };
};

export const actions = {
	delete: async ({ params, platform }) => {
		const db = getDb(platform!.env.DB);
		const now = new Date().toISOString();

		try {
			await db.transaction(async (tx) => {
				const oldDetails = await tx
					.select({
						product_id: schema.receivingSlipDetails.product_id,
						quantity: schema.receivingSlipDetails.quantity,
					})
					.from(schema.receivingSlipDetails)
					.where(eq(schema.receivingSlipDetails.slip_id, params.id));

				await tx.delete(schema.receivingSlips).where(eq(schema.receivingSlips.id, params.id));

				for (const d of oldDetails) {
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
			console.error('Failed to delete receiving slip:', err);
			return fail(500, { error: '入荷伝票の削除に失敗しました。' });
		}

		redirect(303, '/receiving');
	},
} satisfies Actions;
