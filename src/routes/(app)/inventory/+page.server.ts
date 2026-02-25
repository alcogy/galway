import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseCSV } from '$lib/utils/csv';

export interface InventoryItem {
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
	updated_at: string;
}

const MOCK_INVENTORY: InventoryItem[] = [
	{ product_id: '1', product_code: 'PRD001', product_name: 'アルミフレーム A型', quantity: 48, unit: '本', updated_at: '2026-02-21 14:30' },
	{ product_id: '2', product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 1240, unit: '個', updated_at: '2026-02-22 09:15' },
	{ product_id: '3', product_code: 'PRD003', product_name: '鉄板 2.3mm厚', quantity: 320, unit: 'kg', updated_at: '2026-02-19 16:00' },
	{ product_id: '4', product_code: 'PRD004', product_name: '銅パイプ 15A', quantity: 75, unit: 'm', updated_at: '2026-02-20 11:45' },
	{ product_id: '5', product_code: 'PRD005', product_name: 'プラスチックケース 小', quantity: 200, unit: '個', updated_at: '2026-02-18 13:20' },
	{ product_id: '6', product_code: 'PRD006', product_name: '電子基板 A基板', quantity: 30, unit: '枚', updated_at: '2026-02-24 10:00' },
	{ product_id: '7', product_code: 'PRD007', product_name: 'ゴムパッキン 30mm', quantity: 560, unit: '個', updated_at: '2026-02-17 15:30' },
	{ product_id: '8', product_code: 'PRD008', product_name: '防錆スプレー 500ml', quantity: 42, unit: '缶', updated_at: '2026-02-16 09:00' },
	{ product_id: '9', product_code: 'PRD009', product_name: 'ベアリング 6205', quantity: 88, unit: '個', updated_at: '2026-02-15 14:00' },
	{ product_id: '10', product_code: 'PRD010', product_name: '絶縁テープ 19mm', quantity: 95, unit: 'ロール', updated_at: '2026-02-14 10:30' },
	{ product_id: '11', product_code: 'PRD011', product_name: 'アングル材 40×40', quantity: 130, unit: 'm', updated_at: '2026-02-13 16:45' },
	{ product_id: '12', product_code: 'PRD012', product_name: 'ナット M8', quantity: 2300, unit: '個', updated_at: '2026-02-12 11:00' },
];

const MOCK_PRODUCTS = [
	{ id: '1', code: 'PRD001', name: 'アルミフレーム A型', unit: '本' },
	{ id: '2', code: 'PRD002', name: 'ステンレスボルト M8×30', unit: '個' },
	{ id: '3', code: 'PRD003', name: '鉄板 2.3mm厚', unit: 'kg' },
	{ id: '4', code: 'PRD004', name: '銅パイプ 15A', unit: 'm' },
	{ id: '5', code: 'PRD005', name: 'プラスチックケース 小', unit: '個' },
	{ id: '6', code: 'PRD006', name: '電子基板 A基板', unit: '枚' },
	{ id: '7', code: 'PRD007', name: 'ゴムパッキン 30mm', unit: '個' },
	{ id: '8', code: 'PRD008', name: '防錆スプレー 500ml', unit: '缶' },
	{ id: '9', code: 'PRD009', name: 'ベアリング 6205', unit: '個' },
	{ id: '10', code: 'PRD010', name: '絶縁テープ 19mm', unit: 'ロール' },
	{ id: '11', code: 'PRD011', name: 'アングル材 40×40', unit: 'm' },
	{ id: '12', code: 'PRD012', name: 'ナット M8', unit: '個' },
];

export const load: PageServerLoad = async () => {
	return {
		inventory: MOCK_INVENTORY,
		products: MOCK_PRODUCTS
	};
};

export const actions = {
	stocktake: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	import: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const mode = formData.get('mode')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (mode !== 'append' && mode !== 'replace') return fail(400, { error: 'インポート方法が不正です' });

		const text = await file.text();
		const rows = parseCSV(text);

		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		// Expected columns: 商品コード, 数量
		// (Implementation deferred to Plan 4)
		try {
			return { success: true, count: 0 };
		} catch (error) {
			console.error('Failed to import inventory:', error);
			return fail(500, { error: '在庫データのインポートに失敗しました。' });
		}
	}
} satisfies Actions;
