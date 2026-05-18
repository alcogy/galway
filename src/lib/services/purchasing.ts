import { error, redirect, fail } from '@sveltejs/kit';
import { eq, desc, count, like, asc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';

export async function listPurchaseOrders(ctx: ServiceCtx) {
	const orders = await ctx.db
		.select({
			id: schema.purchaseOrders.id,
			order_number: schema.purchaseOrders.order_number,
			ordered_at: schema.purchaseOrders.ordered_at,
			expected_at: schema.purchaseOrders.expected_at,
			supplier_name: schema.suppliers.name,
			status: schema.purchaseOrders.status,
			item_count: count(schema.purchaseOrderDetails.id),
			user_name: schema.accounts.name,
		})
		.from(schema.purchaseOrders)
		.leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplier_id, schema.suppliers.id))
		.leftJoin(schema.accounts, eq(schema.purchaseOrders.account_id, schema.accounts.id))
		.leftJoin(schema.purchaseOrderDetails, eq(schema.purchaseOrders.id, schema.purchaseOrderDetails.order_id))
		.groupBy(schema.purchaseOrders.id)
		.orderBy(desc(schema.purchaseOrders.ordered_at));

	return { orders };
}

export async function getPurchaseOrderForNew(ctx: ServiceCtx) {
	const [suppliers, products] = await Promise.all([
		ctx.db.select({ id: schema.suppliers.id, name: schema.suppliers.name }).from(schema.suppliers).orderBy(asc(schema.suppliers.name)),
		ctx.db.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name }).from(schema.products).orderBy(asc(schema.products.code)),
	]);
	return { suppliers, products };
}

export async function getPurchaseOrder(ctx: ServiceCtx, id: string) {
	const [orderRows, details] = await Promise.all([
		ctx.db
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
			.where(eq(schema.purchaseOrders.id, id)),
		ctx.db
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
			.where(eq(schema.purchaseOrderDetails.order_id, id))
			.orderBy(asc(schema.purchaseOrderDetails.line_no)),
	]);

	if (!orderRows[0]) error(404, '発注が見つかりません');
	return { order: orderRows[0], details };
}

export async function getPurchaseOrderForEdit(ctx: ServiceCtx, id: string) {
	const [orderRows, details, suppliers, products] = await Promise.all([
		ctx.db
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
			.where(eq(schema.purchaseOrders.id, id)),
		ctx.db
			.select({ product_id: schema.purchaseOrderDetails.product_id, quantity: schema.purchaseOrderDetails.quantity })
			.from(schema.purchaseOrderDetails)
			.where(eq(schema.purchaseOrderDetails.order_id, id))
			.orderBy(asc(schema.purchaseOrderDetails.line_no)),
		ctx.db.select({ id: schema.suppliers.id, name: schema.suppliers.name }).from(schema.suppliers).orderBy(asc(schema.suppliers.name)),
		ctx.db.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name }).from(schema.products).orderBy(asc(schema.products.code)),
	]);

	if (!orderRows[0]) error(404, '発注が見つかりません');
	if (orderRows[0].status !== 'draft') error(403, '下書き状態の発注のみ編集できます');
	return { order: orderRows[0], details, suppliers, products };
}

export async function createPurchaseOrder(ctx: ServiceCtx, data: {
	supplier_id: string;
	ordered_at: string;
	expected_at: string | null;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.supplier_id) return fail(400, { error: '仕入先は必須です' });
	if (!data.ordered_at) return fail(400, { error: '発注日は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	let newId = '';
	try {
		await ctx.db.transaction(async (tx) => {
			const year = new Date(data.ordered_at).getFullYear();
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
				.values({ order_number, ordered_at: data.ordered_at, expected_at: data.expected_at, supplier_id: data.supplier_id, account_id: ctx.user.id, note: data.note })
				.returning({ id: schema.purchaseOrders.id });

			newId = order.id;
			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.purchaseOrderDetails).values({ order_id: order.id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'purchase_order', target_id: newId, detail: { supplier_id: data.supplier_id, ordered_at: data.ordered_at, item_count: validDetails.length } });
		redirect(303, `/purchasing/${newId}`);
	} catch (err) {
		const message = String(err);
		if (message.includes('UNIQUE constraint failed') && message.includes('order_number')) return fail(409, { error: '発注番号が競合しました。再度お試しください。' });
		throw err;
	}
}

export async function updatePurchaseOrder(ctx: ServiceCtx, id: string, data: {
	supplier_id: string;
	ordered_at: string;
	expected_at: string | null;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.supplier_id) return fail(400, { error: '仕入先は必須です' });
	if (!data.ordered_at) return fail(400, { error: '発注日は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	try {
		await ctx.db.transaction(async (tx) => {
			await tx.update(schema.purchaseOrders).set({ supplier_id: data.supplier_id, ordered_at: data.ordered_at, expected_at: data.expected_at, note: data.note }).where(eq(schema.purchaseOrders.id, id));
			await tx.delete(schema.purchaseOrderDetails).where(eq(schema.purchaseOrderDetails.order_id, id));
			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.purchaseOrderDetails).values({ order_id: id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
		});
	} catch (err) {
		console.error('Failed to update purchase order:', err);
		return fail(500, { error: '発注の更新に失敗しました。' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'purchase_order', target_id: id, detail: { item_count: validDetails.length } });
	redirect(303, `/purchasing/${id}`);
}

export async function updatePurchaseOrderStatus(ctx: ServiceCtx, id: string, status: 'draft' | 'ordered' | 'received' | 'cancelled') {
	if (!status) return fail(400, { error: 'ステータスが必要です' });

	try {
		const [order] = await ctx.db.select({ order_number: schema.purchaseOrders.order_number }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id));
		await ctx.db.update(schema.purchaseOrders).set({ status }).where(eq(schema.purchaseOrders.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'status_change', target_type: 'purchase_order', target_id: id, target_label: order?.order_number, detail: { status } });
		return { success: true };
	} catch (err) {
		console.error('Failed to update status:', err);
		return fail(500, { error: 'ステータスの更新に失敗しました。' });
	}
}

export async function deletePurchaseOrder(ctx: ServiceCtx, id: string) {
	try {
		const [order] = await ctx.db.select({ order_number: schema.purchaseOrders.order_number }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id));
		await ctx.db.delete(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'purchase_order', target_id: id, target_label: order?.order_number });
	} catch (err) {
		console.error('Failed to delete purchase order:', err);
		return fail(500, { error: '発注の削除に失敗しました。' });
	}
	redirect(303, '/purchasing');
}
