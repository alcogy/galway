import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
	}
} satisfies Actions;
