import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import type { ServiceCtx } from '$lib/services';
import type { InventorySchedule } from '$lib/types/inventory';

export async function listInventorySchedules(ctx: ServiceCtx) {
	const schedules = await ctx.db
		.select()
		.from(schema.inventorySchedules)
		.orderBy(desc(schema.inventorySchedules.scheduled_at));
	return { schedules: schedules as InventorySchedule[] };
}

export async function createInventorySchedule(ctx: ServiceCtx, data: { title: string; scheduled_at: string; note: string | null }) {
	if (!data.title) return fail(400, { error: 'Title is required.' });
	if (!data.scheduled_at) return fail(400, { error: 'Scheduled date is required.' });

	try {
		await ctx.db.insert(schema.inventorySchedules).values(data);
		return { success: true };
	} catch (err) {
		console.error('Failed to create schedule:', err);
		return fail(500, { error: 'Failed to create stocktake schedule.' });
	}
}

export async function updateInventoryScheduleStatus(ctx: ServiceCtx, id: string, status: InventorySchedule['status']) {
	if (!id) return fail(400, { error: 'ID is required.' });

	const allowed: InventorySchedule['status'][] = ['in_progress', 'completed', 'cancelled'];
	if (!allowed.includes(status)) return fail(400, { error: 'Invalid status.' });

	try {
		await ctx.db.update(schema.inventorySchedules).set({ status }).where(eq(schema.inventorySchedules.id, id));
		return { success: true };
	} catch (err) {
		console.error('Failed to update schedule status:', err);
		return fail(500, { error: 'Failed to update status.' });
	}
}

export async function deleteInventorySchedule(ctx: ServiceCtx, id: string) {
	if (!id) return fail(400, { error: 'ID is required.' });

	try {
		await ctx.db.delete(schema.inventorySchedules).where(eq(schema.inventorySchedules.id, id));
		return { success: true };
	} catch (err) {
		console.error('Failed to delete schedule:', err);
		return fail(500, { error: 'Failed to delete stocktake schedule.' });
	}
}
