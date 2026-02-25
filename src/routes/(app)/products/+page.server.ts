import { fail } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import type { Actions, PageServerLoad } from './$types';

export interface Product {
	id: string;
	code: string;
	name: string;
	unit: string;
	description: string | null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);
	const products: Product[] = await db
		.select({
			id: schema.products.id,
			code: schema.products.code,
			name: schema.products.name,
			unit: schema.products.unit,
			description: schema.products.description,
		})
		.from(schema.products)
		.orderBy(asc(schema.products.code));

	return { products };
};

export const actions = {
	create: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const code = data.get('code')?.toString().trim();
		const name = data.get('name')?.toString().trim();
		const unit = data.get('unit')?.toString().trim();

		if (!code) return fail(400, { error: '商品コードは必須です' });
		if (!name) return fail(400, { error: '商品名は必須です' });
		if (!unit) return fail(400, { error: '単位は必須です' });

		const now = new Date().toISOString();

		try {
			await db.transaction(async (tx) => {
				const [product] = await tx
					.insert(schema.products)
					.values({
						code,
						name,
						unit,
						description: data.get('description')?.toString().trim() || null,
					})
					.returning({ id: schema.products.id });

				await tx
					.insert(schema.inventory)
					.values({ product_id: product.id, quantity: 0, updated_at: now })
					.onConflictDoNothing();
			});

			return { success: true };
		} catch (error: any) {
			if (error?.message?.includes('UNIQUE')) {
				return fail(409, { error: 'この商品コードはすでに使用されています' });
			}
			console.error('Failed to create product:', error);
			return fail(500, { error: '商品の登録に失敗しました。' });
		}
	},

	update: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const code = data.get('code')?.toString().trim();
		const name = data.get('name')?.toString().trim();
		const unit = data.get('unit')?.toString().trim();

		if (!id) return fail(400, { error: 'IDが必要です' });
		if (!code) return fail(400, { error: '商品コードは必須です' });
		if (!name) return fail(400, { error: '商品名は必須です' });
		if (!unit) return fail(400, { error: '単位は必須です' });

		try {
			await db
				.update(schema.products)
				.set({
					code,
					name,
					unit,
					description: data.get('description')?.toString().trim() || null,
					updated_at: new Date().toISOString(),
				})
				.where(eq(schema.products.id, id));

			return { success: true };
		} catch (error: any) {
			if (error?.message?.includes('UNIQUE')) {
				return fail(409, { error: 'この商品コードはすでに使用されています' });
			}
			console.error('Failed to update product:', error);
			return fail(500, { error: '商品の更新に失敗しました。' });
		}
	},

	delete: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'IDが必要です' });

		try {
			await db.delete(schema.products).where(eq(schema.products.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete product:', error);
			return fail(500, { error: '商品の削除に失敗しました。' });
		}
	},

	import: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const file = data.get('file') as File | null;
		const mode = data.get('mode')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (mode !== 'append' && mode !== 'replace') return fail(400, { error: '無効なインポートモードです' });

		const text = await file.text();
		const rows = parseCSV(text);

		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		const [header, ...dataRows] = rows;
		const codeIdx = header.findIndex((h) => h.trim() === '商品コード');
		const nameIdx = header.findIndex((h) => h.trim() === '商品名');
		const unitIdx = header.findIndex((h) => h.trim() === '単位');
		const descIdx = header.findIndex((h) => h.trim() === '説明');

		if (codeIdx === -1) return fail(400, { error: 'CSVに「商品コード」列が必要です' });
		if (nameIdx === -1) return fail(400, { error: 'CSVに「商品名」列が必要です' });
		if (unitIdx === -1) return fail(400, { error: 'CSVに「単位」列が必要です' });

		const records = dataRows
			.filter((row) => row[codeIdx]?.trim() && row[nameIdx]?.trim())
			.map((row) => ({
				code: row[codeIdx].trim(),
				name: row[nameIdx].trim(),
				unit: row[unitIdx]?.trim() || '',
				description: descIdx >= 0 ? row[descIdx]?.trim() || null : null,
			}));

		if (records.length === 0) return fail(400, { error: '有効なデータがありません' });

		const now = new Date().toISOString();

		try {
			await db.transaction(async (tx) => {
				if (mode === 'replace') {
					await tx.delete(schema.products);
				}
				const inserted = await tx
					.insert(schema.products)
					.values(records)
					.returning({ id: schema.products.id });

				if (inserted.length > 0) {
					for (const p of inserted) {
						await tx
							.insert(schema.inventory)
							.values({ product_id: p.id, quantity: 0, updated_at: now })
							.onConflictDoNothing();
					}
				}
			});

			return { success: true, count: records.length };
		} catch (error: any) {
			if (error?.message?.includes('UNIQUE')) {
				return fail(409, { error: '重複する商品コードがあります' });
			}
			console.error('Failed to import products:', error);
			return fail(500, { error: '商品のインポートに失敗しました。' });
		}
	},
} satisfies Actions;
