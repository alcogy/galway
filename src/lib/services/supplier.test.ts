import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from './supplier';
import type { ServiceCtx } from '$lib/services';

describe('Supplier Service', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
	let ctx: ServiceCtx;
	let testAccountId: string;
	let createdSupplierId: string;

	beforeAll(async () => {
		proxy = await getPlatformProxy<{ DB: D1Database }>();
		const db = getDb(proxy.env.DB);

		const pw = await hashPassword('test123');
		const [account] = await db
			.insert(schema.accounts)
			.values({ email: 'supplier-svc-test@example.com', password_hash: pw, name: 'Service Test', role: 'admin' })
			.returning();
		testAccountId = account.id;

		ctx = {
			db,
			env: proxy.env as Env,
			user: { id: account.id, name: account.name, email: account.email, role: account.role, created_at: account.created_at },
		};
	});

	afterAll(async () => {
		const db = getDb(proxy.env.DB);
		if (createdSupplierId) await db.delete(schema.suppliers).where(eq(schema.suppliers.id, createdSupplierId));
		await db.delete(schema.accounts).where(eq(schema.accounts.id, testAccountId));
		await proxy.dispose();
	});

	it('listSuppliers returns paginated results', async () => {
		const result = await listSuppliers(ctx, '', 1);
		expect(result).toHaveProperty('suppliers');
		expect(result).toHaveProperty('totalItems');
		expect(result).toHaveProperty('itemsPerPage', 20);
		expect(result).toHaveProperty('currentPage', 1);
		expect(Array.isArray(result.suppliers)).toBe(true);
	});

	it('listSuppliers filters by search query', async () => {
		const all = await listSuppliers(ctx, '', 1);
		const filtered = await listSuppliers(ctx, '__no_such_supplier__', 1);
		expect(filtered.totalItems).toBe(0);
		expect(filtered.suppliers).toHaveLength(0);
		expect(all.totalItems).toBeGreaterThanOrEqual(0);
	});

	it('createSupplier validates required name', async () => {
		const result = await createSupplier(ctx, { name: '', tel: null, fax: null, zipcode: null, address: null, email: null });
		expect(result).toMatchObject({ status: 400 });
	});

	it('createSupplier inserts a supplier', async () => {
		const result = await createSupplier(ctx, {
			name: 'Test Supplier (service test)',
			tel: '03-0000-0000',
			fax: null,
			zipcode: '100-0001',
			address: 'Tokyo',
			email: 'test@supplier.example.com',
		});
		expect(result).toMatchObject({ success: true });

		const db = getDb(proxy.env.DB);
		const [found] = await db.select().from(schema.suppliers).where(eq(schema.suppliers.name, 'Test Supplier (service test)'));
		expect(found).toBeDefined();
		createdSupplierId = found.id;
	});

	it('updateSupplier validates required id', async () => {
		const result = await updateSupplier(ctx, { id: '', name: 'X', tel: null, fax: null, zipcode: null, address: null, email: null });
		expect(result).toMatchObject({ status: 400 });
	});

	it('updateSupplier modifies the supplier', async () => {
		const result = await updateSupplier(ctx, {
			id: createdSupplierId,
			name: 'Test Supplier (updated)',
			tel: null,
			fax: null,
			zipcode: null,
			address: null,
			email: null,
		});
		expect(result).toMatchObject({ success: true });

		const db = getDb(proxy.env.DB);
		const [found] = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, createdSupplierId));
		expect(found.name).toBe('Test Supplier (updated)');
	});

	it('deleteSupplier validates required id', async () => {
		const result = await deleteSupplier(ctx, '');
		expect(result).toMatchObject({ status: 400 });
	});

	it('deleteSupplier removes the supplier', async () => {
		const result = await deleteSupplier(ctx, createdSupplierId);
		expect(result).toMatchObject({ success: true });

		const db = getDb(proxy.env.DB);
		const [found] = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, createdSupplierId));
		expect(found).toBeUndefined();
		createdSupplierId = '';
	});
});
