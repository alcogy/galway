import { error, redirect, fail } from '@sveltejs/kit';
import { eq, desc, count, like, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
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

	if (!orderRows[0]) error(404, 'Purchase order not found');

	const [receivingSlips, receivedByProduct] = await Promise.all([
		ctx.db
			.select({
				id: schema.receivingSlips.id,
				slip_number: schema.receivingSlips.slip_number,
				received_at: schema.receivingSlips.received_at,
				item_count: count(schema.receivingSlipDetails.id),
			})
			.from(schema.receivingSlips)
			.leftJoin(schema.receivingSlipDetails, eq(schema.receivingSlips.id, schema.receivingSlipDetails.slip_id))
			.where(eq(schema.receivingSlips.purchase_order_number, orderRows[0].order_number))
			.groupBy(schema.receivingSlips.id)
			.orderBy(desc(schema.receivingSlips.received_at)),
		ctx.db
			.select({
				product_id: schema.receivingSlipDetails.product_id,
				total_received: sql<number>`sum(${schema.receivingSlipDetails.quantity})`,
			})
			.from(schema.receivingSlipDetails)
			.innerJoin(schema.receivingSlips, eq(schema.receivingSlipDetails.slip_id, schema.receivingSlips.id))
			.where(eq(schema.receivingSlips.purchase_order_number, orderRows[0].order_number))
			.groupBy(schema.receivingSlipDetails.product_id),
	]);

	return { order: orderRows[0], details, receivingSlips, receivedByProduct };
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

	if (!orderRows[0]) error(404, 'Purchase order not found');
	if (orderRows[0].status !== 'draft') error(403, 'Only draft orders can be edited');
	return { order: orderRows[0], details, suppliers, products };
}

export async function createPurchaseOrder(ctx: ServiceCtx, data: {
	supplier_id: string;
	ordered_at: string;
	expected_at: string | null;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.supplier_id) return fail(400, { error: 'Supplier is required' });
	if (!data.ordered_at) return fail(400, { error: 'Order date is required' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: 'At least one valid line item is required' });

	const year = new Date(data.ordered_at).getFullYear();
	const [last] = await ctx.db
		.select({ n: schema.purchaseOrders.order_number })
		.from(schema.purchaseOrders)
		.where(like(schema.purchaseOrders.order_number, `PO-${year}-%`))
		.orderBy(desc(schema.purchaseOrders.order_number))
		.limit(1);
	const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
	const order_number = `PO-${year}-${String(lastNum + 1).padStart(3, '0')}`;

	let newId = '';
	try {
		const [order] = await ctx.db
			.insert(schema.purchaseOrders)
			.values({ order_number, ordered_at: data.ordered_at, expected_at: data.expected_at, supplier_id: data.supplier_id, account_id: ctx.user.id, note: data.note })
			.returning({ id: schema.purchaseOrders.id });
		newId = order.id;
		for (let i = 0; i < validDetails.length; i++) {
			await ctx.db.insert(schema.purchaseOrderDetails).values({ order_id: order.id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
		}
	} catch (err) {
		if (newId) await ctx.db.delete(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, newId)).catch(() => {});
		const message = String(err);
		if (message.includes('UNIQUE constraint failed') && message.includes('order_number')) return fail(409, { error: 'Order number conflict. Please try again.' });
		throw err;
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'purchase_order', target_id: newId, detail: { supplier_id: data.supplier_id, ordered_at: data.ordered_at, item_count: validDetails.length } });
	redirect(303, `/purchasing/${newId}`);
}

export async function updatePurchaseOrder(ctx: ServiceCtx, id: string, data: {
	supplier_id: string;
	ordered_at: string;
	expected_at: string | null;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.supplier_id) return fail(400, { error: 'Supplier is required' });
	if (!data.ordered_at) return fail(400, { error: 'Order date is required' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: 'At least one valid line item is required' });

	try {
		await ctx.db.update(schema.purchaseOrders).set({ supplier_id: data.supplier_id, ordered_at: data.ordered_at, expected_at: data.expected_at, note: data.note }).where(eq(schema.purchaseOrders.id, id));
		await ctx.db.delete(schema.purchaseOrderDetails).where(eq(schema.purchaseOrderDetails.order_id, id));
		for (let i = 0; i < validDetails.length; i++) {
			await ctx.db.insert(schema.purchaseOrderDetails).values({ order_id: id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
		}
	} catch (err) {
		console.error('Failed to update purchase order:', err);
		return fail(500, { error: 'Failed to update purchase order' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'purchase_order', target_id: id, detail: { item_count: validDetails.length } });
	redirect(303, `/purchasing/${id}`);
}

export async function updatePurchaseOrderStatus(ctx: ServiceCtx, id: string, status: 'draft' | 'ordered' | 'received' | 'cancelled') {
	if (!status) return fail(400, { error: 'Status is required' });

	try {
		const [order] = await ctx.db.select({ order_number: schema.purchaseOrders.order_number }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id));
		await ctx.db.update(schema.purchaseOrders).set({ status }).where(eq(schema.purchaseOrders.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'status_change', target_type: 'purchase_order', target_id: id, target_label: order?.order_number, detail: { status } });
		return { success: true };
	} catch (err) {
		console.error('Failed to update status:', err);
		return fail(500, { error: 'Failed to update status' });
	}
}

export async function convertToReceivingSlip(
	ctx: ServiceCtx,
	id: string,
	data: { received_at: string; note: string; details: { product_id: string; quantity: number }[] }
) {
	const [orderRows] = await ctx.db
		.select({
			supplier_id: schema.purchaseOrders.supplier_id,
			status: schema.purchaseOrders.status,
			order_number: schema.purchaseOrders.order_number,
		})
		.from(schema.purchaseOrders)
		.where(eq(schema.purchaseOrders.id, id));

	if (!orderRows) error(404, 'Purchase order not found');
	if (orderRows.status !== 'ordered') return fail(400, { error: 'Receiving slips can only be created for ordered purchases' });
	if (!data.received_at) return fail(400, { error: 'Received date is required' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: 'At least one line item with quantity > 0 is required' });

	const now = new Date().toISOString();
	const slipYear = new Date(data.received_at).getFullYear();
	const [lastSlip] = await ctx.db
		.select({ n: schema.receivingSlips.slip_number })
		.from(schema.receivingSlips)
		.where(like(schema.receivingSlips.slip_number, `RCV-${slipYear}-%`))
		.orderBy(desc(schema.receivingSlips.slip_number))
		.limit(1);
	const lastSlipNum = lastSlip ? parseInt(lastSlip.n.split('-')[2], 10) : 0;
	const slip_number = `RCV-${slipYear}-${String(lastSlipNum + 1).padStart(3, '0')}`;

	let newSlipId = '';
	try {
		const [slip] = await ctx.db
			.insert(schema.receivingSlips)
			.values({ slip_number, received_at: data.received_at, supplier_id: orderRows.supplier_id, account_id: ctx.user.id, purchase_order_number: orderRows.order_number, note: data.note })
			.returning({ id: schema.receivingSlips.id });
		newSlipId = slip.id;

		for (let i = 0; i < validDetails.length; i++) {
			await ctx.db.insert(schema.receivingSlipDetails).values({ slip_id: slip.id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
		}
		for (const d of validDetails) {
			await ctx.db.insert(schema.inventory).values({ product_id: d.product_id, quantity: d.quantity, updated_at: now })
				.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now } });
		}
	} catch (err) {
		if (newSlipId) await ctx.db.delete(schema.receivingSlips).where(eq(schema.receivingSlips.id, newSlipId)).catch(() => {});
		const message = String(err);
		if (message.includes('UNIQUE constraint failed') && message.includes('slip_number')) return fail(409, { error: 'Slip number conflict. Please try again.' });
		console.error('Failed to convert PO to receiving slip:', err);
		return fail(500, { error: 'Failed to create receiving slip' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'receiving_slip', target_id: newSlipId, detail: { from_purchase_order: id, order_number: orderRows.order_number } });
	return { success: true, slipId: newSlipId };
}

export async function deletePurchaseOrder(ctx: ServiceCtx, id: string) {
	const [order] = await ctx.db
		.select({ order_number: schema.purchaseOrders.order_number, status: schema.purchaseOrders.status })
		.from(schema.purchaseOrders)
		.where(eq(schema.purchaseOrders.id, id));
	if (!order) return fail(404, { error: 'Purchase order not found' });
	if (order.status !== 'draft' && order.status !== 'cancelled') {
		return fail(400, { error: 'Only draft or cancelled orders can be deleted' });
	}
	try {
		await ctx.db.delete(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'purchase_order', target_id: id, target_label: order.order_number });
	} catch (err) {
		console.error('Failed to delete purchase order:', err);
		return fail(500, { error: 'Failed to delete purchase order' });
	}
	redirect(303, '/purchasing');
}
