import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export interface InventorySchedule {
	id: string;
	scheduled_at: string;
	title: string;
	note: string | null;
	status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const schedules = await db
		.select()
		.from(schema.inventorySchedules)
		.orderBy(desc(schema.inventorySchedules.scheduled_at));

	return { schedules: schedules as InventorySchedule[] };
};

export const actions = {
	create: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const scheduled_at = data.get('scheduled_at')?.toString();

		if (!title) return fail(400, { error: 'タイトルは必須です' });
		if (!scheduled_at) return fail(400, { error: '予定日は必須です' });

		try {
			await db.insert(schema.inventorySchedules).values({
				title,
				scheduled_at,
				note: data.get('note')?.toString().trim() || null,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to create schedule:', error);
			return fail(500, { error: '棚卸スケジュールの登録に失敗しました。' });
		}
	},

	updateStatus: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const status = data.get('status')?.toString() as InventorySchedule['status'] | undefined;

		if (!id) return fail(400, { error: 'IDが必要です' });
		if (!status) return fail(400, { error: 'ステータスが必要です' });

		try {
			await db
				.update(schema.inventorySchedules)
				.set({ status })
				.where(eq(schema.inventorySchedules.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to update schedule status:', error);
			return fail(500, { error: 'ステータスの更新に失敗しました。' });
		}
	},

	delete: async ({ request, platform }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'IDが必要です' });

		try {
			await db.delete(schema.inventorySchedules).where(eq(schema.inventorySchedules.id, id));
			return { success: true };
		} catch (error) {
			console.error('Failed to delete schedule:', error);
			return fail(500, { error: '棚卸スケジュールの削除に失敗しました。' });
		}
	},
} satisfies Actions;
