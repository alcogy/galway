import { fail } from '@sveltejs/kit';
import { eq, desc, count, like, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import type { Actions, PageServerLoad } from './$types';

export interface ShippingSlip {
	id: string;
	slip_number: string;
	shipped_at: string;
	item_count: number;
	user_name: string | null;
}

export interface ShippingDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const [slips, products] = await Promise.all([
		db
			.select({
				id: schema.shippingSlips.id,
				slip_number: schema.shippingSlips.slip_number,
				shipped_at: schema.shippingSlips.shipped_at,
				item_count: count(schema.shippingSlipDetails.id),
				user_name: schema.accounts.name,
			})
			.from(schema.shippingSlips)
			.leftJoin(schema.accounts, eq(schema.shippingSlips.account_id, schema.accounts.id))
			.leftJoin(
				schema.shippingSlipDetails,
				eq(schema.shippingSlips.id, schema.shippingSlipDetails.slip_id)
			)
			.groupBy(schema.shippingSlips.id)
			.orderBy(desc(schema.shippingSlips.shipped_at)),

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

	return { slips, products };
};

export const actions = {
	import: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const account_id = locals.user!.id;
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const date = formData.get('date')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (!date) return fail(400, { error: '出荷日を選択してください' });

		const text = await file.text();
		const rows = parseCSV(text);
		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		const [header, ...dataRows] = rows;
		const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
		const qtyIdx = header.findIndex((h) => h.trim() === '数量');

		if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
		if (qtyIdx === -1) return fail(400, { error: 'CSVに「数量」列が必要です' });

		const allProducts = await db
			.select({ id: schema.products.id, code: schema.products.code })
			.from(schema.products);
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
			const year = new Date(date).getFullYear();
			const [last] = await db
				.select({ n: schema.shippingSlips.slip_number })
				.from(schema.shippingSlips)
				.where(like(schema.shippingSlips.slip_number, `SHP-${year}-%`))
				.orderBy(desc(schema.shippingSlips.slip_number))
				.limit(1);
			const lastNum = last ? parseInt(last.n.split('-')[2], 10) : 0;
			const slip_number = `SHP-${year}-${String(lastNum + 1).padStart(3, '0')}`;

			const now = new Date().toISOString();

			const [slip] = await db
				.insert(schema.shippingSlips)
				.values({ slip_number, shipped_at: date, account_id, note: '' })
				.returning({ id: schema.shippingSlips.id });

			await db.batch([
				...detailRecords.map((d, i) =>
					db.insert(schema.shippingSlipDetails).values({
						slip_id: slip.id,
						product_id: d.product_id,
						line_no: i + 1,
						quantity: d.quantity,
					})
				),
				...detailRecords.map((d) =>
					db
						.update(schema.inventory)
						.set({
							quantity: sql`${schema.inventory.quantity} - ${d.quantity}`,
							updated_at: now,
						})
						.where(eq(schema.inventory.product_id, d.product_id))
				),
			] as any);

			return { success: true, count: detailRecords.length };
		} catch (err) {
			console.error('Failed to import shipping slips:', err);
			return fail(500, { error: '出荷伝票のインポートに失敗しました。' });
		}
	},
} satisfies Actions;
