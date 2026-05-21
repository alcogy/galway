import { ResendProvider } from './resend';
import { SesProvider } from './ses';
import { SmtpRelayProvider } from './smtp';

export interface EmailPayload {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
}

export interface EmailProvider {
	send(payload: EmailPayload): Promise<void>;
}

export type EmailProviderName = 'resend' | 'ses' | 'smtp';

export function createEmailProvider(env: Env): EmailProvider {
	const provider = (env.EMAIL_PROVIDER ?? 'resend') as EmailProviderName;
	const from = env.EMAIL_FROM ?? 'noreply@example.com';

	switch (provider) {
		case 'resend':
			if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
			return new ResendProvider(env.RESEND_API_KEY, from);

		case 'ses':
			if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
				throw new Error('AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are required for SES');
			}
			return new SesProvider(
				{ accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY, region: env.AWS_REGION },
				from
			);

		case 'smtp':
			if (!env.SMTP_API_URL || !env.SMTP_API_KEY) {
				throw new Error('SMTP_API_URL and SMTP_API_KEY are required for SMTP relay');
			}
			return new SmtpRelayProvider(env.SMTP_API_URL, env.SMTP_API_KEY, from);

		default:
			throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
	}
}
