import type { EmailPayload, EmailProvider } from './index';

interface AwsCredentials {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
}

async function sha256Hex(data: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigningKey(
	secret: string,
	date: string,
	region: string,
	service: string
): Promise<ArrayBuffer> {
	const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secret}`).buffer as ArrayBuffer, date);
	const kRegion = await hmacSha256(kDate, region);
	const kService = await hmacSha256(kRegion, service);
	return hmacSha256(kService, 'aws4_request');
}

function toHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function signedFetch(url: string, body: string, creds: AwsCredentials): Promise<Response> {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
	const dateOnly = amzDate.slice(0, 8);

	const parsedUrl = new URL(url);
	const contentHash = await sha256Hex(body);
	const service = 'ses';

	const headers = [
		['content-type', 'application/json'],
		['host', parsedUrl.host],
		['x-amz-content-sha256', contentHash],
		['x-amz-date', amzDate]
	];

	const canonicalHeaders = headers.map(([k, v]) => `${k}:${v}`).join('\n') + '\n';
	const signedHeaders = headers.map(([k]) => k).join(';');

	const canonicalRequest = [
		'POST',
		parsedUrl.pathname,
		'',
		canonicalHeaders,
		signedHeaders,
		contentHash
	].join('\n');

	const credentialScope = `${dateOnly}/${creds.region}/${service}/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		await sha256Hex(canonicalRequest)
	].join('\n');

	const signingKey = await deriveSigningKey(creds.secretAccessKey, dateOnly, creds.region, service);
	const signature = toHex(await hmacSha256(signingKey, stringToSign));

	const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	return fetch(url, {
		method: 'POST',
		headers: {
			Authorization: authorization,
			'Content-Type': 'application/json',
			'X-Amz-Content-Sha256': contentHash,
			'X-Amz-Date': amzDate
		},
		body
	});
}

export class SesProvider implements EmailProvider {
	private readonly endpoint: string;

	constructor(
		private readonly creds: AwsCredentials,
		private readonly from: string
	) {
		this.endpoint = `https://email.${creds.region}.amazonaws.com/v2/email/outbound-emails`;
	}

	async send(payload: EmailPayload): Promise<void> {
		const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];

		const body = JSON.stringify({
			FromEmailAddress: this.from,
			Destination: { ToAddresses: toAddresses },
			Content: {
				Simple: {
					Subject: { Data: payload.subject, Charset: 'UTF-8' },
					Body: {
						Html: { Data: payload.html, Charset: 'UTF-8' },
						...(payload.text ? { Text: { Data: payload.text, Charset: 'UTF-8' } } : {})
					}
				}
			}
		});

		const res = await signedFetch(this.endpoint, body, this.creds);

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`SES API error ${res.status}: ${text}`);
		}
	}
}
