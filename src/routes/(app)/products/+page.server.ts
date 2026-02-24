import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
export interface Product {
	id: string;
	code: string;
	name: string;
	unit: string;
	description: string | null;
}

const MOCK_PRODUCTS: Product[] = [
	{ id: '1', code: 'PRD001', name: 'アルミフレーム A型', unit: '本', description: '軽量アルミニウム製フレーム材' },
	{ id: '2', code: 'PRD002', name: 'ステンレスボルト M8×30', unit: '個', description: 'SUS304製 六角ボルト' },
	{ id: '3', code: 'PRD003', name: '鉄板 2.3mm厚', unit: 'kg', description: '一般構造用圧延鋼材 SS400' },
	{ id: '4', code: 'PRD004', name: '銅パイプ 15A', unit: 'm', description: '給水・給湯用銅管 JIS H3300' },
	{ id: '5', code: 'PRD005', name: 'プラスチックケース 小', unit: '個', description: 'ABS樹脂製 防水仕様' },
	{ id: '6', code: 'PRD006', name: '電子基板 A基板', unit: '枚', description: 'FR4 4層基板 100×80mm' },
	{ id: '7', code: 'PRD007', name: 'ゴムパッキン 30mm', unit: '個', description: 'NBRゴム 耐油性 JIS B 2401' },
	{ id: '8', code: 'PRD008', name: '防錆スプレー 500ml', unit: '缶', description: 'フッ素系防錆剤' },
	{ id: '9', code: 'PRD009', name: 'ベアリング 6205', unit: '個', description: '深溝玉軸受け NSK製' },
	{ id: '10', code: 'PRD010', name: '絶縁テープ 19mm', unit: 'ロール', description: 'PVC製 黒 10m巻き' },
	{ id: '11', code: 'PRD011', name: 'アングル材 40×40', unit: 'm', description: 'SS400 等辺山形鋼' },
	{ id: '12', code: 'PRD012', name: 'ナット M8', unit: '個', description: 'SUS304製 六角ナット' },
];

export const load: PageServerLoad = async () => {
	return { products: MOCK_PRODUCTS };
};

export const actions = {
	create: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	update: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	delete: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	
	import: async ({ request }) => {
		const data = await request.formData();
		const file = data.get('file') as File | null;
		const mode = data.get('mode')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (mode !== 'append' && mode !== 'replace') return fail(400, { error: '無効なインポートモードです' });

		const text = await file.text();
		const rows = parseCSV(text);

		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		const [header, ...dataRows] = rows;

		//const nameIdx = header.indexOf('商品名');
		//const unitPriceIdx = header.indexOf('単価');
		//const unitIdx = header.indexOf('単位');
		//const categoryIdIdx = header.indexOf('カテゴリID');

		//if (nameIdx === -1) {
		//	return fail(400, { error: 'CSVに「商品名」列が必要です' });
		//}

		//const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		//const records = dataRows.map((row) => {
		//	const rawPrice = unitPriceIdx >= 0 ? row[unitPriceIdx]?.trim() : '';
		//	const unit_price = rawPrice ? parseInt(rawPrice.replace(/[^0-9-]/g, ''), 10) || 0 : 0;
		//	const rawCategoryId = categoryIdIdx >= 0 ? row[categoryIdIdx]?.trim() : '';
		//	const category_id = rawCategoryId && UUID_RE.test(rawCategoryId) ? rawCategoryId : null;
		//	return {
		//		name: row[nameIdx]?.trim() ?? '',
		//		unit_price,
		//		unit: unitIdx >= 0 ? (row[unitIdx]?.trim() || '') : '',
		//		category_id
		//	};
		//});

		//const invalid = records.filter((r) => !r.name);
		//if (invalid.length > 0) {
		//	return fail(400, { error: `${invalid.length}行に「商品名」がありません` });
		//}

		//const db = getDb('');

		try {
			//if (mode === 'replace') {
			//	await db.delete(schema.products);
			//}
			//if (records.length > 0) {
			//	await db.insert(schema.products).values(records);
			//}
			return { success: true, count: 0 };
		} catch (error) {
			console.error('Failed to import suppliers:', error);
			return fail(500, { error: '仕入先のインポートに失敗しました。' });
		}
	}
} satisfies Actions;
