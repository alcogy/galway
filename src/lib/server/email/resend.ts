import type { EmailPayload, EmailProvider } from './index';

export class ResendProvider implements EmailProvider {
	constructor(
		private readonly apiKey: string,
		private readonly from: string
	) {}

	async send(payload: EmailPayload): Promise<void> {
		const res = await fetch('https://api.resend.com/emails', {
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
			throw new Error(`Resend API error ${res.status}: ${body}`);
		}
	}
}
