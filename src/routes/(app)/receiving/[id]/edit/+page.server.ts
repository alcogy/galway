import { error, redirect, fail } from '@sveltejs/kit';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = getDb(platform!.env.DB);

	const [slipRows, details, suppliers, products, accounts] = await Promise.all([
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

		db
			.select({ id: schema.accounts.id, name: schema.accounts.name })
			.from(schema.accounts)
			.orderBy(asc(schema.accounts.name)),
	]);

	if (!slipRows[0]) error(404, '入荷伝票が見つかりません');

	return {
		slip: slipRows[0],
		details,
		suppliers,
		products,
		accounts,
		isAdmin: locals.user?.role === 'admin',
	};
};

export const actions = {
	update: async ({ params, request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();

		const received_at = data.get('received_at')?.toString();
		const supplier_id = data.get('supplier_id')?.toString();
		const detailsJson = data.get('details')?.toString();
		const note = data.get('note')?.toString() ?? '';
		const isAdmin = locals.user?.role === 'admin';
		const account_id = isAdmin ? data.get('account_id')?.toString() : undefined;

		if (!received_at) return fail(400, { error: '入荷日は必須です' });
		if (!supplier_id) return fail(400, { error: '仕入先は必須です' });
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
				product_id: schema.receivingSlipDetails.product_id,
				quantity: schema.receivingSlipDetails.quantity,
			})
			.from(schema.receivingSlipDetails)
			.where(eq(schema.receivingSlipDetails.slip_id, params.id));

		const updateFields: Record<string, unknown> = { received_at, supplier_id, note };
		if (account_id) updateFields.account_id = account_id;

		await db.batch([
			db
				.update(schema.receivingSlips)
				.set(updateFields)
				.where(eq(schema.receivingSlips.id, params.id)),
			db
				.delete(schema.receivingSlipDetails)
				.where(eq(schema.receivingSlipDetails.slip_id, params.id)),
			...oldDetails.map((d) =>
				db
					.update(schema.inventory)
					.set({
						quantity: sql`${schema.inventory.quantity} - ${d.quantity}`,
						updated_at: now,
					})
					.where(eq(schema.inventory.product_id, d.product_id))
			),
			...validDetails.map((d, i) =>
				db.insert(schema.receivingSlipDetails).values({
					slip_id: params.id,
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

		redirect(303, `/receiving/${params.id}`);
	},
} satisfies Actions;
