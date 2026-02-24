import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export interface ReceivingSlip {
	id: string;
	slip_number: string;
	received_at: string;
	supplier_id: string;
	supplier_name: string;
	item_count: number;
}

export interface ReceivingDetail {
	id: string;
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
}

const MOCK_SLIPS: ReceivingSlip[] = [
	{ id: '1', slip_number: 'RCV-2026-001', received_at: '2026-02-01', supplier_id: '1', supplier_name: '株式会社山田製作所', item_count: 3 },
	{ id: '2', slip_number: 'RCV-2026-002', received_at: '2026-02-03', supplier_id: '2', supplier_name: '田中商事株式会社', item_count: 2 },
	{ id: '3', slip_number: 'RCV-2026-003', received_at: '2026-02-05', supplier_id: '3', supplier_name: '鈴木部品工業', item_count: 5 },
	{ id: '4', slip_number: 'RCV-2026-004', received_at: '2026-02-07', supplier_id: '1', supplier_name: '株式会社山田製作所', item_count: 1 },
	{ id: '5', slip_number: 'RCV-2026-005', received_at: '2026-02-10', supplier_id: '4', supplier_name: '佐藤金属株式会社', item_count: 4 },
	{ id: '6', slip_number: 'RCV-2026-006', received_at: '2026-02-12', supplier_id: '2', supplier_name: '田中商事株式会社', item_count: 2 },
	{ id: '7', slip_number: 'RCV-2026-007', received_at: '2026-02-14', supplier_id: '5', supplier_name: '高橋電機工業株式会社', item_count: 3 },
	{ id: '8', slip_number: 'RCV-2026-008', received_at: '2026-02-17', supplier_id: '3', supplier_name: '鈴木部品工業', item_count: 2 },
	{ id: '9', slip_number: 'RCV-2026-009', received_at: '2026-02-19', supplier_id: '6', supplier_name: '伊藤素材株式会社', item_count: 6 },
	{ id: '10', slip_number: 'RCV-2026-010', received_at: '2026-02-21', supplier_id: '1', supplier_name: '株式会社山田製作所', item_count: 2 },
	{ id: '11', slip_number: 'RCV-2026-011', received_at: '2026-02-22', supplier_id: '7', supplier_name: '渡辺化学品工業', item_count: 3 },
	{ id: '12', slip_number: 'RCV-2026-012', received_at: '2026-02-24', supplier_id: '2', supplier_name: '田中商事株式会社', item_count: 1 },
	{ id: '13', slip_number: 'RCV-2026-013', received_at: '2026-02-24', supplier_id: '8', supplier_name: '中村精密機械株式会社', item_count: 4 },
];

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
		suppliers: MOCK_SUPPLIERS,
		products: MOCK_PRODUCTS
	};
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
	}
} satisfies Actions;
