import { fail, error } from '@sveltejs/kit';
import { eq, desc, or, like, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import type { ServiceCtx } from '$lib/services';

export async function listAccounts(ctx: ServiceCtx, search: string, page: number) {
	if (ctx.user.role !== 'admin') throw error(403, 'アクセス権限がありません');

	const itemsPerPage = 30;
	const currentPage = Math.max(1, page);
	const whereClause = search
		? or(like(schema.accounts.name, `%${search}%`), like(schema.accounts.email, `%${search}%`))
		: undefined;

	const [countResult, accounts] = await Promise.all([
		ctx.db.select({ count: count() }).from(schema.accounts).where(whereClause),
		ctx.db.query.accounts.findMany({
			where: whereClause,
			orderBy: [desc(schema.accounts.created_at)],
			limit: itemsPerPage,
			offset: (currentPage - 1) * itemsPerPage,
		}),
	]);

	return {
		accounts: accounts.map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role, created_at: a.created_at })),
		currentUserId: ctx.user.id,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery: search,
	};
}

export async function createAccount(ctx: ServiceCtx, data: {
	name: string;
	email: string;
	password: string;
	role: 'admin' | 'general';
}) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'アクセス権限がありません' });
	if (!data.name || !data.email || !data.password) return fail(400, { error: '名前・メールアドレス・パスワードは必須です' });
	if (!['admin', 'general'].includes(data.role)) return fail(400, { error: '権限の値が不正です' });

	try {
		const existing = await ctx.db.query.accounts.findFirst({ where: eq(schema.accounts.email, data.email) });
		if (existing) return fail(400, { error: 'そのメールアドレスはすでに使用されています' });

		const password_hash = await hashPassword(data.password);
		await ctx.db.insert(schema.accounts).values({ name: data.name, email: data.email, password_hash, role: data.role });
		return { success: true };
	} catch (err) {
		console.error('Failed to create account:', err);
		return fail(500, { error: 'アカウントの作成に失敗しました' });
	}
}

export async function updateAccount(ctx: ServiceCtx, data: {
	id: string;
	name: string;
	email: string;
	password?: string;
	role: 'admin' | 'general';
}) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'アクセス権限がありません' });
	if (!data.id || !data.name || !data.email) return fail(400, { error: '名前とメールアドレスは必須です' });
	if (!['admin', 'general'].includes(data.role)) return fail(400, { error: '権限の値が不正です' });

	try {
		const existing = await ctx.db.query.accounts.findFirst({ where: eq(schema.accounts.email, data.email) });
		if (existing && existing.id !== data.id) return fail(400, { error: 'そのメールアドレスはすでに使用されています' });

		const updateData: Record<string, unknown> = { name: data.name, email: data.email, role: data.role };
		if (data.password?.trim()) updateData.password_hash = await hashPassword(data.password);

		await ctx.db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, data.id));
		return { success: true };
	} catch (err) {
		console.error('Failed to update account:', err);
		return fail(500, { error: 'アカウントの更新に失敗しました' });
	}
}

export async function deleteAccount(ctx: ServiceCtx, id: string) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'アクセス権限がありません' });
	if (!id) return fail(400, { error: 'IDが指定されていません' });
	if (id === ctx.user.id) return fail(400, { error: '自分自身のアカウントは削除できません' });

	try {
		await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, id));
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

export async function getProfile(ctx: ServiceCtx) {
	const account = await ctx.db.query.accounts.findFirst({ where: eq(schema.accounts.id, ctx.user.id) });
	if (!account) return { account: null };
	return { account: { id: account.id, name: account.name, email: account.email, role: account.role, created_at: account.created_at } };
}

export async function updateProfile(ctx: ServiceCtx, data: {
	name: string;
	currentPassword?: string;
	newPassword?: string;
}) {
	if (!data.name) return fail(400, { error: 'Name is required' });

	const updateData: Record<string, string> = { name: data.name };

	if (data.newPassword?.trim()) {
		if (!data.currentPassword?.trim()) return fail(400, { error: 'Current password is required to set a new password' });
		const account = await ctx.db.query.accounts.findFirst({ where: eq(schema.accounts.id, ctx.user.id) });
		if (!account) return fail(404, { error: 'Account not found' });
		const isValid = await verifyPassword(data.currentPassword, account.password_hash);
		if (!isValid) return fail(400, { error: 'Current password is incorrect' });
		updateData.password_hash = await hashPassword(data.newPassword);
	}

	try {
		await ctx.db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, ctx.user.id));
		return { success: true };
	} catch (err) {
		console.error('Failed to update profile:', err);
		return fail(500, { error: 'Failed to update profile.' });
	}
}
