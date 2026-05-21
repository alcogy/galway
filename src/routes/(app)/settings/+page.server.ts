import { makeCtx } from '$lib/services';
import { loadSettings, saveSettings } from '$lib/services/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const settings = await loadSettings(makeCtx(platform!, locals));
	const emailProvider = platform?.env.EMAIL_PROVIDER || null;
	return { ...settings, emailProvider };
};

export const actions = {
	save: async ({ request, platform, locals }) => {
		const f = await request.formData();
		return saveSettings(makeCtx(platform!, locals), {
			notification_email: f.get('notification_email')?.toString().trim() ?? '',
			low_stock_alert_enabled: f.get('low_stock_alert_enabled') === 'on',
			alert_email_enabled: f.get('alert_email_enabled') === 'on',
			slack_webhook_url: f.get('slack_webhook_url')?.toString().trim() ?? '',
		});
	},
} satisfies Actions;
