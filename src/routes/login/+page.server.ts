import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { verifyPassword, SESSION_COOKIE_OPTIONS } from '$lib/server/auth/index';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions = {
	default: async ({ request, cookies, platform }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'メールアドレスとパスワードを入力してください' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		const account = await db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});

		if (!account) {
			return fail(401, { error: 'メールアドレスまたはパスワードが正しくありません' });
		}

		const isValid = await verifyPassword(password, account.password_hash);

		if (!isValid) {
			return fail(401, { error: 'メールアドレスまたはパスワードが正しくありません' });
		}

		cookies.set('session', account.id, SESSION_COOKIE_OPTIONS);

		throw redirect(302, '/');
	}
} satisfies Actions;
