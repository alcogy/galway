/**
 * Product Service tests.
 * Note: db.transaction() is not usable via wrangler getPlatformProxy
 * (D1_ERROR: use state.storage.transaction() instead of BEGIN TRANSACTION).
 * Tests that require transactions (createProduct, importProducts) are tested
 * at the validation level only. updateProduct and deleteProduct are tested
 * with direct DB setup.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createProduct, updateProduct, deleteProduct } from './product';
import type { ServiceCtx } from '$lib/services';

describe('Product Service', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
	let ctx: ServiceCtx;
	let testAccountId: string;
	let testProductId: string;

	beforeAll(async () => {
		proxy = await getPlatformProxy<{ DB: D1Database }>();
		const db = getDb(proxy.env.DB);

		const pw = await hashPassword('test123');
		const [account] = await db
			.insert(schema.accounts)
			.values({ email: 'product-svc-test@example.com', password_hash: pw, name: 'Product Test', role: 'admin' })
			.returning();
		testAccountId = account.id;

		// Directly insert a product for update/delete tests (bypassing createProduct which uses a transaction)
		const [product] = await db
			.insert(schema.products)
			.values({ code: `TST-SVC-${Date.now()}`, name: 'Service Test Product', unit: 'kg', min_quantity: 5 })
			.returning();
		testProductId = product.id;

		ctx = {
			db,
			env: proxy.env as Env,
			user: { id: account.id, name: account.name, email: account.email, role: account.role, created_at: account.created_at },
		};
	});

	afterAll(async () => {
		const db = getDb(proxy.env.DB);
		if (testProductId) {
			await db.delete(schema.inventory).where(eq(schema.inventory.product_id, testProductId));
			await db.delete(schema.products).where(eq(schema.products.id, testProductId));
		}
		await db.delete(schema.accounts).where(eq(schema.accounts.id, testAccountId));
		await proxy.dispose();
	});

	it('createProduct validates required code', async () => {
		const result = await createProduct(ctx, { code: '', name: 'X', unit: 'kg', description: null, category_id: null, min_quantity: 0 });
		expect(result).toMatchObject({ status: 400 });
	});

	it('createProduct validates required name', async () => {
		const result = await createProduct(ctx, { code: 'VALID-CODE', name: '', unit: 'kg', description: null, category_id: null, min_quantity: 0 });
		expect(result).toMatchObject({ status: 400 });
	});

	it('createProduct validates required unit', async () => {
		const result = await createProduct(ctx, { code: 'VALID-CODE', name: 'Valid Name', unit: '', description: null, category_id: null, min_quantity: 0 });
		expect(result).toMatchObject({ status: 400 });
	});

	it('updateProduct validates required id', async () => {
		const result = await updateProduct(ctx, { id: '', code: 'X', name: 'X', unit: 'kg', description: null, category_id: null, min_quantity: 0 });
		expect(result).toMatchObject({ status: 400 });
	});

	it('updateProduct modifies the product', async () => {
		const [product] = await ctx.db.select().from(schema.products).where(eq(schema.products.id, testProductId));
		const result = await updateProduct(ctx, {
			id: testProductId,
			code: product.code,
			name: 'Service Test Product (updated)',
			unit: 'pcs',
			description: 'Updated description',
			category_id: null,
			min_quantity: 10,
		});
		expect(result).toMatchObject({ success: true });

		const [updated] = await ctx.db.select().from(schema.products).where(eq(schema.products.id, testProductId));
		expect(updated.name).toBe('Service Test Product (updated)');
		expect(updated.min_quantity).toBe(10);
	});

	it('deleteProduct validates required id', async () => {
		const result = await deleteProduct(ctx, '');
		expect(result).toMatchObject({ status: 400 });
	});

	it('deleteProduct removes the product', async () => {
		const result = await deleteProduct(ctx, testProductId);
		expect(result).toMatchObject({ success: true });

		const [found] = await ctx.db.select().from(schema.products).where(eq(schema.products.id, testProductId));
		expect(found).toBeUndefined();
		testProductId = '';
	});
});
