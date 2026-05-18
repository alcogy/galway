import { error, redirect, fail } from '@sveltejs/kit';
import { eq, desc, count, like, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';

export async function listShippingSlips(ctx: ServiceCtx) {
	const [slips, products] = await Promise.all([
		ctx.db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
				customer_name: schema.customers.name,
				item_count: count(schema.shippingSlipDetails.id),
				user_name: schema.accounts.name,
			})
			.from(schema.shippingSlips)
			.leftJoin(schema.accounts, eq(schema.shippingSlips.account_id, schema.accounts.id))
			.leftJoin(schema.customers, eq(schema.shippingSlips.customer_id, schema.customers.id))
			.leftJoin(schema.shippingSlipDetails, eq(schema.shippingSlips.id, schema.shippingSlipDetails.slip_id))
			.groupBy(schema.shippingSlips.id)
			.orderBy(desc(schema.shippingSlips.shipped_at)),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	return { slips, products };
}

export async function getShippingSlip(ctx: ServiceCtx, id: string) {
	const [slipRows, details, products] = await Promise.all([
		ctx.db
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
			.leftJoin(schema.shippingSlipDetails, eq(schema.shippingSlips.id, schema.shippingSlipDetails.slip_id))
			.where(eq(schema.shippingSlips.id, id))
			.groupBy(schema.shippingSlips.id),
		ctx.db
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
			.where(eq(schema.shippingSlipDetails.slip_id, id))
			.orderBy(schema.shippingSlipDetails.line_no),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
	]);

	if (!slipRows[0]) error(404, '出荷伝票が見つかりません');
	return { slip: slipRows[0], details, products };
}

export async function getShippingSlipForEdit(ctx: ServiceCtx, id: string) {
	const base = await getShippingSlip(ctx, id);
	const [accounts, customers] = await Promise.all([
		ctx.db.select({ id: schema.accounts.id, name: schema.accounts.name }).from(schema.accounts).orderBy(asc(schema.accounts.name)),
		ctx.db.select({ id: schema.customers.id, name: schema.customers.name }).from(schema.customers).orderBy(asc(schema.customers.name)),
	]);
	return { ...base, accounts, customers, isAdmin: ctx.user.role === 'admin' };
}

export async function getShippingSlipForNew(ctx: ServiceCtx) {
	const [products, customers] = await Promise.all([
		ctx.db.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit }).from(schema.products).orderBy(asc(schema.products.code)),
		ctx.db.select({ id: schema.customers.id, name: schema.customers.name }).from(schema.customers).orderBy(asc(schema.customers.name)),
	]);
	return { products, customers };
}

export async function createShippingSlip(ctx: ServiceCtx, data: {
	shipped_at: string;
	customer_id: string | null;
	note: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.shipped_at) return fail(400, { error: '出荷日は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	try {
		await ctx.db.transaction(async (tx) => {
			const slip_number = await nextShippingSlipNumber(tx, data.shipped_at);
			const now = new Date().toISOString();
			const [slip] = await tx
				.insert(schema.shippingSlips)
				.values({ slip_number, shipped_at: data.shipped_at, customer_id: data.customer_id, account_id: ctx.user.id, note: data.note })
				.returning({ id: schema.shippingSlips.id });

			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.shippingSlipDetails).values({ slip_id: slip.id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
			for (const d of validDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} - ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
		});
	} catch (err) {
		if (isSlipNumberConflict(err)) return fail(409, { error: '伝票番号が競合しました。再度お試しください。' });
		throw err;
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'shipping_slip', detail: { shipped_at: data.shipped_at, customer_id: data.customer_id, item_count: validDetails.length } });
	redirect(303, '/shipping');
}

export async function updateShippingSlip(ctx: ServiceCtx, id: string, data: {
	shipped_at: string;
	customer_id: string | null;
	note: string;
	account_id?: string;
	details: { product_id: string; quantity: number }[];
}) {
	if (!data.shipped_at) return fail(400, { error: '出荷日は必須です' });

	const validDetails = data.details.filter((d) => d.product_id && d.quantity > 0);
	if (validDetails.length === 0) return fail(400, { error: '有効な明細が必要です' });

	const now = new Date().toISOString();
	const updateFields: Record<string, unknown> = { shipped_at: data.shipped_at, note: data.note, customer_id: data.customer_id };
	if (data.account_id) updateFields.account_id = data.account_id;

	try {
		await ctx.db.transaction(async (tx) => {
			const oldDetails = await tx
				.select({ product_id: schema.shippingSlipDetails.product_id, quantity: schema.shippingSlipDetails.quantity })
				.from(schema.shippingSlipDetails)
				.where(eq(schema.shippingSlipDetails.slip_id, id));

			await tx.update(schema.shippingSlips).set(updateFields).where(eq(schema.shippingSlips.id, id));
			await tx.delete(schema.shippingSlipDetails).where(eq(schema.shippingSlipDetails.slip_id, id));

			for (const d of oldDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
			for (let i = 0; i < validDetails.length; i++) {
				await tx.insert(schema.shippingSlipDetails).values({ slip_id: id, product_id: validDetails[i].product_id, line_no: i + 1, quantity: validDetails[i].quantity });
			}
			for (const d of validDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} - ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
		});
	} catch (err) {
		console.error('Failed to update shipping slip:', err);
		return fail(500, { error: '出荷伝票の更新に失敗しました。' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'shipping_slip', target_id: id, detail: { item_count: validDetails.length } });
	redirect(303, `/shipping/${id}`);
}

export async function deleteShippingSlip(ctx: ServiceCtx, id: string) {
	const now = new Date().toISOString();
	try {
		await ctx.db.transaction(async (tx) => {
			const oldDetails = await tx
				.select({ product_id: schema.shippingSlipDetails.product_id, quantity: schema.shippingSlipDetails.quantity })
				.from(schema.shippingSlipDetails)
				.where(eq(schema.shippingSlipDetails.slip_id, id));
			await tx.delete(schema.shippingSlips).where(eq(schema.shippingSlips.id, id));
			for (const d of oldDetails) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} + ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
		});
	} catch (err) {
		console.error('Failed to delete shipping slip:', err);
		return fail(500, { error: '出荷伝票の削除に失敗しました。' });
	}

	await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'shipping_slip', target_id: id });
	redirect(303, '/shipping');
}

export async function importShippingSlips(ctx: ServiceCtx, csvText: string, date: string) {
	if (!date) return fail(400, { error: '出荷日を選択してください' });

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
			const slip_number = await nextShippingSlipNumber(tx, date);
			const now = new Date().toISOString();
			const [slip] = await tx
				.insert(schema.shippingSlips)
				.values({ slip_number, shipped_at: date, account_id: ctx.user.id, note: '' })
				.returning({ id: schema.shippingSlips.id });

			for (let i = 0; i < detailRecords.length; i++) {
				await tx.insert(schema.shippingSlipDetails).values({ slip_id: slip.id, product_id: detailRecords[i].product_id, line_no: i + 1, quantity: detailRecords[i].quantity });
			}
			for (const d of detailRecords) {
				await tx.update(schema.inventory).set({ quantity: sql`${schema.inventory.quantity} - ${d.quantity}`, updated_at: now }).where(eq(schema.inventory.product_id, d.product_id));
			}
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'shipping_slip', detail: { count: detailRecords.length, date } });
		return { success: true, count: detailRecords.length };
	} catch (err) {
		if (isSlipNumberConflict(err)) return fail(409, { error: '伝票番号が競合しました。再度お試しください。' });
		console.error('Failed to import shipping slips:', err);
		return fail(500, { error: '出荷伝票のインポートに失敗しました。' });
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextShippingSlipNumber(tx: any, date: string) {
	const year = new Date(date).getFullYear();
	const [last] = await tx
		.select({ n: schema.shippingSlips.slip_number })
		.from(schema.shippingSlips)
		.where(like(schema.shippingSlips.slip_number, `SHP-${year}-%`))
		.orderBy(desc(schema.shippingSlips.slip_number))
		.limit(1);
	const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
	return `SHP-${year}-${String(lastNum + 1).padStart(3, '0')}`;
}

function isSlipNumberConflict(err: unknown): boolean {
	const msg = String(err);
	return msg.includes('UNIQUE constraint failed') && msg.includes('slip_number');
}
