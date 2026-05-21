import type { EmailPayload, EmailProvider } from './index';

// EmailMessage is available as a global constructor in the Workers runtime,
// but @cloudflare/workers-types declares it only as an interface.
declare const EmailMessage: {
	new (from: string, to: string, raw: ReadableStream | string): EmailMessage;
};

function toBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	const binary = Array.from(bytes, (b) => String.fromCodePoint(b)).join('');
	return btoa(binary);
}

function wrapBase64(b64: string): string {
	return b64.match(/.{1,76}/g)?.join('\r\n') ?? b64;
}

function encodeHeader(value: string): string {
	if (/^[\x20-\x7E]*$/.test(value)) return value;
	return `=?UTF-8?B?${toBase64(value)}?=`;
}

function buildMime(from: string, to: string, subject: string, html: string, text: string): string {
	const boundary = `galway-${crypto.randomUUID().replace(/-/g, '')}`;
	const date = new Date().toUTCString();

	return [
		'MIME-Version: 1.0',
		`From: ${from}`,
		`To: ${to}`,
		`Date: ${date}`,
		`Subject: ${encodeHeader(subject)}`,
		`Content-Type: multipart/alternative; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: base64',
		'',
		wrapBase64(toBase64(text)),
		'',
		`--${boundary}`,
		'Content-Type: text/html; charset=UTF-8',
		'Content-Transfer-Encoding: base64',
		'',
		wrapBase64(toBase64(html)),
		'',
		`--${boundary}--`
	].join('\r\n');
}

export class CloudflareEmailProvider implements EmailProvider {
	constructor(
		private readonly binding: SendEmail,
		private readonly from: string,
		private readonly to: string
	) {}

	async send(payload: EmailPayload): Promise<void> {
		const toAddr = Array.isArray(payload.to) ? payload.to[0] : payload.to;
		const raw = buildMime(
			this.from,
			toAddr,
			payload.subject,
			payload.html,
			payload.text ?? ''
		);
		const message = new EmailMessage(this.from, toAddr, raw);
		await this.binding.send(message);
	}
}
