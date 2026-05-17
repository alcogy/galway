<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from '$lib/ui';
	import { t, getLocale, setLocale, type Locale } from '$lib/i18n';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let notificationEmail = $state('');
	let lowStockAlertEnabled = $state(true);
	let alertEmailEnabled = $state(false);
	let slackWebhookUrl = $state('');

	$effect(() => {
		notificationEmail = data.settings.notification_email;
		lowStockAlertEnabled = data.settings.low_stock_alert_enabled;
		alertEmailEnabled = data.settings.alert_email_enabled;
		slackWebhookUrl = data.settings.slack_webhook_url;
	});

	function handleLocale(l: Locale) {
		setLocale(l);
	}
</script>

<svelte:head>
	<title>{t('settings.pageTitle')}</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t('settings.title')}</h1>

	{#if form?.success}
		<div class="notice notice-success">{t('settings.saved')}</div>
	{:else if form?.error}
		<div class="notice notice-error">{form.error}</div>
	{/if}

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

		<!-- Notifications -->
		<Card title={t('settings.notifications')}>
			<div class="settings-group">
				<div class="coming-soon-banner">
					{t('settings.notificationsSoon')}
				</div>

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
						placeholder="notify@example.com"
						disabled={!alertEmailEnabled}
					/>
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
			</div>
		</Card>

		<div class="form-actions">
			<Button type="submit">{t('settings.save')}</Button>
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
