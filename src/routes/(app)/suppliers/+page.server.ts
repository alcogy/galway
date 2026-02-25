import { fail } from '@sveltejs/kit';
import { eq, asc, like, count } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import type { Actions, PageServerLoad } from './$types';

export interface Supplier {
	id: string;
	name: string;
	tel: string | null;
	fax: string | null;
	zipcode: string | null;
	address: string | null;
	email: string | null;
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = getDb(platform!.env.DB);

	const itemsPerPage = 20;
	const searchQuery = url.searchParams.get('search') || '';
	const currentPage = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

	const whereClause = searchQuery ? like(schema.suppliers.name, `%${searchQuery}%`) : undefined;
	const offset = (currentPage - 1) * itemsPerPage;

	const [countResult, suppliers] = await Promise.all([
		db.select({ count: count() }).from(schema.suppliers).where(whereClause),
		db
			.select({
				id: schema.suppliers.id,
				name: schema.suppliers.name,
				tel: schema.suppliers.tel,
				fax: schema.suppliers.fax,
				zipcode: schema.suppliers.zipcode,
				address: schema.suppliers.address,
				email: schema.suppliers.email,
			})
			.from(schema.suppliers)
			.where(whereClause)
			.orderBy(asc(schema.suppliers.name))
			.limit(itemsPerPage)
			.offset(offset),
	]);

	return {
		suppliers,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery,
	};
};

export const actions = {
	create: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		if (!name) return fail(400, { error: '仕入先名は必須です' });

		try {
			await db.insert(schema.suppliers).values({
				name,
				tel: data.get('tel')?.toString().trim() || null,
				fax: data.get('fax')?.toString().trim() || null,
				zipcode: data.get('zipcode')?.toString().trim() || null,
				address: data.get('address')?.toString().trim() || null,
				email: data.get('email')?.toString().trim() || null,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to create supplier:', error);
			return fail(500, { error: '仕入先の登録に失敗しました。' });
		}
	},

	update: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		if (!id) return fail(400, { error: 'IDが必要です' });
		if (!name) return fail(400, { error: '仕入先名は必須です' });

		try {
			await db
				.update(schema.suppliers)
				.set({
					name,
					tel: data.get('tel')?.toString().trim() || null,
					fax: data.get('fax')?.toString().trim() || null,
					zipcode: data.get('zipcode')?.toString().trim() || null,
					address: data.get('address')?.toString().trim() || null,
					email: data.get('email')?.toString().trim() || null,
					updated_at: new Date().toISOString(),
				})
				.where(eq(schema.suppliers.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to update supplier:', error);
			return fail(500, { error: '仕入先の更新に失敗しました。' });
		}
	},

	delete: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'IDが必要です' });

		try {
			await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete supplier:', error);
			return fail(500, { error: '仕入先の削除に失敗しました。' });
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
		const nameIdx = header.findIndex((h) => h.trim() === '仕入先名');
		if (nameIdx === -1) return fail(400, { error: 'CSVに「仕入先名」列が必要です' });

		const telIdx = header.findIndex((h) => h.trim() === '電話番号');
		const faxIdx = header.findIndex((h) => h.trim() === 'FAX');
		const zipcodeIdx = header.findIndex((h) => h.trim() === '郵便番号');
		const addressIdx = header.findIndex((h) => h.trim() === '住所');
		const emailIdx = header.findIndex((h) => h.trim() === 'メールアドレス');

		const records = dataRows
			.filter((row) => row[nameIdx]?.trim())
			.map((row) => ({
				name: row[nameIdx].trim(),
				tel: telIdx >= 0 ? row[telIdx]?.trim() || null : null,
				fax: faxIdx >= 0 ? row[faxIdx]?.trim() || null : null,
				zipcode: zipcodeIdx >= 0 ? row[zipcodeIdx]?.trim() || null : null,
				address: addressIdx >= 0 ? row[addressIdx]?.trim() || null : null,
				email: emailIdx >= 0 ? row[emailIdx]?.trim() || null : null,
			}));

		if (records.length === 0) return fail(400, { error: '有効なデータがありません' });

		try {
			await db.transaction(async (tx) => {
				if (mode === 'replace') {
					await tx.delete(schema.suppliers);
				}
				await tx.insert(schema.suppliers).values(records);
			});
			return { success: true, count: records.length };
		} catch (error) {
			console.error('Failed to import suppliers:', error);
			return fail(500, { error: '仕入先のインポートに失敗しました。' });
		}
	},
} satisfies Actions;
