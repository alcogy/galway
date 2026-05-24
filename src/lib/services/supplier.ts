import { fail } from '@sveltejs/kit';
import { eq, asc, like, count, inArray } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { parseCSV } from '$lib/utils/csv';
import { logAudit } from '$lib/server/audit';
import { supplierSchema } from '$lib/validation';
import type { ServiceCtx } from '$lib/services';

export async function listSuppliers(ctx: ServiceCtx, search: string, page: number) {
	const itemsPerPage = 20;
	const currentPage = Math.max(1, page);
	const whereClause = search ? like(schema.suppliers.name, `%${search}%`) : undefined;
	const offset = (currentPage - 1) * itemsPerPage;

	const [countResult, suppliers, allProducts, supplierProductRows] = await Promise.all([
		ctx.db.select({ count: count() }).from(schema.suppliers).where(whereClause),
		ctx.db
			.select({
				id: schema.suppliers.id,
				name: schema.suppliers.name,
				tel: schema.suppliers.tel,
				fax: schema.suppliers.fax,
				zipcode: schema.suppliers.zipcode,
				address: schema.suppliers.address,
				email: schema.suppliers.email,
			})
			.from(schema.suppliers)
			.where(whereClause)
			.orderBy(asc(schema.suppliers.name))
			.limit(itemsPerPage)
			.offset(offset),
		ctx.db
			.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
			.from(schema.products)
			.orderBy(asc(schema.products.code)),
		ctx.db
			.select({ supplier_id: schema.supplierProducts.supplier_id, product_id: schema.supplierProducts.product_id })
			.from(schema.supplierProducts),
	]);

	const supplierProductMap: Record<string, string[]> = {};
	for (const row of supplierProductRows) {
		if (!supplierProductMap[row.supplier_id]) supplierProductMap[row.supplier_id] = [];
		supplierProductMap[row.supplier_id].push(row.product_id);
	}

	return {
		suppliers,
		allProducts,
		supplierProductMap,
		totalItems: countResult[0]?.count ?? 0,
		itemsPerPage,
		currentPage,
		searchQuery: search,
	};
}

export async function createSupplier(
	ctx: ServiceCtx,
	data: { name: string; tel: string | null; fax: string | null; zipcode: string | null; address: string | null; email: string | null }
) {
	const parsed = supplierSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, tel, fax, zipcode, address, email } = parsed.data;

	try {
		await ctx.db.insert(schema.suppliers).values({ name, tel, fax, zipcode, address, email });
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'supplier', target_label: name });
		return { success: true };
	} catch (err) {
		console.error('Failed to create supplier:', err);
		return fail(500, { error: 'Failed to create supplier' });
	}
}

export async function updateSupplier(
	ctx: ServiceCtx,
	data: { id: string; name: string; tel: string | null; fax: string | null; zipcode: string | null; address: string | null; email: string | null }
) {
	if (!data.id) return fail(400, { error: 'ID is required' });
	const parsed = supplierSchema.safeParse(data);
	if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });
	const { name, tel, fax, zipcode, address, email } = parsed.data;

	try {
		await ctx.db
			.update(schema.suppliers)
			.set({ name, tel, fax, zipcode, address, email, updated_at: new Date().toISOString() })
			.where(eq(schema.suppliers.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'supplier', target_id: data.id, target_label: name });
		return { success: true };
	} catch (err) {
		console.error('Failed to update supplier:', err);
		return fail(500, { error: 'Failed to update supplier' });
	}
}

export async function deleteSupplier(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'ID is required' });

	try {
		const [target] = await ctx.db.select({ name: schema.suppliers.name }).from(schema.suppliers).where(eq(schema.suppliers.id, id));
		await ctx.db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'supplier', target_id: id, target_label: target?.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete supplier:', err);
		return fail(500, { error: 'Failed to delete supplier' });
	}
}

export async function getSupplierProducts(ctx: ServiceCtx, supplierId: string) {
	const linked = await ctx.db
		.select({ product_id: schema.supplierProducts.product_id })
		.from(schema.supplierProducts)
		.where(eq(schema.supplierProducts.supplier_id, supplierId));
	const linkedIds = linked.map((r) => r.product_id);

	const allProducts = await ctx.db
		.select({ id: schema.products.id, code: schema.products.code, name: schema.products.name, unit: schema.products.unit })
		.from(schema.products)
		.orderBy(asc(schema.products.code));

	return { linkedIds, allProducts };
}

export async function setSupplierProducts(ctx: ServiceCtx, supplierId: string, productIds: string[]) {
	try {
		await ctx.db.transaction(async (tx) => {
			await tx.delete(schema.supplierProducts).where(eq(schema.supplierProducts.supplier_id, supplierId));
			if (productIds.length > 0) {
				await tx.insert(schema.supplierProducts).values(productIds.map((product_id) => ({ supplier_id: supplierId, product_id })));
			}
		});
		return { success: true };
	} catch (err) {
		console.error('Failed to update supplier products:', err);
		return fail(500, { error: 'Failed to update supplier products' });
	}
}

export async function getExportData(ctx: ServiceCtx, search: string) {
	const whereClause = search ? like(schema.suppliers.name, `%${search}%`) : undefined;
	return ctx.db.select().from(schema.suppliers).where(whereClause).orderBy(asc(schema.suppliers.name));
}

export async function importSuppliers(ctx: ServiceCtx, csvText: string, mode: string) {
	if (mode !== 'append' && mode !== 'replace') return fail(400, { error: 'Invalid import mode' });

	const rows = parseCSV(csvText);
	if (rows.length < 2) return fail(400, { error: 'CSV has no data (requires a header row plus at least one data row)' });

	const [header, ...dataRows] = rows;
	const nameIdx = header.findIndex((h) => h.trim() === 'Supplier Name');
	if (nameIdx === -1) return fail(400, { error: 'CSV must include a "Supplier Name" column' });

	const telIdx = header.findIndex((h) => h.trim() === 'Phone');
	const faxIdx = header.findIndex((h) => h.trim() === 'FAX');
	const zipcodeIdx = header.findIndex((h) => h.trim() === 'Zip Code');
	const addressIdx = header.findIndex((h) => h.trim() === 'Address');
	const emailIdx = header.findIndex((h) => h.trim() === 'Email');

	const records = dataRows
		.filter((row) => row[nameIdx]?.trim())
		.map((row) => ({
			name: row[nameIdx].trim(),
			tel: telIdx >= 0 ? row[telIdx]?.trim() || null : null,
			fax: faxIdx >= 0 ? row[faxIdx]?.trim() || null : null,
			zipcode: zipcodeIdx >= 0 ? row[zipcodeIdx]?.trim() || null : null,
			address: addressIdx >= 0 ? row[addressIdx]?.trim() || null : null,
			email: emailIdx >= 0 ? row[emailIdx]?.trim() || null : null,
		}));

	if (records.length === 0) return fail(400, { error: 'No valid data found' });

	try {
		await ctx.db.transaction(async (tx) => {
			if (mode === 'replace') await tx.delete(schema.suppliers);
			await tx.insert(schema.suppliers).values(records);
		});
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'import', target_type: 'supplier', detail: { count: records.length, mode } });
		return { success: true, count: records.length };
	} catch (err) {
		console.error('Failed to import suppliers:', err);
		return fail(500, { error: 'Failed to import suppliers' });
	}
}
