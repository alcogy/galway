import { fail, error } from '@sveltejs/kit';
import { eq, desc, or, like, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { accountCreateSchema, accountUpdateSchema, profileUpdateSchema } from '$lib/validation';
import { sendWelcomeEmail, sendPasswordChangedEmail } from '$lib/services/email';
import type { ServiceCtx } from '$lib/services';

export async function listAccounts(ctx: ServiceCtx, search: string, page: number) {
	if (ctx.user.role !== 'admin') throw error(403, 'Access denied');

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
			offset: (currentPage - 1) * itemsPerPage
		})
	]);

	return {
		accounts: accounts.map((a) => ({
			id: a.id,
			name: a.name,
			email: a.email,
			role: a.role,
			created_at: a.created_at
		})),
		currentUserId: ctx.user.id,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery: search
	};
}

export async function createAccount(
	ctx: ServiceCtx,
	data: { name: string; email: string; password: string; role: 'admin' | 'general' }
) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });

	const parsed = accountCreateSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, email, password, role } = parsed.data;

	try {
		const existing = await ctx.db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});
		if (existing) return fail(400, { error: 'That email address is already in use' });

		const password_hash = await hashPassword(password);
		const [inserted] = await ctx.db
			.insert(schema.accounts)
			.values({ name, email, password_hash, role })
			.returning({ id: schema.accounts.id });

		if (inserted && ctx.request) {
			const loginUrl = new URL('/login', ctx.request.url).toString();
			sendWelcomeEmail(ctx, inserted.id, loginUrl);
		}
		return { success: true };
	} catch (err) {
		console.error('Failed to create account:', err);
		return fail(500, { error: 'Failed to create account' });
	}
}

export async function updateAccount(
	ctx: ServiceCtx,
	data: { id: string; name: string; email: string; password?: string; role: 'admin' | 'general' }
) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });

	const parsed = accountUpdateSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { id, name, email, password, role } = parsed.data;

	try {
		const existing = await ctx.db.query.accounts.findFirst({
			where: eq(schema.accounts.email, email)
		});
		if (existing && existing.id !== id)
			return fail(400, { error: 'That email address is already in use' });

		const updateData: Record<string, unknown> = { name, email, role };
		if (password?.trim()) updateData.password_hash = await hashPassword(password);

		await ctx.db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));
		return { success: true };
	} catch (err) {
		console.error('Failed to update account:', err);
		return fail(500, { error: 'Failed to update account' });
	}
}

export async function deleteAccount(ctx: ServiceCtx, id: string) {
	if (ctx.user.role !== 'admin') return fail(403, { error: 'Access denied' });
	if (!id) return fail(400, { error: 'ID is required' });
	if (id === ctx.user.id) return fail(400, { error: 'Cannot delete your own account' });

	try {
		await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, id));
		return { success: true };
	} catch (err: Error | unknown) {
		console.error('Failed to delete account:', err);
		const message = err instanceof Error ? String(err.cause) : String(err);
		if (message.includes('FOREIGN KEY constraint failed')) {
			return fail(400, { error: 'Cannot delete account: it is referenced by other records' });
		}
		return fail(500, { error: 'Failed to delete account' });
	}
}

export async function getProfile(ctx: ServiceCtx) {
	const account = await ctx.db.query.accounts.findFirst({
		where: eq(schema.accounts.id, ctx.user.id)
	});
	if (!account) return { account: null };
	return {
		account: {
			id: account.id,
			name: account.name,
			email: account.email,
			role: account.role,
			created_at: account.created_at
		}
	};
}

export async function updateProfile(
	ctx: ServiceCtx,
	data: { name: string; currentPassword?: string; newPassword?: string }
) {
	const parsed = profileUpdateSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, currentPassword, newPassword } = parsed.data;

	const updateData: Record<string, string> = { name };

	if (newPassword) {
		if (!currentPassword)
			return fail(400, { error: 'Current password is required to set a new password' });
		const account = await ctx.db.query.accounts.findFirst({
			where: eq(schema.accounts.id, ctx.user.id)
		});
		if (!account) return fail(404, { error: 'Account not found' });
		const isValid = await verifyPassword(currentPassword, account.password_hash);
		if (!isValid) return fail(400, { error: 'Current password is incorrect' });
		updateData.password_hash = await hashPassword(newPassword);
	}

	try {
		await ctx.db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, ctx.user.id));
		if (newPassword) {
			sendPasswordChangedEmail(ctx, ctx.user.id);
		}
		return { success: true };
	} catch (err) {
		console.error('Failed to update profile:', err);
		return fail(500, { error: 'Failed to update profile.' });
	}
}
