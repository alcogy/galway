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
		const name = data.get('name')?.toString()?.trim();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		const updateData: Record<string, string> = { name };

		if (newPassword && newPassword.trim() !== '') {
			if (!currentPassword || currentPassword.trim() === '') {
				return fail(400, { error: 'Current password is required to set a new password' });
			}

			const account = await db.query.accounts.findFirst({
				where: eq(schema.accounts.id, locals.user!.id)
			});
			if (!account) {
				return fail(404, { error: 'Account not found' });
			}

			const isValid = await verifyPassword(currentPassword, account.password_hash);
			if (!isValid) {
				return fail(400, { error: 'Current password is incorrect' });
			}

			updateData.password_hash = await hashPassword(newPassword);
		}

		try {
			await db
				.update(schema.accounts)
				.set(updateData)
				.where(eq(schema.accounts.id, locals.user!.id));

			return { success: true };
		} catch (err) {
			console.error('Failed to update profile:', err);
			return fail(500, { error: 'Failed to update profile.' });
		}
	}
} satisfies Actions;
