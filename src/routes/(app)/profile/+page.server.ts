import { makeCtx } from '$lib/services';
import { getProfile, updateProfile } from '$lib/services/account';
import { SESSION_COOKIE_OPTIONS } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) =>
	getProfile(makeCtx(platform!, locals));

export const actions = {
	update: async ({ request, platform, locals, cookies }) => {
		const f = await request.formData();
		const result = await updateProfile(makeCtx(platform!, locals), {
			name: f.get('name')?.toString()?.trim() ?? '',
			currentPassword: f.get('currentPassword')?.toString(),
			newPassword: f.get('newPassword')?.toString(),
		});
		if (result && 'newToken' in result && result.newToken) {
			cookies.set('session', result.newToken, SESSION_COOKIE_OPTIONS);
		}
		return result;
	},
} satisfies Actions;
