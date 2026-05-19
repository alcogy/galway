import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_OPTIONS, deleteSession } from '$lib/server/auth/index';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const token = cookies.get('session');
	if (token && platform?.env.DB) {
		await deleteSession(platform.env.DB, token).catch(() => {});
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { maxAge, ...deleteOptions } = SESSION_COOKIE_OPTIONS;
	cookies.delete('session', deleteOptions);

	throw redirect(302, '/login');
};
