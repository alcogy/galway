import { fail } from '@sveltejs/kit';
import { makeCtx } from '$lib/services';
import { loadSettings, saveSettings } from '$lib/services/settings';
import { sendAdminAlert } from '$lib/services/email';
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
			email_locale: f.get('email_locale')?.toString() ?? 'en',
		});
	},

	sendTestEmail: async ({ platform, locals }) => {
		const ctx = makeCtx(platform!, locals);
		try {
			await sendAdminAlert(ctx, {
				subject: 'Test Alert — Galway',
				severity: 'info',
				summary: 'This is a test email sent from the Galway settings page.',
				details: { 'Sent by': locals.user?.name ?? 'admin', 'Time': new Date().toUTCString() },
			});
			return { testEmailSent: true };
		} catch (err) {
			console.error('[settings] sendTestEmail failed:', err);
			return fail(500, { error: 'Failed to send test email' });
		}
	},
} satisfies Actions;
