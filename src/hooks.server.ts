import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getSession } from '$lib/server/auth';
import { getPlatformProxy } from 'wrangler';

const proxy = dev ? await getPlatformProxy<Env>() : null;

export const handle: Handle = async ({ event, resolve }) => {
	if (proxy) {
		event.platform = proxy as unknown as App.Platform;
	}

	const account = await getSession(event);
	if (account) {
		event.locals.user = {
			id: account.id,
			name: account.name,
			email: account.email,
			role: account.role,
			created_at: account.created_at
		};
	}

	const lang = event.cookies.get('galway-locale');
	event.locals.locale = lang === 'en' || lang === 'ja' ? lang : 'en';

	const response = await resolve(event);

	// CSP is set by kit.csp (svelte.config.js) with per-request nonces — do not override here.
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};
