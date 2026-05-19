import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { hashPassword, createSession, getSession } from './index';

describe('Auth Hooks Integration', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
	let db: ReturnType<typeof drizzle<typeof schema>>;
	let testAccountId: string;
	let testSessionToken: string;

	beforeAll(async () => {
		proxy = await getPlatformProxy<{ DB: D1Database }>();
		db = drizzle(proxy.env.DB, { schema });

		// Setup: Create test account and session
		const hashedPassword = await hashPassword('test123');
		const [account] = await db
			.insert(schema.accounts)
			.values({
				email: 'hook-test@example.com',
				password_hash: hashedPassword,
				name: 'Hook Test',
				role: 'general'
			})
			.returning();
		testAccountId = account.id;
		testSessionToken = await createSession(proxy.env.DB, testAccountId);
	});

	afterAll(async () => {
		// Cleanup (session is deleted via cascade when account is deleted)
		await db.delete(schema.accounts).where(eq(schema.accounts.id, testAccountId));
		await proxy.dispose();
	});

	describe('getSession with locals population', () => {
		it('should return user data that can populate locals.user', async () => {
			const mockEvent = {
				platform: proxy as unknown as App.Platform,
				cookies: {
					get: () => testSessionToken
				}
			};

			const session = await getSession(mockEvent as any);

			expect(session).toBeDefined();
			expect(session?.id).toBe(testAccountId);
			expect(session?.email).toBe('hook-test@example.com');
			expect(session?.name).toBe('Hook Test');
			expect(session?.role).toBe('general');
			expect.assertions(5);
		});

		it('should return null for unauthenticated requests', async () => {
			const mockEvent = {
				platform: proxy as unknown as App.Platform,
				cookies: {
					get: () => undefined
				}
			};

			const session = await getSession(mockEvent as any);

			expect(session).toBeNull();
			expect.assertions(1);
		});
	});
});
