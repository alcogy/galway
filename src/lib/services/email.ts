import { eq, inArray } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { createEmailProvider } from '$lib/server/email/index';
import { CloudflareEmailProvider } from '$lib/server/email/cloudflare';
import {
	welcomeEmail,
	passwordChangedEmail,
	adminAlertEmail,
	type AdminAlertEmailData,
	type EmailLocale
} from '$lib/server/email/templates';
import { logAudit } from '$lib/server/audit';
import type { ServiceCtx } from './index';

const RateLimit = {
	windowMs: 60_000,
	maxPerWindow: 10
} as const;

// In-process rate limit store (resets on Worker restart).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
	const now = Date.now();
	const entry = rateLimitStore.get(key);
	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(key, { count: 1, resetAt: now + RateLimit.windowMs });
		return true;
	}
	if (entry.count >= RateLimit.maxPerWindow) return false;
	entry.count++;
	return true;
}

async function resolveAccount(ctx: ServiceCtx, accountId: string): Promise<{ name: string; email: string }> {
	const [account] = await ctx.db
		.select({ name: schema.accounts.name, email: schema.accounts.email })
		.from(schema.accounts)
		.where(eq(schema.accounts.id, accountId))
		.limit(1);
	if (!account) throw new Error(`Account not found: ${accountId}`);
	return account;
}

async function getEmailLocale(ctx: ServiceCtx): Promise<EmailLocale> {
	const rows = await ctx.db
		.select({ value: schema.settings.value })
		.from(schema.settings)
		.where(eq(schema.settings.key, 'email_locale'))
		.limit(1);
	return rows[0]?.value === 'ja' ? 'ja' : 'en';
}

/**
 * Send a welcome email to a newly created account.
 * Uses the HTTP provider (Resend/SES/SMTP) — works in local dev via .dev.vars.
 * Never throws; errors are logged to console.
 */
export async function sendWelcomeEmail(
	ctx: ServiceCtx,
	accountId: string,
	loginUrl: string
): Promise<void> {
	try {
		if (!ctx.env.EMAIL_FROM) return;
		if (!checkRateLimit(`welcome:${accountId}`)) return;

		const [account, locale] = await Promise.all([
			resolveAccount(ctx, accountId),
			getEmailLocale(ctx),
		]);
		const provider = createEmailProvider(ctx.env);
		const { subject, html, text } = welcomeEmail({ name: account.name, email: account.email, loginUrl }, locale);
		await provider.send({ to: account.email, subject, html, text });
	} catch (err) {
		console.error('[email] sendWelcomeEmail failed:', err);
	}
}

/**
 * Notify an account that their password was changed.
 * Uses the HTTP provider — works in local dev via .dev.vars.
 * Never throws.
 */
export async function sendPasswordChangedEmail(
	ctx: ServiceCtx,
	accountId: string
): Promise<void> {
	try {
		if (!ctx.env.EMAIL_FROM) return;
		if (!checkRateLimit(`pwd:${accountId}`)) return;

		const [account, locale] = await Promise.all([
			resolveAccount(ctx, accountId),
			getEmailLocale(ctx),
		]);
		const provider = createEmailProvider(ctx.env);
		const changedAt = new Date().toUTCString();
		const { subject, html, text } = passwordChangedEmail({ name: account.name, changedAt }, locale);
		await provider.send({ to: account.email, subject, html, text });
	} catch (err) {
		console.error('[email] sendPasswordChangedEmail failed:', err);
	}
}

/**
 * Resolve the alert provider.
 * Prefers the Cloudflare send_email binding (production); falls back to the configured HTTP provider.
 */
function createAlertProvider(env: Env, alertTo: string): ReturnType<typeof createEmailProvider> {
	if (env.SEND_EMAIL) {
		if (!env.EMAIL_FROM) throw new Error('EMAIL_FROM is not configured');
		return new CloudflareEmailProvider(env.SEND_EMAIL, env.EMAIL_FROM, alertTo);
	}
	return createEmailProvider(env);
}

/**
 * Send an alert email to the configured admin address.
 * Reads alert_email_to from the settings table; falls back to ALERT_EMAIL_TO env var.
 * Uses Cloudflare send_email binding when available, otherwise the HTTP provider.
 */
export async function sendAdminAlert(ctx: ServiceCtx, data: AdminAlertEmailData): Promise<void> {
	const [alertEnabledRow, alertToRow, localeRow] = await Promise.all([
		ctx.db.select({ value: schema.settings.value }).from(schema.settings)
			.where(eq(schema.settings.key, 'alert_email_enabled')).limit(1),
		ctx.db.select({ value: schema.settings.value }).from(schema.settings)
			.where(eq(schema.settings.key, 'notification_email')).limit(1),
		ctx.db.select({ value: schema.settings.value }).from(schema.settings)
			.where(eq(schema.settings.key, 'email_locale')).limit(1),
	]);

	const alertEnabled = alertEnabledRow[0]?.value !== 'false';
	if (!alertEnabled) return;

	const alertTo = alertToRow[0]?.value || ctx.env.ALERT_EMAIL_TO;
	if (!alertTo) return;
	if (!checkRateLimit(`alert:${data.subject}`)) return;

	const locale: EmailLocale = localeRow[0]?.value === 'ja' ? 'ja' : 'en';
	const provider = createAlertProvider(ctx.env, alertTo);
	const { subject, html, text } = adminAlertEmail(data, locale);
	await provider.send({ to: alertTo, subject, html, text });
}

/**
 * Fire-and-forget admin alert — never throws, safe to call from any handler.
 */
export function sendAdminAlertSilent(ctx: ServiceCtx, data: AdminAlertEmailData): void {
	sendAdminAlert(ctx, data).catch((err) => {
		console.error('[email] sendAdminAlert failed:', err);
	});
}

/**
 * Send an admin alert using only Env — for unauthenticated contexts (e.g. login failures).
 * Never throws.
 */
export function sendAdminAlertFromEnv(env: Env, data: AdminAlertEmailData): void {
	const alertTo = env.ALERT_EMAIL_TO;
	if (!alertTo) return;
	if (!checkRateLimit(`alert:${data.subject}`)) return;

	try {
		const provider = createAlertProvider(env, alertTo);
		const { subject, html, text } = adminAlertEmail(data);
		provider.send({ to: alertTo, subject, html, text }).catch((err) => {
			console.error('[email] sendAdminAlertFromEnv failed:', err);
		});
	} catch (err) {
		console.error('[email] sendAdminAlertFromEnv setup failed:', err);
	}
}

/**
 * Send a low-stock admin alert listing all under-threshold products.
 */
export async function sendLowStockAlert(
	ctx: ServiceCtx,
	items: { product_code: string; product_name: string; quantity: number; min_quantity: number; unit: string }[]
): Promise<void> {
	if (items.length === 0) return;

	const locale = await getEmailLocale(ctx);

	const details: Record<string, string> = {};
	for (const item of items) {
		details[`${item.product_code} ${item.product_name}`] = locale === 'ja'
			? `${item.quantity} ${item.unit}（最小: ${item.min_quantity} ${item.unit}）`
			: `${item.quantity} ${item.unit} (min: ${item.min_quantity} ${item.unit})`;
	}

	const n = items.length;
	const subject = locale === 'ja'
		? `低在庫アラート: ${n}件の商品が最低在庫数を下回っています`
		: `Low Stock Alert: ${n} product${n > 1 ? 's' : ''} below minimum`;
	const summary = locale === 'ja'
		? `${n}件の商品が最低在庫数を下回っています。`
		: `${n} product${n > 1 ? 's are' : ' is'} below the minimum stock threshold.`;

	await sendAdminAlert(ctx, { subject, severity: 'warning', summary, details });
}

/**
 * Check inventory for the given product IDs and send a low-stock alert if any are below min_quantity.
 * Fire-and-forget — never throws.
 */
export function notifyLowStockForProducts(ctx: ServiceCtx, productIds: string[]): void {
	if (productIds.length === 0) return;

	Promise.all([
		ctx.db
			.select({
				product_code: schema.products.code,
				product_name: schema.products.name,
				unit: schema.products.unit,
				min_quantity: schema.products.min_quantity,
				quantity: schema.inventory.quantity,
			})
			.from(schema.inventory)
			.innerJoin(schema.products, eq(schema.inventory.product_id, schema.products.id))
			.where(inArray(schema.inventory.product_id, productIds)),
	])
		.then(([rows]) => {
			const low = rows.filter((r) => r.min_quantity > 0 && r.quantity < r.min_quantity);
			if (low.length > 0) {
				return sendLowStockAlert(ctx, low);
			}
		})
		.catch((err) => {
			console.error('[email] notifyLowStockForProducts failed:', err);
		});
}

export { type AdminAlertEmailData };
