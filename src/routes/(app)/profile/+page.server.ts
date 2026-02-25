import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = drizzle(platform!.env.DB, { schema });

	const account = await db.query.accounts.findFirst({
		where: eq(schema.accounts.id, locals.user!.id)
	});

	if (!account) {
		return { account: null };
	}

	return {
		account: {
			id: account.id,
			name: account.name,
			email: account.email,
			role: account.role,
			created_at: account.created_at
		}
	};
};

export const actions = {
	update: async ({ request, platform, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const email = data.get('email')?.toString();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();

		if (!name || !email) {
			return fail(400, { error: '名前とメールアドレスは必須です' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		// Check email uniqueness (excluding own account)
		const existing = await db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});
		if (existing && existing.id !== locals.user!.id) {
			return fail(400, { error: 'Email already exists' });
		}

		const updateData: Record<string, string> = { name, email };

		// Handle password change
		if (newPassword && newPassword.trim() !== '') {
			if (!currentPassword || currentPassword.trim() === '') {
				return fail(400, { error: 'パスワードを変更するには現在のパスワードが必要です' });
			}

			const account = await db.query.accounts.findFirst({
				where: eq(schema.accounts.id, locals.user!.id)
			});
			if (!account) {
				return fail(404, { error: 'アカウントが見つかりません' });
			}

			const isValid = await verifyPassword(currentPassword, account.password_hash);
			if (!isValid) {
				return fail(400, { error: '現在のパスワードが正しくありません' });
			}

			updateData.password_hash = await hashPassword(newPassword);
		}

		await db
			.update(schema.accounts)
			.set(updateData)
			.where(eq(schema.accounts.id, locals.user!.id));

		return { success: true };
	}
} satisfies Actions;
