import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export interface ReceivingDetail {
	id: string;
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
}

const MOCK_SLIPS = [
	{ id: '1',  slip_number: 'RCV-2026-001', received_at: '2026-02-01', supplier_id: '1', supplier_name: '株式会社山田製作所',  item_count: 3 },
	{ id: '2',  slip_number: 'RCV-2026-002', received_at: '2026-02-03', supplier_id: '2', supplier_name: '田中商事株式会社',    item_count: 2 },
	{ id: '3',  slip_number: 'RCV-2026-003', received_at: '2026-02-05', supplier_id: '3', supplier_name: '鈴木部品工業',        item_count: 5 },
	{ id: '4',  slip_number: 'RCV-2026-004', received_at: '2026-02-07', supplier_id: '1', supplier_name: '株式会社山田製作所',  item_count: 1 },
	{ id: '5',  slip_number: 'RCV-2026-005', received_at: '2026-02-10', supplier_id: '4', supplier_name: '佐藤金属株式会社',    item_count: 4 },
	{ id: '6',  slip_number: 'RCV-2026-006', received_at: '2026-02-12', supplier_id: '2', supplier_name: '田中商事株式会社',    item_count: 2 },
	{ id: '7',  slip_number: 'RCV-2026-007', received_at: '2026-02-14', supplier_id: '5', supplier_name: '高橋電機工業株式会社', item_count: 3 },
	{ id: '8',  slip_number: 'RCV-2026-008', received_at: '2026-02-17', supplier_id: '3', supplier_name: '鈴木部品工業',        item_count: 2 },
	{ id: '9',  slip_number: 'RCV-2026-009', received_at: '2026-02-19', supplier_id: '6', supplier_name: '伊藤素材株式会社',    item_count: 6 },
	{ id: '10', slip_number: 'RCV-2026-010', received_at: '2026-02-21', supplier_id: '1', supplier_name: '株式会社山田製作所',  item_count: 2 },
	{ id: '11', slip_number: 'RCV-2026-011', received_at: '2026-02-22', supplier_id: '7', supplier_name: '渡辺化学品工業',      item_count: 3 },
	{ id: '12', slip_number: 'RCV-2026-012', received_at: '2026-02-24', supplier_id: '2', supplier_name: '田中商事株式会社',    item_count: 1 },
	{ id: '13', slip_number: 'RCV-2026-013', received_at: '2026-02-24', supplier_id: '8', supplier_name: '中村精密機械株式会社', item_count: 4 },
];

const MOCK_DETAILS: Record<string, ReceivingDetail[]> = {
	'1':  [
		{ id: '101', product_id: '1', product_code: 'PRD001', product_name: 'アルミフレーム A型',       quantity: 50,  unit: '本' },
		{ id: '102', product_id: '2', product_code: 'PRD002', product_name: 'ステンレスボルト M8×30',   quantity: 200, unit: '個' },
		{ id: '103', product_id: '3', product_code: 'PRD003', product_name: '鉄板 2.3mm厚',             quantity: 80,  unit: 'kg' },
	],
	'2':  [
		{ id: '201', product_id: '4', product_code: 'PRD004', product_name: '銅パイプ 15A',             quantity: 30,  unit: 'm'  },
		{ id: '202', product_id: '5', product_code: 'PRD005', product_name: 'プラスチックケース 小',    quantity: 100, unit: '個' },
	],
	'3':  [
		{ id: '301', product_id: '1', product_code: 'PRD001', product_name: 'アルミフレーム A型',       quantity: 20,  unit: '本' },
		{ id: '302', product_id: '6', product_code: 'PRD006', product_name: '電子基板 A基板',           quantity: 10,  unit: '枚' },
		{ id: '303', product_id: '7', product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',        quantity: 300, unit: '個' },
		{ id: '304', product_id: '8', product_code: 'PRD008', product_name: '防錆スプレー 500ml',       quantity: 24,  unit: '缶' },
		{ id: '305', product_id: '2', product_code: 'PRD002', product_name: 'ステンレスボルト M8×30',   quantity: 500, unit: '個' },
	],
	'4':  [
		{ id: '401', product_id: '9', product_code: 'PRD009', product_name: 'ベアリング 6205',          quantity: 50,  unit: '個' },
	],
	'5':  [
		{ id: '501', product_id: '3', product_code: 'PRD003', product_name: '鉄板 2.3mm厚',             quantity: 200, unit: 'kg' },
		{ id: '502', product_id: '10', product_code: 'PRD010', product_name: '絶縁テープ 19mm',         quantity: 50,  unit: 'ロール' },
		{ id: '503', product_id: '11', product_code: 'PRD011', product_name: 'アングル材 40×40',        quantity: 60,  unit: 'm'  },
		{ id: '504', product_id: '12', product_code: 'PRD012', product_name: 'ナット M8',               quantity: 1000, unit: '個' },
	],
	'6':  [
		{ id: '601', product_id: '5', product_code: 'PRD005', product_name: 'プラスチックケース 小',    quantity: 80,  unit: '個' },
		{ id: '602', product_id: '7', product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',        quantity: 150, unit: '個' },
	],
	'7':  [
		{ id: '701', product_id: '6', product_code: 'PRD006', product_name: '電子基板 A基板',           quantity: 15,  unit: '枚' },
		{ id: '702', product_id: '8', product_code: 'PRD008', product_name: '防錆スプレー 500ml',       quantity: 12,  unit: '缶' },
		{ id: '703', product_id: '9', product_code: 'PRD009', product_name: 'ベアリング 6205',          quantity: 30,  unit: '個' },
	],
};

const MOCK_SUPPLIERS = [
	{ id: '1', name: '株式会社山田製作所' },
	{ id: '2', name: '田中商事株式会社' },
	{ id: '3', name: '鈴木部品工業' },
	{ id: '4', name: '佐藤金属株式会社' },
	{ id: '5', name: '高橋電機工業株式会社' },
	{ id: '6', name: '伊藤素材株式会社' },
	{ id: '7', name: '渡辺化学品工業' },
	{ id: '8', name: '中村精密機械株式会社' },
];

const MOCK_PRODUCTS = [
	{ id: '1',  code: 'PRD001', name: 'アルミフレーム A型',     unit: '本'   },
	{ id: '2',  code: 'PRD002', name: 'ステンレスボルト M8×30', unit: '個'   },
	{ id: '3',  code: 'PRD003', name: '鉄板 2.3mm厚',           unit: 'kg'   },
	{ id: '4',  code: 'PRD004', name: '銅パイプ 15A',           unit: 'm'    },
	{ id: '5',  code: 'PRD005', name: 'プラスチックケース 小',   unit: '個'   },
	{ id: '6',  code: 'PRD006', name: '電子基板 A基板',         unit: '枚'   },
	{ id: '7',  code: 'PRD007', name: 'ゴムパッキン 30mm',      unit: '個'   },
	{ id: '8',  code: 'PRD008', name: '防錆スプレー 500ml',     unit: '缶'   },
	{ id: '9',  code: 'PRD009', name: 'ベアリング 6205',        unit: '個'   },
	{ id: '10', code: 'PRD010', name: '絶縁テープ 19mm',        unit: 'ロール'},
	{ id: '11', code: 'PRD011', name: 'アングル材 40×40',       unit: 'm'    },
	{ id: '12', code: 'PRD012', name: 'ナット M8',              unit: '個'   },
];

export const load: PageServerLoad = async ({ params }) => {
	const slip = MOCK_SLIPS.find((s) => s.id === params.id);
	if (!slip) error(404, '入荷伝票が見つかりません');

	const details = MOCK_DETAILS[params.id] ?? [];

	return { slip, details, suppliers: MOCK_SUPPLIERS, products: MOCK_PRODUCTS };
};

export const actions = {
	update: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	delete: async () => {
		redirect(303, '/receiving');
	}
} satisfies Actions;
