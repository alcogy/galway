import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, or, like, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	// Check if user is admin
	if (locals.user?.role !== 'admin') {
		throw error(403, 'アクセス権限がありません');
	}

	const db = drizzle(platform!.env.DB, { schema });

	// Get pagination setting
	const itemsPerPage = 30;

	const searchQuery = url.searchParams.get('search') || '';
	const currentPage = parseInt(url.searchParams.get('page') || '1');

	const whereClause = searchQuery
		? or(
				like(schema.accounts.name, `%${searchQuery}%`),
				like(schema.accounts.email, `%${searchQuery}%`)
			)
		: undefined;

	// Get total count
	const countResult = await db.select({ count: count() }).from(schema.accounts).where(whereClause);
	const totalItems = countResult[0]?.count || 0;

	// Get paginated accounts
	const offset = (currentPage - 1) * itemsPerPage;
	const accounts = await db.query.accounts.findMany({
		where: whereClause,
		orderBy: [desc(schema.accounts.created_at)],
		limit: itemsPerPage,
		offset
	});

	// Don't send password hashes to the client
	const accountsWithoutPasswords = accounts.map((account) => ({
		id: account.id,
		name: account.name,
		email: account.email,
		role: account.role,
		created_at: account.created_at
	}));

	return {
		accounts: accountsWithoutPasswords,
		currentUserId: locals.user!.id,
		totalItems,
		itemsPerPage,
		currentPage
	};
};

export const actions = {
	create: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'アクセス権限がありません' });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();
		const role = data.get('role')?.toString() as 'admin' | 'general' | undefined;

		if (!name || !email || !password) {
			return fail(400, { error: '名前・メールアドレス・パスワードは必須です' });
		}

		if (!role || !['admin', 'general'].includes(role)) {
			return fail(400, { error: '権限の値が不正です' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		try {
			// Check if email already exists
			const existing = await db.query.accounts.findFirst({
				where: eq(schema.accounts.email, email)
			});

			if (existing) {
				return fail(400, { error: 'そのメールアドレスはすでに使用されています' });
			}

			const password_hash = await hashPassword(password);

			await db.insert(schema.accounts).values({
				name,
				email,
				password_hash,
				role
			});

			return { success: true };
		} catch (error) {
			console.error('Failed to create account:', error);
			return fail(500, { error: 'アカウントの作成に失敗しました' });
		}
	},

	update: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'アクセス権限がありません' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString();
		const email = data.get('email')?.toString();
		const password = data.get('password')?.toString();
		const role = data.get('role')?.toString() as 'admin' | 'general' | undefined;

		if (!id || !name || !email) {
			return fail(400, { error: '名前とメールアドレスは必須です' });
		}

		if (!role || !['admin', 'general'].includes(role)) {
			return fail(400, { error: '権限の値が不正です' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		try {
			// Check if email is already used by another account
			const existing = await db.query.accounts.findFirst({
				where: eq(schema.accounts.email, email)
			});

			if (existing && existing.id !== id) {
				return fail(400, { error: 'そのメールアドレスはすでに使用されています' });
			}

			const updateData: any = {
				name,
				email,
				role
			};

			// Only update password if provided
			if (password && password.trim() !== '') {
				updateData.password_hash = await hashPassword(password);
			}

			await db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));

			return { success: true };
		} catch (error) {
			console.error('Failed to update account:', error);
			return fail(500, { error: 'アカウントの更新に失敗しました' });
		}
	},

	delete: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'アクセス権限がありません' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'IDが指定されていません' });
		}

		// Prevent deleting own account
		if (id === locals.user?.id) {
			return fail(400, { error: '自分自身のアカウントは削除できません' });
		}

		const db = drizzle(platform!.env.DB, { schema });

		try {
			await db.delete(schema.accounts).where(eq(schema.accounts.id, id));

			return { success: true };
		} catch (err: Error | unknown) {
			console.error('Failed to delete account:', err);
			const message = err instanceof Error ? String(err.cause) : String(err);
			if (message.includes('FOREIGN KEY constraint failed')) {
				return fail(400, { error: 'このアカウントは使用されているため削除できません' });
			}
			return fail(500, { error: 'アカウントの削除に失敗しました' });
		}
	}
} satisfies Actions;
