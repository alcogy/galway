import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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

export const load: PageServerLoad = async () => {
	return { products: MOCK_PRODUCTS };
};

export const actions = {
	create: async () => {
		redirect(303, '/shipping');
	}
} satisfies Actions;
