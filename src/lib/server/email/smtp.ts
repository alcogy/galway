import type { EmailPayload, EmailProvider } from './index';

/**
 * Generic HTTP relay provider for SMTP-over-HTTP services.
 * Compatible with MailChannels, Brevo, Mailgun, Postmark, etc.
 *
 * The relay endpoint must accept POST with JSON:
 *   { from, to: string[], subject, html, text? }
 * and return 2xx on success.
 *
 * Note: Cloudflare Workers cannot open raw TCP connections, so traditional
 * SMTP (port 25/587) is not supported. Use an HTTP relay service instead.
 */
export class SmtpRelayProvider implements EmailProvider {
	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
		private readonly from: string
	) {}

	async send(payload: EmailPayload): Promise<void> {
		const res = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: this.from,
				to: Array.isArray(payload.to) ? payload.to : [payload.to],
				subject: payload.subject,
				html: payload.html,
				...(payload.text ? { text: payload.text } : {})
			})
		});

		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`SMTP relay error ${res.status}: ${body}`);
		}
	}
}
