import { makeCtx } from '$lib/services';
import { listShippingSlips, importShippingSlips } from '$lib/services/shipping';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listShippingSlips(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		parseInt(url.searchParams.get('page') || '1')
	);

export const actions = {
	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('file') as File | null;
		if (!file) return { success: false, error: 'ファイルが選択されていません' };
		return importShippingSlips(
			makeCtx(platform!, locals),
			await file.text(),
			f.get('date')?.toString() ?? ''
		);
	},
} satisfies Actions;
