import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { generateCSV } from '$lib/utils/csv';

// Mock data — replaced with DB query in Plan 4
const MOCK_SLIPS = [
	{ id: '1',  slip_number: 'RCV-2026-001', received_at: '2026-02-01', supplier_name: '株式会社山田製作所' },
	{ id: '2',  slip_number: 'RCV-2026-002', received_at: '2026-02-03', supplier_name: '田中商事株式会社' },
	{ id: '3',  slip_number: 'RCV-2026-003', received_at: '2026-02-05', supplier_name: '鈴木部品工業' },
	{ id: '4',  slip_number: 'RCV-2026-004', received_at: '2026-02-07', supplier_name: '株式会社山田製作所' },
	{ id: '5',  slip_number: 'RCV-2026-005', received_at: '2026-02-10', supplier_name: '佐藤金属株式会社' },
	{ id: '6',  slip_number: 'RCV-2026-006', received_at: '2026-02-12', supplier_name: '田中商事株式会社' },
	{ id: '7',  slip_number: 'RCV-2026-007', received_at: '2026-02-14', supplier_name: '高橋電機工業株式会社' },
	{ id: '8',  slip_number: 'RCV-2026-008', received_at: '2026-02-17', supplier_name: '鈴木部品工業' },
	{ id: '9',  slip_number: 'RCV-2026-009', received_at: '2026-02-19', supplier_name: '伊藤素材株式会社' },
	{ id: '10', slip_number: 'RCV-2026-010', received_at: '2026-02-21', supplier_name: '株式会社山田製作所' },
	{ id: '11', slip_number: 'RCV-2026-011', received_at: '2026-02-22', supplier_name: '渡辺化学品工業' },
	{ id: '12', slip_number: 'RCV-2026-012', received_at: '2026-02-24', supplier_name: '田中商事株式会社' },
	{ id: '13', slip_number: 'RCV-2026-013', received_at: '2026-02-24', supplier_name: '中村精密機械株式会社' },
];

const MOCK_DETAILS: Record<string, { product_code: string; product_name: string; quantity: number; unit: string }[]> = {
	'1':  [
		{ product_code: 'PRD001', product_name: 'アルミフレーム A型',     quantity: 50,  unit: '本' },
		{ product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 200, unit: '個' },
		{ product_code: 'PRD003', product_name: '鉄板 2.3mm厚',           quantity: 80,  unit: 'kg' },
	],
	'2':  [
		{ product_code: 'PRD004', product_name: '銅パイプ 15A',           quantity: 30,  unit: 'm' },
		{ product_code: 'PRD005', product_name: 'プラスチックケース 小',   quantity: 100, unit: '個' },
	],
	'3':  [
		{ product_code: 'PRD001', product_name: 'アルミフレーム A型',     quantity: 20,  unit: '本' },
		{ product_code: 'PRD006', product_name: '電子基板 A基板',         quantity: 10,  unit: '枚' },
		{ product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',      quantity: 300, unit: '個' },
		{ product_code: 'PRD008', product_name: '防錆スプレー 500ml',     quantity: 24,  unit: '缶' },
		{ product_code: 'PRD002', product_name: 'ステンレスボルト M8×30', quantity: 500, unit: '個' },
	],
	'4':  [{ product_code: 'PRD009', product_name: 'ベアリング 6205', quantity: 50, unit: '個' }],
	'5':  [
		{ product_code: 'PRD003', product_name: '鉄板 2.3mm厚',      quantity: 200,  unit: 'kg' },
		{ product_code: 'PRD010', product_name: '絶縁テープ 19mm',   quantity: 50,   unit: 'ロール' },
		{ product_code: 'PRD011', product_name: 'アングル材 40×40',  quantity: 60,   unit: 'm' },
		{ product_code: 'PRD012', product_name: 'ナット M8',         quantity: 1000, unit: '個' },
	],
	'6':  [
		{ product_code: 'PRD005', product_name: 'プラスチックケース 小', quantity: 80,  unit: '個' },
		{ product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',    quantity: 150, unit: '個' },
	],
	'7':  [
		{ product_code: 'PRD006', product_name: '電子基板 A基板',    quantity: 15, unit: '枚' },
		{ product_code: 'PRD008', product_name: '防錆スプレー 500ml', quantity: 12, unit: '缶' },
		{ product_code: 'PRD009', product_name: 'ベアリング 6205',   quantity: 30, unit: '個' },
	],
};

export const GET: RequestHandler = async ({ params }) => {
	const slip = MOCK_SLIPS.find((s) => s.id === params.id);
	if (!slip) error(404, '入荷伝票が見つかりません');

	const details = MOCK_DETAILS[params.id] ?? [];

	const headers = ['商品コード', '商品名', '数量', '単位'];
	const rows = details.map((d) => [
		d.product_code,
		d.product_name,
		String(d.quantity),
		d.unit
	]);

	const csv = '\uFEFF' + generateCSV(headers, rows);

	const safeName = slip.supplier_name.replace(/[/\\:*?"<>|]/g, '');
	const filename = `${slip.slip_number}_${safeName}_${slip.received_at}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
		}
	});
};
