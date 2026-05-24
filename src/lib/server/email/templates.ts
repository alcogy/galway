export type EmailLocale = 'en' | 'ja';

function escape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const s = {
	en: {
		footer: '© Galway · This is an automated message, please do not reply.',
		severity: { info: 'INFO', warning: 'WARNING', danger: 'DANGER' },
		welcome: {
			subject: 'Welcome to Galway',
			heading: (name: string) => `Welcome, ${name}!`,
			intro: 'Your Galway account has been created. You can now sign in with the email address below.',
			emailLabel: 'Email:',
			btn: 'Sign in to Galway',
			ignore: 'If you did not request this account, you can safely ignore this email.',
			text: (name: string, email: string, url: string) =>
				`Welcome to Galway, ${name}!\n\nYour account has been created.\nEmail: ${email}\nSign in: ${url}\n`,
		},
		pwChanged: {
			subject: 'Your Galway password was changed',
			heading: 'Password changed',
			hi: (name: string) => `Hi ${name},`,
			body: (date: string) => `Your Galway account password was changed on <strong>${escape(date)}</strong>.`,
			ignore: 'If you did not make this change, please contact your administrator immediately.',
			text: (name: string, date: string) =>
				`Hi ${name},\n\nYour Galway password was changed on ${date}.\n\nIf this wasn't you, contact your administrator.\n`,
		},
	},
	ja: {
		footer: '© Galway · このメールは自動送信です。返信はお受けできません。',
		severity: { info: '情報', warning: '警告', danger: '危険' },
		welcome: {
			subject: 'Galwayへようこそ',
			heading: (name: string) => `${name} さん、ようこそ！`,
			intro: 'Galwayアカウントが作成されました。以下のメールアドレスでサインインできます。',
			emailLabel: 'メールアドレス：',
			btn: 'Galwayにサインイン',
			ignore: 'アカウントの作成を依頼していない場合は、このメールを無視してください。',
			text: (name: string, email: string, url: string) =>
				`${name} さん、Galwayへようこそ！\n\nアカウントが作成されました。\nメールアドレス: ${email}\nサインイン: ${url}\n`,
		},
		pwChanged: {
			subject: 'Galwayのパスワードが変更されました',
			heading: 'パスワードの変更',
			hi: (name: string) => `${name} さん`,
			body: (date: string) => `${escape(date)} にGalwayアカウントのパスワードが変更されました。`,
			ignore: '心当たりのない場合は、すぐに管理者にご連絡ください。',
			text: (name: string, date: string) =>
				`${name} さん\n\nGalwayのパスワードが ${date} に変更されました。\n\n心当たりのない場合は管理者にご連絡ください。\n`,
		},
	},
} as const;

function base(title: string, body: string, locale: EmailLocale = 'en'): string {
	return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .header{background:#18181b;padding:24px 32px}
  .header h1{margin:0;font-size:20px;color:#fff;letter-spacing:-.5px}
  .body{padding:32px}
  .body h2{margin:0 0 16px;font-size:18px;color:#18181b}
  .body p{margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46}
  .btn{display:inline-block;margin:8px 0 16px;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600}
  .footer{padding:20px 32px;background:#f4f4f5;font-size:12px;color:#71717a;text-align:center}
  .alert-badge{display:inline-block;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:.5px}
  .alert-warning{background:#fef3c7;color:#92400e}
  .alert-danger{background:#fee2e2;color:#991b1b}
  .alert-info{background:#dbeafe;color:#1e40af}
  hr{border:none;border-top:1px solid #e4e4e7;margin:20px 0}
  pre{background:#f4f4f5;border-radius:4px;padding:12px;font-size:13px;overflow:auto;color:#3f3f46}
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>Galway</h1></div>
  <div class="body">${body}</div>
  <div class="footer">${s[locale].footer}</div>
</div>
</body>
</html>`;
}

export interface WelcomeEmailData {
	name: string;
	email: string;
	loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData, locale: EmailLocale = 'en'): { subject: string; html: string; text: string } {
	const ls = s[locale].welcome;
	const subject = ls.subject;
	const html = base(
		subject,
		`<h2>${ls.heading(escape(data.name))}</h2>
<p>${ls.intro}</p>
<p><strong>${ls.emailLabel}</strong> ${escape(data.email)}</p>
<p><a class="btn" href="${escape(data.loginUrl)}">${ls.btn}</a></p>
<p>${ls.ignore}</p>`,
		locale
	);
	const text = ls.text(data.name, data.email, data.loginUrl);
	return { subject, html, text };
}

export interface PasswordChangedEmailData {
	name: string;
	changedAt: string;
}

export function passwordChangedEmail(data: PasswordChangedEmailData, locale: EmailLocale = 'en'): { subject: string; html: string; text: string } {
	const ls = s[locale].pwChanged;
	const subject = ls.subject;
	const html = base(
		subject,
		`<h2>${ls.heading}</h2>
<p>${ls.hi(escape(data.name))}</p>
<p>${ls.body(data.changedAt)}</p>
<p>${ls.ignore}</p>`,
		locale
	);
	const text = ls.text(data.name, data.changedAt);
	return { subject, html, text };
}

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface AdminAlertEmailData {
	subject: string;
	severity: AlertSeverity;
	summary: string;
	details?: Record<string, string>;
}

export function adminAlertEmail(data: AdminAlertEmailData, locale: EmailLocale = 'en'): { subject: string; html: string; text: string } {
	const badgeClass = `alert-${data.severity}`;
	const badgeLabel = s[locale].severity[data.severity];

	const detailsHtml = data.details
		? Object.entries(data.details)
				.map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap">${escape(k)}</td><td style="padding:4px 8px">${escape(v)}</td></tr>`)
				.join('')
		: '';

	const detailsTable = detailsHtml
		? `<hr><table style="width:100%;border-collapse:collapse;font-size:13px">${detailsHtml}</table>`
		: '';

	const html = base(
		data.subject,
		`<span class="alert-badge ${badgeClass}">${badgeLabel}</span>
<h2 style="margin-top:12px">${escape(data.subject)}</h2>
<p>${escape(data.summary)}</p>${detailsTable}`,
		locale
	);

	const detailsText = data.details
		? '\n\nDetails:\n' + Object.entries(data.details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
		: '';

	const text = `[${badgeLabel}] ${data.subject}\n\n${data.summary}${detailsText}\n`;

	return { subject: data.subject, html, text };
}
