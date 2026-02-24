import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';

import * as schema from '../db/schema';
import { hashPassword, verifyPassword, getSession } from './index';
import type { RequestEvent } from '@sveltejs/kit';

describe('Auth Functions', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
	let db: ReturnType<typeof drizzle<typeof schema>>;
	let testAccountId: string;

	beforeAll(async () => {
		proxy = await getPlatformProxy<{ DB: D1Database }>();
		db = drizzle(proxy.env.DB, { schema });

		// Setup: Create test account with unique email to avoid conflicts
		const hashedPassword = await hashPassword('test123');
		const uniqueEmail = `test-auth-${Date.now()}@example.com`;
		const [account] = await db
			.insert(schema.accounts)
			.values({
				email: uniqueEmail,
				password_hash: hashedPassword,
				name: 'Test Admin',
				role: 'admin'
			})
			.returning();
		testAccountId = account.id;
	});

	afterAll(async () => {
		// Cleanup
		await db.delete(schema.accounts).where(eq(schema.accounts.id, testAccountId));
		await proxy.dispose();
	});

	describe('hashPassword', () => {
		it('should hash a password and return salt:hash format', async () => {
			const hash = await hashPassword('mypassword');
			expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
			expect.assertions(1);
		});

		it('should generate different salts for the same password', async () => {
			const hash1 = await hashPassword('same');
			const hash2 = await hashPassword('same');
			expect(hash1).not.toBe(hash2);
			expect.assertions(1);
		});
	});

	describe('verifyPassword', () => {
		it('should return true for correct password', async () => {
			const hash = await hashPassword('correct');
			const result = await verifyPassword('correct', hash);
			expect(result).toBe(true);
			expect.assertions(1);
		});

		it('should return false for incorrect password', async () => {
			const hash = await hashPassword('correct');
			const result = await verifyPassword('wrong', hash);
			expect(result).toBe(false);
			expect.assertions(1);
		});
	});

	describe('getSession', () => {
		it('should return account and role for valid session', async () => {
			// Re-create account for each test to ensure isolation
			const hashedPassword = await hashPassword('test123');
			const [account] = await db
				.insert(schema.accounts)
				.values({
					email: `test-get-session-${Date.now()}@example.com`,
					password_hash: hashedPassword,
					name: 'Test Admin',
					role: 'admin'
				})
				.returning();

			const mockEvent = {
				platform: { env: { DB: proxy.env.DB } },
				cookies: {
					get: () => account.id
				}
			} as unknown as RequestEvent;

			const session = await getSession(mockEvent);

			expect(session).toBeDefined();
			expect(session?.id).toBe(account.id);
			expect(session?.name).toBe('Test Admin');
			expect(session?.role).toBe('admin');

			// Cleanup
			await db.delete(schema.accounts).where(eq(schema.accounts.id, account.id));

			expect.assertions(4);
		});

		it('should return null for invalid session ID', async () => {
			const mockEvent = {
				platform: { env: { DB: proxy.env.DB } },
				cookies: {
					get: () => 'invalid-session-id'
				}
			} as unknown as RequestEvent;

			const session = await getSession(mockEvent);

			expect(session).toBeNull();
			expect.assertions(1);
		});

		it('should return null when no session cookie exists', async () => {
			const mockEvent = {
				platform: { env: { DB: proxy.env.DB } },
				cookies: {
					get: () => undefined
				}
			} as unknown as RequestEvent;

			const session = await getSession(mockEvent);

			expect(session).toBeNull();
			expect.assertions(1);
		});
	});
});
