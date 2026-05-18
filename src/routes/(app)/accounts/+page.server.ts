import { makeCtx } from '$lib/services';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '$lib/services/account';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, url }) =>
	listAccounts(
		makeCtx(platform!, locals),
		url.searchParams.get('search') || '',
		parseInt(url.searchParams.get('page') || '1')
	);

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createAccount(makeCtx(platform!, locals), {
			name: f.get('name')?.toString() ?? '',
			email: f.get('email')?.toString() ?? '',
			password: f.get('password')?.toString() ?? '',
			role: f.get('role')?.toString() as 'admin' | 'general',
		});
	},

	update: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateAccount(makeCtx(platform!, locals), {
			id: f.get('id')?.toString() ?? '',
			name: f.get('name')?.toString() ?? '',
			email: f.get('email')?.toString() ?? '',
			password: f.get('password')?.toString(),
			role: f.get('role')?.toString() as 'admin' | 'general',
		});
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteAccount(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},
} satisfies Actions;
