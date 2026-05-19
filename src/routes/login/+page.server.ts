import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { verifyPassword, createSession, SESSION_COOKIE_OPTIONS } from '$lib/server/auth/index';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions = {
	default: async (event) => {
		const { request, cookies, platform } = event;
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'メールアドレスとパスワードを入力してください' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		const ip = event.getClientAddress();
		const now = new Date().toISOString();

		// Rate limit check
		const rateLimit = await db.query.loginRateLimits.findFirst({
			where: eq(schema.loginRateLimits.ip, ip)
		});
		if (rateLimit?.locked_until && rateLimit.locked_until > now) {
			const mins = Math.ceil(
				(new Date(rateLimit.locked_until).getTime() - Date.now()) / 60000
			);
			return fail(429, {
				error: `ログイン試行回数が上限を超えました。${mins}分後に再試行してください。`
			});
		}

		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});

		const isValid = account ? await verifyPassword(password, account.password_hash) : false;

		if (!account || !isValid) {
			const attempts = (rateLimit?.attempts ?? 0) + 1;
			const locked_until =
				attempts >= MAX_ATTEMPTS
					? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
					: null;
			await db
				.insert(schema.loginRateLimits)
				.values({ ip, attempts, locked_until, last_attempt_at: now })
				.onConflictDoUpdate({
					target: schema.loginRateLimits.ip,
					set: { attempts, locked_until, last_attempt_at: now }
				});
			return fail(401, { error: 'メールアドレスまたはパスワードが正しくありません' });
		}

		// Success: reset rate limit and create session token
		await db.delete(schema.loginRateLimits).where(eq(schema.loginRateLimits.ip, ip));
		const token = await createSession(platform!.env.DB, account.id);
		cookies.set('session', token, SESSION_COOKIE_OPTIONS);

		throw redirect(302, '/');
	}
} satisfies Actions;
