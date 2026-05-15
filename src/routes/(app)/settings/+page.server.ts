import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const SETTING_KEYS = [
	'notification_email',
	'low_stock_alert_enabled',
	'alert_email_enabled',
	'slack_webhook_url',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDb(platform!.env.DB);

	const rows = await db.select().from(schema.settings);
	const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;

	return {
		settings: {
			notification_email: map['notification_email'] ?? '',
			low_stock_alert_enabled: map['low_stock_alert_enabled'] !== 'false',
			alert_email_enabled: map['alert_email_enabled'] === 'true',
			slack_webhook_url: map['slack_webhook_url'] ?? '',
		},
	};
};

export const actions = {
	save: async ({ request, platform, locals }) => {
		const db = getDb(platform!.env.DB);
		const data = await request.formData();

		const updates: { key: SettingKey; value: string }[] = [
			{ key: 'notification_email', value: data.get('notification_email')?.toString().trim() ?? '' },
			{ key: 'low_stock_alert_enabled', value: data.get('low_stock_alert_enabled') === 'on' ? 'true' : 'false' },
			{ key: 'alert_email_enabled', value: data.get('alert_email_enabled') === 'on' ? 'true' : 'false' },
			{ key: 'slack_webhook_url', value: data.get('slack_webhook_url')?.toString().trim() ?? '' },
		];

		const now = new Date().toISOString();

		try {
			for (const { key, value } of updates) {
				await db
					.insert(schema.settings)
					.values({ key, value, updated_at: now })
					.onConflictDoUpdate({ target: schema.settings.key, set: { value, updated_at: now } });
			}
			await logAudit({ db, user_id: locals.user!.id, user_name: locals.user!.name, action: 'settings_save', target_type: 'settings' });
			return { success: true };
		} catch (err) {
			console.error('Failed to save settings:', err);
			return fail(500, { error: '設定の保存に失敗しました。' });
		}
	},
} satisfies Actions;
