import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { sendAdminAlertSilent } from '$lib/services/email';
import type { ServiceCtx } from '$lib/services';
import type { InventorySchedule } from '$lib/types/inventory';

async function getEmailLocale(ctx: ServiceCtx): Promise<'en' | 'ja'> {
	const rows = await ctx.db.select({ value: schema.settings.value }).from(schema.settings)
		.where(eq(schema.settings.key, 'email_locale')).limit(1);
	return rows[0]?.value === 'ja' ? 'ja' : 'en';
}

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

	let schedule: InventorySchedule | undefined;
	if (status === 'in_progress') {
		const rows = await ctx.db
			.select()
			.from(schema.inventorySchedules)
			.where(eq(schema.inventorySchedules.id, id))
			.limit(1);
		schedule = rows[0] as InventorySchedule | undefined;
	}

	try {
		await ctx.db.update(schema.inventorySchedules).set({ status }).where(eq(schema.inventorySchedules.id, id));
	} catch (err) {
		console.error('Failed to update schedule status:', err);
		return fail(500, { error: 'Failed to update status.' });
	}

	if (status === 'in_progress' && schedule) {
		getEmailLocale(ctx).then((locale) => {
			const subject = locale === 'ja'
				? `棚卸開始: ${schedule.title}`
				: `Stocktake Started: ${schedule.title}`;
			const summary = locale === 'ja'
				? `棚卸スケジュール「${schedule.title}」が開始されました（${schedule.scheduled_at}）。在庫カウントを開始してください。`
				: `Stocktake schedule "${schedule.title}" has started (${schedule.scheduled_at}). Please begin inventory counting.`;
			const details: Record<string, string> = locale === 'ja'
				? { '予定日': schedule.scheduled_at, 'タイトル': schedule.title }
				: { 'Scheduled Date': schedule.scheduled_at, 'Title': schedule.title };
			sendAdminAlertSilent(ctx, { subject, severity: 'info', summary, details });
		}).catch((err) => {
			console.error('[email] inventory schedule alert locale lookup failed:', err);
			sendAdminAlertSilent(ctx, {
				subject: `Stocktake Started: ${schedule.title}`,
				severity: 'info',
				summary: `Stocktake schedule "${schedule.title}" has started (${schedule.scheduled_at}).`,
				details: { 'Scheduled Date': schedule.scheduled_at },
			});
		});
	}

	return { success: true };
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
