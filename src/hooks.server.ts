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

	return resolve(event);
};
