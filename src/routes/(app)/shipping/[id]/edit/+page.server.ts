import { error, redirect, fail } from '@sveltejs/kit';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details, products] = await Promise.all([
		db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
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
	]);

	if (!slipRows[0]) error(404, '出荷伝票が見つかりません');

	return { slip: slipRows[0], details, products };
};

export const actions = {
	update: async ({ params, request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();

		const shipped_at = data.get('shipped_at')?.toString();
		const detailsJson = data.get('details')?.toString();
		const note = data.get('note')?.toString() ?? '';

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

		const oldDetails = await db
			.select({
				product_id: schema.shippingSlipDetails.product_id,
				quantity: schema.shippingSlipDetails.quantity,
			})
			.from(schema.shippingSlipDetails)
			.where(eq(schema.shippingSlipDetails.slip_id, params.id));

		await db.batch([
			db
				.update(schema.shippingSlips)
				.set({ shipped_at, note })
				.where(eq(schema.shippingSlips.id, params.id)),
			db
				.delete(schema.shippingSlipDetails)
				.where(eq(schema.shippingSlipDetails.slip_id, params.id)),
			// Add back old quantities (reverse shipping effect)
			...oldDetails.map((d) =>
				db
					.update(schema.inventory)
					.set({
						quantity: sql`${schema.inventory.quantity} + ${d.quantity}`,
						updated_at: now,
					})
					.where(eq(schema.inventory.product_id, d.product_id))
			),
			...validDetails.map((d, i) =>
				db.insert(schema.shippingSlipDetails).values({
					slip_id: params.id,
					product_id: d.product_id,
					line_no: i + 1,
					quantity: d.quantity,
				})
			),
			// Subtract new quantities
			...validDetails.map((d) =>
				db
					.update(schema.inventory)
					.set({
						quantity: sql`${schema.inventory.quantity} - ${d.quantity}`,
						updated_at: now,
					})
					.where(eq(schema.inventory.product_id, d.product_id))
			),
		] as any);

		redirect(303, `/shipping/${params.id}`);
	},
} satisfies Actions;
