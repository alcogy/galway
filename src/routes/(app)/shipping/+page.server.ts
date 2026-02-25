import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseCSV } from '$lib/utils/csv';

export interface ShippingSlip {
	id: string;
	slip_number: string;
	shipped_at: string;
	item_count: number;
}

export interface ShippingDetail {
	id: string;
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
}

const MOCK_SLIPS: ShippingSlip[] = [
	{ id: '1', slip_number: 'SHP-2026-001', shipped_at: '2026-02-03', item_count: 2 },
	{ id: '2', slip_number: 'SHP-2026-002', shipped_at: '2026-02-06', item_count: 4 },
	{ id: '3', slip_number: 'SHP-2026-003', shipped_at: '2026-02-10', item_count: 1 },
	{ id: '4', slip_number: 'SHP-2026-004', shipped_at: '2026-02-13', item_count: 3 },
	{ id: '5', slip_number: 'SHP-2026-005', shipped_at: '2026-02-17', item_count: 2 },
	{ id: '6', slip_number: 'SHP-2026-006', shipped_at: '2026-02-20', item_count: 5 },
	{ id: '7', slip_number: 'SHP-2026-007', shipped_at: '2026-02-24', item_count: 2 },
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
];

export const load: PageServerLoad = async () => {
	return {
		slips: MOCK_SLIPS,
		products: MOCK_PRODUCTS
	};
};

export const actions = {
	import: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const date = formData.get('date')?.toString();

		if (!file) return fail(400, { error: 'ファイルが選択されていません' });
		if (!date) return fail(400, { error: '出荷日を選択してください' });

		const text = await file.text();
		const rows = parseCSV(text);

		if (rows.length < 2) return fail(400, { error: 'CSVにデータがありません（ヘッダー行 + 1件以上のデータが必要です）' });

		// Expected columns: 商品コード, 商品名, 数量
		// (Implementation deferred to Plan 4)
		try {
			return { success: true, count: 0 };
		} catch (error) {
			console.error('Failed to import shipping slips:', error);
			return fail(500, { error: '出荷伝票のインポートに失敗しました。' });
		}
	}
} satisfies Actions;
