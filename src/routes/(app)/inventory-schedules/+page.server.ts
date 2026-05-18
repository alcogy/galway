import { makeCtx } from '$lib/services';
import { listInventorySchedules, createInventorySchedule, updateInventoryScheduleStatus, deleteInventorySchedule } from '$lib/services/inventory_schedule';
import type { Actions, PageServerLoad } from './$types';
import type { InventorySchedule } from '$lib/types/inventory';

export type { InventorySchedule };

export const load: PageServerLoad = async ({ platform, locals }) =>
	listInventorySchedules(makeCtx(platform!, locals));

export const actions = {
	create: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return createInventorySchedule(makeCtx(platform!, locals), {
			title: f.get('title')?.toString().trim() ?? '',
			scheduled_at: f.get('scheduled_at')?.toString() ?? '',
			note: f.get('note')?.toString().trim() || null,
		});
	},

	updateStatus: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return updateInventoryScheduleStatus(
			makeCtx(platform!, locals),
			f.get('id')?.toString() ?? '',
			f.get('status')?.toString() as InventorySchedule['status']
		);
	},

	delete: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return deleteInventorySchedule(makeCtx(platform!, locals), f.get('id')?.toString() ?? '');
	},
} satisfies Actions;
