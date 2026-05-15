import { fail } from '@sveltejs/kit';
import { eq, asc, count } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export interface Customer {
	id: string;
	name: string;
	tel: string | null;
	zipcode: string | null;
	address: string | null;
	email: string | null;
	note: string | null;
	slip_count: number;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const rows = await db
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
};

export const actions = {
	create: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();

		if (!name) return fail(400, { error: '出荷先名は必須です' });

		const now = new Date().toISOString();
		try {
			await db.insert(schema.customers).values({
				name,
				tel: data.get('tel')?.toString().trim() || null,
				zipcode: data.get('zipcode')?.toString().trim() || null,
				address: data.get('address')?.toString().trim() || null,
				email: data.get('email')?.toString().trim() || null,
				note: data.get('note')?.toString().trim() || null,
				created_at: now,
				updated_at: now,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to create customer:', error);
			return fail(500, { error: '出荷先の登録に失敗しました。' });
		}
	},

	update: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();

		if (!id) return fail(400, { error: 'IDが必要です' });
		if (!name) return fail(400, { error: '出荷先名は必須です' });

		try {
			await db
				.update(schema.customers)
				.set({
					name,
					tel: data.get('tel')?.toString().trim() || null,
					zipcode: data.get('zipcode')?.toString().trim() || null,
					address: data.get('address')?.toString().trim() || null,
					email: data.get('email')?.toString().trim() || null,
					note: data.get('note')?.toString().trim() || null,
					updated_at: new Date().toISOString(),
				})
				.where(eq(schema.customers.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to update customer:', error);
			return fail(500, { error: '出荷先の更新に失敗しました。' });
		}
	},

	delete: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'IDが必要です' });

		try {
			await db.delete(schema.customers).where(eq(schema.customers.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete customer:', error);
			return fail(500, { error: '出荷先の削除に失敗しました。' });
		}
	},
} satisfies Actions;
