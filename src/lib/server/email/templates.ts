function escape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function base(title: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="en">
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
  <div class="footer">© Galway · This is an automated message, please do not reply.</div>
</div>
</body>
</html>`;
}

export interface WelcomeEmailData {
	name: string;
	email: string;
	loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
	const subject = 'Welcome to Galway';
	const html = base(
		subject,
		`<h2>Welcome, ${escape(data.name)}!</h2>
<p>Your Galway account has been created. You can now sign in with the email address below.</p>
<p><strong>Email:</strong> ${escape(data.email)}</p>
<p><a class="btn" href="${escape(data.loginUrl)}">Sign in to Galway</a></p>
<p>If you did not request this account, you can safely ignore this email.</p>`
	);
	const text = `Welcome to Galway, ${data.name}!\n\nYour account has been created.\nEmail: ${data.email}\nSign in: ${data.loginUrl}\n`;
	return { subject, html, text };
}

export interface PasswordChangedEmailData {
	name: string;
	changedAt: string;
}

export function passwordChangedEmail(data: PasswordChangedEmailData): { subject: string; html: string; text: string } {
	const subject = 'Your Galway password was changed';
	const html = base(
		subject,
		`<h2>Password changed</h2>
<p>Hi ${escape(data.name)},</p>
<p>Your Galway account password was changed on <strong>${escape(data.changedAt)}</strong>.</p>
<p>If you did not make this change, please contact your administrator immediately.</p>`
	);
	const text = `Hi ${data.name},\n\nYour Galway password was changed on ${data.changedAt}.\n\nIf this wasn't you, contact your administrator.\n`;
	return { subject, html, text };
}

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface AdminAlertEmailData {
	subject: string;
	severity: AlertSeverity;
	summary: string;
	details?: Record<string, string>;
}

export function adminAlertEmail(data: AdminAlertEmailData): { subject: string; html: string; text: string } {
	const badgeClass = `alert-${data.severity}`;
	const badgeLabel = data.severity.toUpperCase();

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
<p>${escape(data.summary)}</p>${detailsTable}`
	);

	const detailsText = data.details
		? '\n\nDetails:\n' + Object.entries(data.details).map(([k, v]) => `  ${k}: ${v}`).join('\n')
		: '';

	const text = `[${badgeLabel}] ${data.subject}\n\n${data.summary}${detailsText}\n`;

	return { subject: data.subject, html, text };
}
