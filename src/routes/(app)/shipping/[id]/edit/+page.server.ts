import { error, redirect, fail } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details, products, accounts, customers] = await Promise.all([
		db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
				customer_id: schema.shippingSlips.customer_id,
				account_id: schema.shippingSlips.account_id,
				user_name: schema.accounts.name,
				note: schema.shippingSlips.note,
				item_count: count(schema.shippingSlipDetails.id),
			})
			.from(schema.shippingSlips)
			.leftJoin(schema.accounts, eq(schema.shippingSlips.account_id, schema.accounts.id))
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

		db
			.select({ id: schema.accounts.id, name: schema.accounts.name })
			.from(schema.accounts)
			.orderBy(asc(schema.accounts.name)),
		db
			.select({ id: schema.customers.id, name: schema.customers.name })
			.from(schema.customers)
			.orderBy(asc(schema.customers.name)),
	]);

	if (!slipRows[0]) error(404, '出荷伝票が見つかりません');

	return {
		slip: slipRows[0],
		details,
		products,
		accounts,
		customers,
		isAdmin: locals.user?.role === 'admin',
	};
};

export const actions = {
	update: async ({ params, request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();

		const shipped_at = data.get('shipped_at')?.toString();
		const detailsJson = data.get('details')?.toString();
		const note = data.get('note')?.toString() ?? '';
		const customer_id = data.get('customer_id')?.toString() || null;
		const isAdmin = locals.user?.role === 'admin';
		const account_id = isAdmin ? data.get('account_id')?.toString() : undefined;

		if (!shipped_at) return fail(400, { error: '出荷日は必須です' });
		if (!detailsJson) return fail(400, { error: '明細が必要です' });

		let newDetails: { product_id: string; quantity: number }[];
		try {
			newDetails = JSON.parse(detailsJson);
		} catch {
			return fail(400, { error: '明細データが不正です' });
		}

		const validDetails = newDetails.filter((d) => d.product_id && d.quantity > 0);
		if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

		const now = new Date().toISOString();
		const updateFields: Record<string, unknown> = { shipped_at, note, customer_id };
		if (account_id) updateFields.account_id = account_id;

		try {
			await db.transaction(async (tx) => {
				const oldDetails = await tx
					.select({
						product_id: schema.shippingSlipDetails.product_id,
						quantity: schema.shippingSlipDetails.quantity,
					})
					.from(schema.shippingSlipDetails)
					.where(eq(schema.shippingSlipDetails.slip_id, params.id));

				await tx
					.update(schema.shippingSlips)
					.set(updateFields)
					.where(eq(schema.shippingSlips.id, params.id));

				await tx
					.delete(schema.shippingSlipDetails)
					.where(eq(schema.shippingSlipDetails.slip_id, params.id));

				// Add back old quantities (reverse shipping effect)
				for (const d of oldDetails) {
					await tx
						.update(schema.inventory)
						.set({
							quantity: sql`${schema.inventory.quantity} + ${d.quantity}`,
							updated_at: now,
						})
						.where(eq(schema.inventory.product_id, d.product_id));
				}

				// Insert new details and subtract new quantities
				for (let i = 0; i < validDetails.length; i++) {
					const d = validDetails[i];
					await tx.insert(schema.shippingSlipDetails).values({
						slip_id: params.id,
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
			console.error('Failed to update shipping slip:', err);
			return fail(500, { error: '出荷伝票の更新に失敗しました。' });
		}

		redirect(303, `/shipping/${params.id}`);
	},
} satisfies Actions;
