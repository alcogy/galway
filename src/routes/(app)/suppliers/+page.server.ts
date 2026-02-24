import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export interface Supplier {
	id: string;
	code: string;
	name: string;
	phone: string | null;
	address: string | null;
	email: string | null;
}

const MOCK_SUPPLIERS: Supplier[] = [
	{ id: '1', code: 'SUP001', name: '株式会社山田製作所', phone: '03-1234-5678', address: '東京都千代田区丸の内1-1-1', email: 'info@yamada-mfg.co.jp' },
	{ id: '2', code: 'SUP002', name: '田中商事株式会社', phone: '06-9876-5432', address: '大阪府大阪市中央区本町2-3-4', email: 'contact@tanaka-shoji.co.jp' },
	{ id: '3', code: 'SUP003', name: '鈴木部品工業', phone: '052-111-2222', address: '愛知県名古屋市中区栄3-5-6', email: 'suzuki@buhin.jp' },
	{ id: '4', code: 'SUP004', name: '佐藤金属株式会社', phone: '011-333-4444', address: '北海道札幌市中央区北1条西7-1', email: 'sato@kinzoku.co.jp' },
	{ id: '5', code: 'SUP005', name: '高橋電機工業株式会社', phone: '092-555-6666', address: '福岡県福岡市博多区博多駅前4-1-2', email: 'info@takahashi-elec.jp' },
	{ id: '6', code: 'SUP006', name: '伊藤素材株式会社', phone: '045-777-8888', address: '神奈川県横浜市西区みなとみらい2-2-1', email: 'ito@sozai.co.jp' },
	{ id: '7', code: 'SUP007', name: '渡辺化学品工業', phone: '022-999-0000', address: '宮城県仙台市青葉区一番町1-2-3', email: 'watanabe@kagaku.jp' },
	{ id: '8', code: 'SUP008', name: '中村精密機械株式会社', phone: '076-123-4567', address: '石川県金沢市香林坊1-1-1', email: 'nakamura@seimitu.co.jp' },
];

export const load: PageServerLoad = async () => {
	return { suppliers: MOCK_SUPPLIERS };
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
