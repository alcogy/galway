import { error, redirect, fail } from '@sveltejs/kit';
import { eq, asc, desc, like } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [orderRows, details, suppliers, products] = await Promise.all([
		db
			.select({
				id: schema.purchaseOrders.id,
				order_number: schema.purchaseOrders.order_number,
				ordered_at: schema.purchaseOrders.ordered_at,
				expected_at: schema.purchaseOrders.expected_at,
				supplier_id: schema.purchaseOrders.supplier_id,
				account_id: schema.purchaseOrders.account_id,
				status: schema.purchaseOrders.status,
				note: schema.purchaseOrders.note,
			})
			.from(schema.purchaseOrders)
			.where(eq(schema.purchaseOrders.id, params.id)),

		db
			.select({
				product_id: schema.purchaseOrderDetails.product_id,
				quantity: schema.purchaseOrderDetails.quantity,
			})
			.from(schema.purchaseOrderDetails)
			.where(eq(schema.purchaseOrderDetails.order_id, params.id))
			.orderBy(asc(schema.purchaseOrderDetails.line_no)),

		db
			.select({ id: schema.suppliers.id, name: schema.suppliers.name })
			.from(schema.suppliers)
			.orderBy(asc(schema.suppliers.name)),

		db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	if (!orderRows[0]) error(404, '発注が見つかりません');
	if (orderRows[0].status !== 'draft') error(403, '下書き状態の発注のみ編集できます');

	return { order: orderRows[0], details, suppliers, products };
};

export const actions = {
	update: async ({ params, request, platform }) => {
		const db = getDb(platform!.env.DB);
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
			await db.transaction(async (tx) => {
				await tx
					.update(schema.purchaseOrders)
					.set({ supplier_id, ordered_at, expected_at, note })
					.where(eq(schema.purchaseOrders.id, params.id));

				await tx
					.delete(schema.purchaseOrderDetails)
					.where(eq(schema.purchaseOrderDetails.order_id, params.id));

				for (let i = 0; i < validDetails.length; i++) {
					const d = validDetails[i];
					await tx.insert(schema.purchaseOrderDetails).values({
						order_id: params.id,
						product_id: d.product_id,
						line_no: i + 1,
						quantity: d.quantity,
					});
				}
			});
		} catch (err) {
			console.error('Failed to update purchase order:', err);
			return fail(500, { error: '発注の更新に失敗しました。' });
		}

		redirect(303, `/purchasing/${params.id}`);
	},
} satisfies Actions;
