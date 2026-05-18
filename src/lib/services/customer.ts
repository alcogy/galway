import { fail } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from '$lib/services';
import type { Customer } from '$lib/types/shipping';

export async function listCustomers(ctx: ServiceCtx) {
	const rows = await ctx.db
		.select({
			id: schema.customers.id,
			name: schema.customers.name,
			tel: schema.customers.tel,
			zipcode: schema.customers.zipcode,
			address: schema.customers.address,
			email: schema.customers.email,
			note: schema.customers.note,
			slip_count: count(schema.shippingSlips.id),
		})
		.from(schema.customers)
		.leftJoin(schema.shippingSlips, eq(schema.shippingSlips.customer_id, schema.customers.id))
		.groupBy(schema.customers.id)
		.orderBy(asc(schema.customers.name));

	return { customers: rows as Customer[] };
}

export async function createCustomer(ctx: ServiceCtx, data: {
	name: string;
	tel: string | null;
	zipcode: string | null;
	address: string | null;
	email: string | null;
	note: string | null;
}) {
	if (!data.name) return fail(400, { error: '出荷先名は必須です' });

	const now = new Date().toISOString();
	try {
		await ctx.db.insert(schema.customers).values({ ...data, created_at: now, updated_at: now });
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'create', target_type: 'customer', target_label: data.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to create customer:', err);
		return fail(500, { error: '出荷先の登録に失敗しました。' });
	}
}

export async function updateCustomer(ctx: ServiceCtx, data: {
	id: string;
	name: string;
	tel: string | null;
	zipcode: string | null;
	address: string | null;
	email: string | null;
	note: string | null;
}) {
	if (!data.id) return fail(400, { error: 'IDが必要です' });
	if (!data.name) return fail(400, { error: '出荷先名は必須です' });

	try {
		await ctx.db
			.update(schema.customers)
			.set({ ...data, updated_at: new Date().toISOString() })
			.where(eq(schema.customers.id, data.id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'update', target_type: 'customer', target_id: data.id, target_label: data.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to update customer:', err);
		return fail(500, { error: '出荷先の更新に失敗しました。' });
	}
}

export async function deleteCustomer(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'IDが必要です' });

	try {
		const [target] = await ctx.db.select({ name: schema.customers.name }).from(schema.customers).where(eq(schema.customers.id, id));
		await ctx.db.delete(schema.customers).where(eq(schema.customers.id, id));
		await logAudit({ db: ctx.db, user_id: ctx.user.id, user_name: ctx.user.name, action: 'delete', target_type: 'customer', target_id: id, target_label: target?.name });
		return { success: true };
	} catch (err) {
		console.error('Failed to delete customer:', err);
		return fail(500, { error: '出荷先の削除に失敗しました。' });
	}
}
