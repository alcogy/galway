import { makeCtx } from '$lib/services';
import { getProfile, updateProfile } from '$lib/services/account';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	getProfile(makeCtx(platform!, locals));

export const actions = {
	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateProfile(makeCtx(platform!, locals), {
			name: f.get('name')?.toString()?.trim() ?? '',
			currentPassword: f.get('currentPassword')?.toString(),
			newPassword: f.get('newPassword')?.toString(),
		});
	},
} satisfies Actions;
