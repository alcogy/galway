import { error, redirect, fail } from '@sveltejs/kit';
import { eq, desc, count, like, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';

export async function listReceivingSlips(ctx: ServiceCtx) {
	const [slips, suppliers, products] = await Promise.all([
		ctx.db
			.select({
				id: schema.receivingSlips.id,
				slip_number: schema.receivingSlips.slip_number,
				received_at: schema.receivingSlips.received_at,
				supplier_id: schema.receivingSlips.supplier_id,
				supplier_name: schema.suppliers.name,
				item_count: count(schema.receivingSlipDetails.id),
				user_name: schema.accounts.name,
			})
			.from(schema.receivingSlips)
			.leftJoin(schema.suppliers, eq(schema.receivingSlips.supplier_id, schema.suppliers.id))
			.leftJoin(schema.accounts, eq(schema.receivingSlips.account_id, schema.accounts.id))
			.leftJoin(schema.receivingSlipDetails, eq(schema.receivingSlips.id, schema.receivingSlipDetails.slip_id))
			.groupBy(schema.receivingSlips.id)
			.orderBy(desc(schema.receivingSlips.received_at)),
		ctx.db
			.select({ id: schema.suppliers.id, name: schema.suppliers.name })
			.from(schema.suppliers)
			.orderBy(asc(schema.suppliers.name)),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	return { slips, suppliers, products };
}

export async function getReceivingSlip(ctx: ServiceCtx, id: string) {
	const [slipRows, details, suppliers, products] = await Promise.all([
		ctx.db
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
			.leftJoin(schema.receivingSlipDetails, eq(schema.receivingSlips.id, schema.receivingSlipDetails.slip_id))
			.where(eq(schema.receivingSlips.id, id))
			.groupBy(schema.receivingSlips.id),
		ctx.db
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
			.where(eq(schema.receivingSlipDetails.slip_id, id))
			.orderBy(schema.receivingSlipDetails.line_no),
		ctx.db
			.select({ id: schema.suppliers.id, name: schema.suppliers.name })
			.from(schema.suppliers)
			.orderBy(asc(schema.suppliers.name)),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	if (!slipRows[0]) error(404, '入荷伝票が見つかりません');
	return { slip: slipRows[0], details, suppliers, products };
}

export async function getReceivingSlipForEdit(ctx: ServiceCtx, id: string) {
	const base = await getReceivingSlip(ctx, id);
	const accounts = await ctx.db
		.select({ id: schema.accounts.id, name: schema.accounts.name })
		.from(schema.accounts)
		.orderBy(asc(schema.accounts.name));
	return { ...base, accounts, isAdmin: ctx.user.role === 'admin' };
}

export async function createReceivingSlip(ctx: ServiceCtx, data: {
	received_at: string;
	supplier_id: string;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.received_at) return fail(400, { error: '入荷日は必須です' });
	if (!data.supplier_id) return fail(400, { error: '仕入先は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	try {
		await ctx.db.transaction(async (tx) => {
			const slip_number = await nextReceivingSlipNumber(tx, data.received_at);
			const now = new Date().toISOString();
			const [slip] = await tx
				.insert(schema.receivingSlips)
				.values({ slip_number, received_at: data.received_at, supplier_id: data.supplier_id, account_id: ctx.user.id, note: data.note })
				.returning({ id: schema.receivingSlips.id });

			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.receivingSlipDetails).values({ slip_id: slip.id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
			for (const d of validDetails) {
				await tx.insert(schema.inventory).values({ product_id: d.product_id, quantity: d.quantity, updated_at: now })
					.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now } });
			}
		});
	} catch (err) {
		if (isSlipNumberConflict(err)) return fail(409, { error: '伝票番号が競合しました。再度お試しください。' });
		throw err;
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'receiving_slip', detail: { supplier_id: data.supplier_id, received_at: data.received_at, item_count: validDetails.length } });
	redirect(303, '/receiving');
}

export async function updateReceivingSlip(ctx: ServiceCtx, id: string, data: {
	received_at: string;
	supplier_id: string;
	note: string;
	account_id?: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.received_at) return fail(400, { error: '入荷日は必須です' });
	if (!data.supplier_id) return fail(400, { error: '仕入先は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	const now = new Date().toISOString();
	const updateFields: Record<string, unknown> = { received_at: data.received_at, supplier_id: data.supplier_id, note: data.note };
	if (data.account_id) updateFields.account_id = data.account_id;

	try {
		await ctx.db.transaction(async (tx) => {
			const oldDetails = await tx
				.select({ product_id: schema.receivingSlipDetails.product_id, quantity: schema.receivingSlipDetails.quantity })
				.from(schema.receivingSlipDetails)
				.where(eq(schema.receivingSlipDetails.slip_id, id));

			await tx.update(schema.receivingSlips).set(updateFields).where(eq(schema.receivingSlips.id, id));
			await tx.delete(schema.receivingSlipDetails).where(eq(schema.receivingSlipDetails.slip_id, id));

			for (const d of oldDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} - ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.receivingSlipDetails).values({ slip_id: id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
			for (const d of validDetails) {
				await tx.insert(schema.inventory).values({ product_id: d.product_id, quantity: d.quantity, updated_at: now })
					.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now } });
			}
		});
	} catch (err) {
		console.error('Failed to update receiving slip:', err);
		return fail(500, { error: '入荷伝票の更新に失敗しました。' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'receiving_slip', target_id: id, detail: { item_count: validDetails.length } });
	redirect(303, `/receiving/${id}`);
}

export async function deleteReceivingSlip(ctx: ServiceCtx, id: string) {
	const now = new Date().toISOString();
	try {
		await ctx.db.transaction(async (tx) => {
			const oldDetails = await tx
				.select({ product_id: schema.receivingSlipDetails.product_id, quantity: schema.receivingSlipDetails.quantity })
				.from(schema.receivingSlipDetails)
				.where(eq(schema.receivingSlipDetails.slip_id, id));
			await tx.delete(schema.receivingSlips).where(eq(schema.receivingSlips.id, id));
			for (const d of oldDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} - ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
		});
	} catch (err) {
		console.error('Failed to delete receiving slip:', err);
		return fail(500, { error: '入荷伝票の削除に失敗しました。' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'receiving_slip', target_id: id });
	redirect(303, '/receiving');
}

export async function importReceivingSlips(ctx: ServiceCtx, csvText: string, date: string, supplierId: string) {
	if (!date) return fail(400, { error: '入荷日を選択してください' });
	if (!supplierId) return fail(400, { error: '仕入先を選択してください' });

	const rows = parseCSV(csvText);
	if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

	const [header, ...dataRows] = rows;
	const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
	const qtyIdx = header.findIndex((h) => h.trim() === '数量');
	if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
	if (qtyIdx === -1) return fail(400, { error: 'CSVに「数量」列が必要です' });

	const allProducts = await ctx.db.select({ id: schema.products.id, code: schema.products.code }).from(schema.products);
	const productMap = new Map(allProducts.map((p) => [p.code, p.id]));

	const detailRecords: { product_id: string; quantity: number }[] = [];
	for (const row of dataRows) {
		const code = row[codeIdx]?.trim();
		const qty = parseFloat(row[qtyIdx]?.trim() ?? '');
		if (!code || isNaN(qty) || qty <= 0) continue;
		const productId = productMap.get(code);
		if (!productId) continue;
		detailRecords.push({ product_id: productId, quantity: qty });
	}

	if (detailRecords.length === 0) return fail(400, { error: '有効なデータがありません' });

	try {
		await ctx.db.transaction(async (tx) => {
			const slip_number = await nextReceivingSlipNumber(tx, date);
			const now = new Date().toISOString();
			const [slip] = await tx
				.insert(schema.receivingSlips)
				.values({ slip_number, received_at: date, supplier_id: supplierId, account_id: ctx.user.id, note: '' })
				.returning({ id: schema.receivingSlips.id });

			for (let i = 0; i < detailRecords.length; i++) {
				await tx.insert(schema.receivingSlipDetails).values({ slip_id: slip.id, product_id: detailRecords[i].product_id, line_no: i + 1, quantity: detailRecords[i].quantity });
			}
			for (const d of detailRecords) {
				await tx.insert(schema.inventory).values({ product_id: d.product_id, quantity: d.quantity, updated_at: now })
					.onConflictDoUpdate({ target: schema.inventory.product_id, set: { quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now } });
			}
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'receiving_slip', detail: { count: detailRecords.length, date } });
		return { success: true, count: detailRecords.length };
	} catch (err) {
		if (isSlipNumberConflict(err)) return fail(409, { error: '伝票番号が競合しました。再度お試しください。' });
		console.error('Failed to import receiving slips:', err);
		return fail(500, { error: '入荷伝票のインポートに失敗しました。' });
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextReceivingSlipNumber(tx: any, date: string) {
	const year = new Date(date).getFullYear();
	const [last] = await tx
		.select({ n: schema.receivingSlips.slip_number })
		.from(schema.receivingSlips)
		.where(like(schema.receivingSlips.slip_number, `RCV-${year}-%`))
		.orderBy(desc(schema.receivingSlips.slip_number))
		.limit(1);
	const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
	return `RCV-${year}-${String(lastNum + 1).padStart(3, '0')}`;
}

function isSlipNumberConflict(err: unknown): boolean {
	const msg = String(err);
	return msg.includes('UNIQUE constraint failed') && msg.includes('slip_number');
}
