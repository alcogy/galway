<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from '$lib/ui';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import { t, getLocale, setLocale, type Locale } from '$lib/i18n';
	import { getTheme, setTheme } from '$lib/theme.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let notificationEmail = $state('');
	let lowStockAlertEnabled = $state(true);
	let alertEmailEnabled = $state(false);
	let slackWebhookUrl = $state('');
	let emailLocale = $state<'en' | 'ja'>('en');

	$effect(() => {
		notificationEmail = data.settings.notification_email;
		lowStockAlertEnabled = data.settings.low_stock_alert_enabled;
		alertEmailEnabled = data.settings.alert_email_enabled;
		slackWebhookUrl = data.settings.slack_webhook_url;
		emailLocale = data.settings.email_locale;
	});

	function handleLocale(l: Locale) {
		setLocale(l);
	}

	const emailProvider = $derived(data.emailProvider);
</script>

<svelte:head>
	<title>{t('settings.pageTitle')}</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t('settings.title')}</h1>

	{#if form?.success}
		<div class="notice notice-success">{t('settings.saved')}</div>
	{:else if form?.testEmailSent}
		<div class="notice notice-success">{t('settings.testEmailSent')}</div>
	{:else if form?.error}
		<div class="notice notice-error">{form.error}</div>
	{/if}

	<!-- Appearance -->
	<Card title={t('settings.appearance')}>
		<div class="settings-group">
			<div class="setting-row">
				<div class="setting-info">
					<span class="setting-label">{t('settings.theme')}</span>
					<span class="setting-desc">{t('settings.themeDesc')}</span>
				</div>
				<div class="theme-switcher">
					<button
						class="theme-btn"
						class:active={getTheme() === 'light'}
						onclick={() => setTheme('light')}
						aria-label={t('settings.themeLight')}
					>
						<Sun size={14} />
						{t('settings.themeLight')}
					</button>
					<button
						class="theme-btn"
						class:active={getTheme() === 'dark'}
						onclick={() => setTheme('dark')}
						aria-label={t('settings.themeDark')}
					>
						<Moon size={14} />
						{t('settings.themeDark')}
					</button>
					<button
						class="theme-btn"
						class:active={getTheme() === 'system'}
						onclick={() => setTheme('system')}
						aria-label={t('settings.themeSystem')}
					>
						<Monitor size={14} />
						{t('settings.themeSystem')}
					</button>
				</div>
			</div>
		</div>
	</Card>

	<!-- Language -->
	<Card title={t('settings.language')}>
		<div class="settings-group">
			<div class="setting-row">
				<div class="setting-info">
					<span class="setting-label">{t('settings.language')}</span>
					<span class="setting-desc">{t('settings.languageDesc')}</span>
				</div>
				<div class="lang-switcher">
					<button
						class="lang-btn"
						class:active={getLocale() === 'en'}
						onclick={() => handleLocale('en')}
					>
						English
					</button>
					<button
						class="lang-btn"
						class:active={getLocale() === 'ja'}
						onclick={() => handleLocale('ja')}
					>
						日本語
					</button>
				</div>
			</div>
		</div>
	</Card>

	<form method="POST" action="?/save" use:enhance class="settings-form">
		<!-- Stock alert -->
		<Card title={t('settings.stockAlert')}>
			<div class="settings-group">
				<div class="setting-row">
					<div class="setting-info">
						<span class="setting-label">{t('settings.lowStockAlert')}</span>
						<span class="setting-desc">
							{t('settings.lowStockDescPre')}
							<a href="/products">{t('settings.lowStockDescLink')}</a>.
						</span>
					</div>
					<label class="toggle">
						<input
							type="checkbox"
							name="low_stock_alert_enabled"
							role="switch"
							bind:checked={lowStockAlertEnabled}
						/>
						<span class="toggle-track">
							<span class="toggle-thumb"></span>
						</span>
					</label>
				</div>
			</div>
		</Card>

		<!-- Admin Alerts -->
		<Card title={t('settings.notifications')}>
			<div class="settings-group">
				<div class="setting-row">
					<div class="setting-info">
						<span class="setting-label">{t('settings.emailNotification')}</span>
						<span class="setting-desc">{t('settings.emailNotificationDesc')}</span>
					</div>
					<label class="toggle">
						<input
							type="checkbox"
							name="alert_email_enabled"
							role="switch"
							bind:checked={alertEmailEnabled}
						/>
						<span class="toggle-track">
							<span class="toggle-thumb"></span>
						</span>
					</label>
				</div>

				<div class="setting-field" class:disabled={!alertEmailEnabled}>
					<Label>{t('settings.notificationEmail')}</Label>
					<Input
						name="notification_email"
						type="email"
						bind:value={notificationEmail}
						placeholder="admin@example.com"
						disabled={!alertEmailEnabled}
					/>
					<span class="field-hint">{t('settings.notificationEmailDesc')}</span>
				</div>

				<div class="setting-field">
					<Label>{t('settings.slackWebhookUrl')}</Label>
					<Input
						name="slack_webhook_url"
						bind:value={slackWebhookUrl}
						placeholder="https://hooks.slack.com/services/..."
					/>
					<span class="field-hint">{t('settings.slackDesc')}</span>
				</div>

				<div class="setting-row">
					<div class="setting-info">
						<span class="setting-label">{t('settings.emailLocale')}</span>
						<span class="setting-desc">{t('settings.emailLocaleDesc')}</span>
					</div>
					<div class="lang-switcher">
						<button
							type="button"
							class="lang-btn"
							class:active={emailLocale === 'en'}
							onclick={() => (emailLocale = 'en')}
						>
							English
						</button>
						<button
							type="button"
							class="lang-btn"
							class:active={emailLocale === 'ja'}
							onclick={() => (emailLocale = 'ja')}
						>
							日本語
						</button>
					</div>
					<input type="hidden" name="email_locale" value={emailLocale} />
				</div>
			</div>
		</Card>

		<!-- Account Notifications (email provider status) -->
		<Card title={t('settings.emailProvider')}>
			<div class="settings-group">
				<p class="setting-desc">{t('settings.emailProviderDesc')}</p>
				<div class="provider-status">
					<span class="provider-label">{t('settings.emailProviderLabel')}:</span>
					{#if emailProvider}
						<span class="provider-badge provider-badge--active">{emailProvider}</span>
					{:else}
						<span class="provider-badge provider-badge--none">—</span>
					{/if}
				</div>
				{#if !emailProvider}
					<p class="field-hint">{t('settings.emailProviderNotConfigured')}</p>
				{/if}
			</div>
		</Card>

		<div class="form-actions">
			<Button type="submit">{t('settings.save')}</Button>
		</div>
	</form>

	<form method="POST" action="?/sendTestEmail" use:enhance>
		<div class="form-actions">
			<Button type="submit" variant="secondary">{t('settings.testEmail')}</Button>
		</div>
	</form>
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		max-width: 720px;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.notice {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;

		&.notice-success {
			background-color: var(--color-success-light);
			color: var(--color-success);
			border: 1px solid var(--color-success);
		}

		&.notice-error {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
			border: 1px solid var(--color-danger);
		}
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.settings-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.coming-soon-banner {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		background-color: var(--color-bg-sunken);
		color: var(--color-text-secondary);
		border: 1px dashed var(--color-border);
	}

	.setting-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-lg);
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		flex: 1;
	}

	.setting-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.setting-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.5;

		a {
			color: var(--color-primary);
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.setting-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&.disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.provider-status {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.875rem;
	}

	.provider-label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.provider-badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 600;
		font-family: monospace;

		&--active {
			background-color: var(--color-success-light);
			color: var(--color-success);
			border: 1px solid var(--color-success);
		}

		&--none {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-tertiary);
			border: 1px solid var(--color-border);
		}
	}

	/* Theme switcher */
	.theme-switcher {
		display: flex;
		gap: 2px;
		background-color: var(--color-bg-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2px;
		flex-shrink: 0;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 4px 12px;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);
		font-family: inherit;

		&:hover {
			color: var(--color-text);
		}

		&.active {
			background-color: var(--color-bg-elevated);
			color: var(--color-text);
			box-shadow: var(--shadow-sm);
		}
	}

	/* Language switcher */
	.lang-switcher {
		display: flex;
		gap: 2px;
		background-color: var(--color-bg-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2px;
		flex-shrink: 0;
	}

	.lang-btn {
		padding: 4px 14px;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			color: var(--color-text);
		}

		&.active {
			background-color: var(--color-bg-elevated);
			color: var(--color-text);
			box-shadow: var(--shadow-sm);
		}
	}

	/* Toggle switch */
	.toggle {
		display: flex;
		align-items: center;
		cursor: pointer;
		flex-shrink: 0;

		input[type='checkbox'] {
			position: absolute;
			opacity: 0;
			width: 0;
			height: 0;

			&:checked + .toggle-track {
				background-color: var(--color-primary);

				.toggle-thumb {
					transform: translateX(18px);
				}
			}

			&:focus-visible + .toggle-track {
				outline: 2px solid var(--color-primary);
				outline-offset: 2px;
			}
		}
	}

	.toggle-track {
		display: block;
		width: 42px;
		height: 24px;
		background-color: var(--color-border);
		border-radius: 12px;
		position: relative;
		transition: background-color var(--transition-fast);
	}

	.toggle-thumb {
		display: block;
		width: 18px;
		height: 18px;
		background-color: #fff;
		border-radius: 50%;
		position: absolute;
		top: 3px;
		left: 3px;
		transition: transform var(--transition-fast);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
