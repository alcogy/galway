import { error, redirect, fail } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);

	const [orderRows, details] = await Promise.all([
		db
			.select({
				id: schema.purchaseOrders.id,
				order_number: schema.purchaseOrders.order_number,
				ordered_at: schema.purchaseOrders.ordered_at,
				expected_at: schema.purchaseOrders.expected_at,
				supplier_id: schema.purchaseOrders.supplier_id,
				supplier_name: schema.suppliers.name,
				account_id: schema.purchaseOrders.account_id,
				user_name: schema.accounts.name,
				status: schema.purchaseOrders.status,
				note: schema.purchaseOrders.note,
				created_at: schema.purchaseOrders.created_at,
			})
			.from(schema.purchaseOrders)
			.leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplier_id, schema.suppliers.id))
			.leftJoin(schema.accounts, eq(schema.purchaseOrders.account_id, schema.accounts.id))
			.where(eq(schema.purchaseOrders.id, params.id)),

		db
			.select({
				id: schema.purchaseOrderDetails.id,
				product_id: schema.purchaseOrderDetails.product_id,
				product_code: schema.products.code,
				product_name: schema.products.name,
				quantity: schema.purchaseOrderDetails.quantity,
				unit: schema.products.unit,
			})
			.from(schema.purchaseOrderDetails)
			.leftJoin(schema.products, eq(schema.purchaseOrderDetails.product_id, schema.products.id))
			.where(eq(schema.purchaseOrderDetails.order_id, params.id))
			.orderBy(asc(schema.purchaseOrderDetails.line_no)),
	]);

	if (!orderRows[0]) error(404, '発注が見つかりません');

	return { order: orderRows[0], details };
};

export const actions = {
	updateStatus: async ({ params, request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const status = data.get('status')?.toString() as 'draft' | 'ordered' | 'received' | 'cancelled' | undefined;

		if (!status) return fail(400, { error: 'ステータスが必要です' });

		try {
			const [order] = await db.select({ order_number: schema.purchaseOrders.order_number }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, params.id));
			await db
				.update(schema.purchaseOrders)
				.set({ status })
				.where(eq(schema.purchaseOrders.id, params.id));
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'status_change', target_type: 'purchase_order', target_id: params.id, target_label: order?.order_number, detail: { status } });
			return { success: true };
		} catch (err) {
			console.error('Failed to update status:', err);
			return fail(500, { error: 'ステータスの更新に失敗しました。' });
		}
	},

	delete: async ({ params, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		try {
			const [order] = await db.select({ order_number: schema.purchaseOrders.order_number }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, params.id));
			await db.delete(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, params.id));
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'delete', target_type: 'purchase_order', target_id: params.id, target_label: order?.order_number });
		} catch (err) {
			console.error('Failed to delete purchase order:', err);
			return fail(500, { error: '発注の削除に失敗しました。' });
		}
		redirect(303, '/purchasing');
	},
} satisfies Actions;
