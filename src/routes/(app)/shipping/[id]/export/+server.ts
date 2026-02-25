import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { generateCSV } from '$lib/utils/csv';

// Mock data — replaced with DB query in Plan 4
const MOCK_SLIPS = [
	{ id: '1', slip_number: 'SHP-2026-001', shipped_at: '2026-02-03' },
	{ id: '2', slip_number: 'SHP-2026-002', shipped_at: '2026-02-06' },
	{ id: '3', slip_number: 'SHP-2026-003', shipped_at: '2026-02-10' },
	{ id: '4', slip_number: 'SHP-2026-004', shipped_at: '2026-02-13' },
	{ id: '5', slip_number: 'SHP-2026-005', shipped_at: '2026-02-17' },
	{ id: '6', slip_number: 'SHP-2026-006', shipped_at: '2026-02-20' },
	{ id: '7', slip_number: 'SHP-2026-007', shipped_at: '2026-02-24' },
];

const MOCK_DETAILS: Record<string, { product_code: string; product_name: string; quantity: number; unit: string }[]> = {
	'1': [
		{ product_code: 'PRD001', product_name: 'アルミフレーム A型', quantity: 10, unit: '本' },
		{ product_code: 'PRD003', product_name: '鉄板 2.3mm厚',       quantity: 50, unit: 'kg' },
	],
	'2': [
		{ product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 100, unit: '個' },
		{ product_code: 'PRD005', product_name: 'プラスチックケース 小',  quantity: 30,  unit: '個' },
		{ product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',      quantity: 80,  unit: '個' },
		{ product_code: 'PRD009', product_name: 'ベアリング 6205',        quantity: 20,  unit: '個' },
	],
	'3': [{ product_code: 'PRD006', product_name: '電子基板 A基板', quantity: 5, unit: '枚' }],
	'4': [
		{ product_code: 'PRD001', product_name: 'アルミフレーム A型',  quantity: 25, unit: '本' },
		{ product_code: 'PRD004', product_name: '銅パイプ 15A',        quantity: 15, unit: 'm' },
		{ product_code: 'PRD008', product_name: '防錆スプレー 500ml',  quantity: 6,  unit: '缶' },
	],
	'5': [
		{ product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 200, unit: '個' },
		{ product_code: 'PRD012', product_name: 'ナット M8',              quantity: 200, unit: '個' },
	],
	'6': [
		{ product_code: 'PRD003', product_name: '鉄板 2.3mm厚',      quantity: 100, unit: 'kg' },
		{ product_code: 'PRD007', product_name: 'ゴムパッキン 30mm', quantity: 50,  unit: '個' },
		{ product_code: 'PRD009', product_name: 'ベアリング 6205',   quantity: 10,  unit: '個' },
		{ product_code: 'PRD010', product_name: '絶縁テープ 19mm',  quantity: 20,  unit: 'ロール' },
		{ product_code: 'PRD011', product_name: 'アングル材 40×40', quantity: 30,  unit: 'm' },
	],
	'7': [
		{ product_code: 'PRD005', product_name: 'プラスチックケース 小', quantity: 40, unit: '個' },
		{ product_code: 'PRD006', product_name: '電子基板 A基板',        quantity: 8,  unit: '枚' },
	],
};

export const GET: RequestHandler = async ({ params }) => {
	const slip = MOCK_SLIPS.find((s) => s.id === params.id);
	if (!slip) error(404, '出荷伝票が見つかりません');

	const details = MOCK_DETAILS[params.id] ?? [];

	const headers = ['商品コード', '商品名', '数量', '単位'];
	const rows = details.map((d) => [
		d.product_code,
		d.product_name,
		String(d.quantity),
		d.unit
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);

	const filename = `${slip.slip_number}_${slip.shipped_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
