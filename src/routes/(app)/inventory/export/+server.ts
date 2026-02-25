import type { RequestHandler } from './$types';
import { generateCSV } from '$lib/utils/csv';

// Mock data — replaced with DB query in Plan 4
const MOCK_INVENTORY = [
	{ product_code: 'PRD001', product_name: 'アルミフレーム A型', quantity: 48, unit: '本', updated_at: '2026-02-21 14:30' },
	{ product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 1240, unit: '個', updated_at: '2026-02-22 09:15' },
	{ product_code: 'PRD003', product_name: '鉄板 2.3mm厚', quantity: 320, unit: 'kg', updated_at: '2026-02-19 16:00' },
	{ product_code: 'PRD004', product_name: '銅パイプ 15A', quantity: 75, unit: 'm', updated_at: '2026-02-20 11:45' },
	{ product_code: 'PRD005', product_name: 'プラスチックケース 小', quantity: 200, unit: '個', updated_at: '2026-02-18 13:20' },
	{ product_code: 'PRD006', product_name: '電子基板 A基板', quantity: 30, unit: '枚', updated_at: '2026-02-24 10:00' },
	{ product_code: 'PRD007', product_name: 'ゴムパッキン 30mm', quantity: 560, unit: '個', updated_at: '2026-02-17 15:30' },
	{ product_code: 'PRD008', product_name: '防錆スプレー 500ml', quantity: 42, unit: '缶', updated_at: '2026-02-16 09:00' },
	{ product_code: 'PRD009', product_name: 'ベアリング 6205', quantity: 88, unit: '個', updated_at: '2026-02-15 14:00' },
	{ product_code: 'PRD010', product_name: '絶縁テープ 19mm', quantity: 95, unit: 'ロール', updated_at: '2026-02-14 10:30' },
	{ product_code: 'PRD011', product_name: 'アングル材 40×40', quantity: 130, unit: 'm', updated_at: '2026-02-13 16:45' },
	{ product_code: 'PRD012', product_name: 'ナット M8', quantity: 2300, unit: '個', updated_at: '2026-02-12 11:00' },
];

export const GET: RequestHandler = async () => {
	const headers = ['商品コード', '商品名', '在庫数', '単位', '最終更新日'];
	const rows = MOCK_INVENTORY.map((item) => [
		item.product_code,
		item.product_name,
		String(item.quantity),
		item.unit,
		item.updated_at
	]);

	// UTF-8 BOM for correct display in Excel
	const csv = '\uFEFF' + generateCSV(headers, rows);

	const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
	const filename = `inventory-${timestamp}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
