import { makeCtx } from '$lib/services';
import { listReceivingSlips, importReceivingSlips } from '$lib/services/receiving';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	listReceivingSlips(makeCtx(platform!, locals));

export const actions = {
	import: async ({ request, platform, locals }) => {
		const f = await request.formData();
		const file = f.get('file') as File | null;
		if (!file) return { success: false, error: 'ファイルが選択されていません' };
		return importReceivingSlips(
			makeCtx(platform!, locals),
			await file.text(),
			f.get('date')?.toString() ?? '',
			f.get('supplier_id')?.toString() ?? ''
		);
	},
} satisfies Actions;
