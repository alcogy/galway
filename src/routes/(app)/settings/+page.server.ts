import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like, asc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (locals.user?.role !== 'admin') {
		throw error(403, 'アクセス権限がありません');
	}

	const db = drizzle(platform!.env.DB, { schema });

	const rows = await db
		.select()
		.from(schema.settings)
		.where(like(schema.settings.key, 'holiday:%'))
		.orderBy(asc(schema.settings.key));

	return {
		holidays: rows.map((r) => ({
			id: r.id,
			date: r.key.replace('holiday:', ''),
			name: r.value
		}))
	};
};

export const actions = {
	add: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'アクセス権限がありません' });
		}

		const data = await request.formData();
		const date = data.get('date')?.toString();
		const name = data.get('name')?.toString();

		if (!date || !name) {
			return fail(400, { error: '日付と名称は必須です' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		const key = `holiday:${date}`;

		await db
			.insert(schema.settings)
			.values({ key, value: name })
			.onConflictDoUpdate({ target: schema.settings.key, set: { value: name } });

		return { success: true };
	},

	delete: async ({ request, platform, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'アクセス権限がありません' });
		}

		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'IDが必要です' });
		}

		const db = drizzle(platform!.env.DB, { schema });
		await db.delete(schema.settings).where(eq(schema.settings.id, id));

		return { success: true };
	}
} satisfies Actions;
