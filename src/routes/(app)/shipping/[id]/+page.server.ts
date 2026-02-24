import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export interface ShippingDetail {
	id: string;
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
}

const MOCK_SLIPS = [
	{ id: '1', slip_number: 'SHP-2026-001', shipped_at: '2026-02-03', item_count: 2 },
	{ id: '2', slip_number: 'SHP-2026-002', shipped_at: '2026-02-06', item_count: 4 },
	{ id: '3', slip_number: 'SHP-2026-003', shipped_at: '2026-02-10', item_count: 1 },
	{ id: '4', slip_number: 'SHP-2026-004', shipped_at: '2026-02-13', item_count: 3 },
	{ id: '5', slip_number: 'SHP-2026-005', shipped_at: '2026-02-17', item_count: 2 },
	{ id: '6', slip_number: 'SHP-2026-006', shipped_at: '2026-02-20', item_count: 5 },
	{ id: '7', slip_number: 'SHP-2026-007', shipped_at: '2026-02-24', item_count: 2 },
];

const MOCK_DETAILS: Record<string, ShippingDetail[]> = {
	'1': [
		{ id: '101', product_id: '1', product_code: 'PRD001', product_name: 'アルミフレーム A型',      quantity: 10,  unit: '本' },
		{ id: '102', product_id: '3', product_code: 'PRD003', product_name: '鉄板 2.3mm厚',            quantity: 50,  unit: 'kg' },
	],
	'2': [
		{ id: '201', product_id: '2', product_code: 'PRD002', product_name: 'ステンレスボルト M8×30',  quantity: 100, unit: '個' },
		{ id: '202', product_id: '5', product_code: 'PRD005', product_name: 'プラスチックケース 小',   quantity: 30,  unit: '個' },
		{ id: '203', product_id: '7', product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',       quantity: 80,  unit: '個' },
		{ id: '204', product_id: '9', product_code: 'PRD009', product_name: 'ベアリング 6205',         quantity: 20,  unit: '個' },
	],
	'3': [
		{ id: '301', product_id: '6', product_code: 'PRD006', product_name: '電子基板 A基板',          quantity: 5,   unit: '枚' },
	],
	'4': [
		{ id: '401', product_id: '1', product_code: 'PRD001', product_name: 'アルミフレーム A型',      quantity: 25,  unit: '本' },
		{ id: '402', product_id: '4', product_code: 'PRD004', product_name: '銅パイプ 15A',            quantity: 15,  unit: 'm'  },
		{ id: '403', product_id: '8', product_code: 'PRD008', product_name: '防錆スプレー 500ml',      quantity: 6,   unit: '缶' },
	],
	'5': [
		{ id: '501', product_id: '2', product_code: 'PRD002', product_name: 'ステンレスボルト M8×30',  quantity: 200, unit: '個' },
		{ id: '502', product_id: '12', product_code: 'PRD012', product_name: 'ナット M8',              quantity: 200, unit: '個' },
	],
	'6': [
		{ id: '601', product_id: '3', product_code: 'PRD003', product_name: '鉄板 2.3mm厚',            quantity: 100, unit: 'kg' },
		{ id: '602', product_id: '7', product_code: 'PRD007', product_name: 'ゴムパッキン 30mm',       quantity: 50,  unit: '個' },
		{ id: '603', product_id: '9', product_code: 'PRD009', product_name: 'ベアリング 6205',         quantity: 10,  unit: '個' },
		{ id: '604', product_id: '10', product_code: 'PRD010', product_name: '絶縁テープ 19mm',        quantity: 20,  unit: 'ロール' },
		{ id: '605', product_id: '11', product_code: 'PRD011', product_name: 'アングル材 40×40',       quantity: 30,  unit: 'm'  },
	],
	'7': [
		{ id: '701', product_id: '5', product_code: 'PRD005', product_name: 'プラスチックケース 小',   quantity: 40,  unit: '個' },
		{ id: '702', product_id: '6', product_code: 'PRD006', product_name: '電子基板 A基板',          quantity: 8,   unit: '枚' },
	],
};

const MOCK_PRODUCTS = [
	{ id: '1',  code: 'PRD001', name: 'アルミフレーム A型',     unit: '本'    },
	{ id: '2',  code: 'PRD002', name: 'ステンレスボルト M8×30', unit: '個'    },
	{ id: '3',  code: 'PRD003', name: '鉄板 2.3mm厚',           unit: 'kg'    },
	{ id: '4',  code: 'PRD004', name: '銅パイプ 15A',           unit: 'm'     },
	{ id: '5',  code: 'PRD005', name: 'プラスチックケース 小',   unit: '個'    },
	{ id: '6',  code: 'PRD006', name: '電子基板 A基板',         unit: '枚'    },
	{ id: '7',  code: 'PRD007', name: 'ゴムパッキン 30mm',      unit: '個'    },
	{ id: '8',  code: 'PRD008', name: '防錆スプレー 500ml',     unit: '缶'    },
	{ id: '9',  code: 'PRD009', name: 'ベアリング 6205',        unit: '個'    },
	{ id: '10', code: 'PRD010', name: '絶縁テープ 19mm',        unit: 'ロール' },
	{ id: '11', code: 'PRD011', name: 'アングル材 40×40',       unit: 'm'     },
	{ id: '12', code: 'PRD012', name: 'ナット M8',              unit: '個'    },
];

export const load: PageServerLoad = async ({ params }) => {
	const slip = MOCK_SLIPS.find((s) => s.id === params.id);
	if (!slip) error(404, '出荷伝票が見つかりません');

	const details = MOCK_DETAILS[params.id] ?? [];

	return { slip, details, products: MOCK_PRODUCTS };
};

export const actions = {
	update: async () => {
		return fail(501, { error: 'Not implemented' });
	},
	delete: async () => {
		redirect(303, '/shipping');
	}
} satisfies Actions;
