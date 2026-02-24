import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_OPTIONS } from '$lib/server/auth/index';

export const GET: RequestHandler = async ({ cookies }) => {
	// Clear the session cookie with the same options as when it was set
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { maxAge, ...deleteOptions } = SESSION_COOKIE_OPTIONS;
	cookies.delete('session', deleteOptions);

	// Redirect to login
	throw redirect(302, '/login');
};
