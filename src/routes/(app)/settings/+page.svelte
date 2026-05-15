<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from '$lib/components';
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
</script>

<svelte:head>
	<title>設定 — AES Supplier</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">設定</h1>

	{#if form?.success}
		<div class="notice notice-success">設定を保存しました。</div>
	{:else if form?.error}
		<div class="notice notice-error">{form.error}</div>
	{/if}

	<form method="POST" action="?/save" use:enhance class="settings-form">
		<!-- 在庫アラート -->
		<Card title="在庫アラート">
			<div class="settings-group">
				<div class="setting-row">
					<div class="setting-info">
						<span class="setting-label">低在庫アラート</span>
						<span class="setting-desc">
							在庫数が商品ごとの「最低在庫数」を下回った場合にダッシュボードで警告を表示します。
							各商品の最低在庫数は<a href="/products">商品管理</a>から設定できます。
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

		<!-- 通知設定（将来実装） -->
		<Card title="通知設定">
			<div class="settings-group">
				<div class="coming-soon-banner">
					メール・Slack 通知は今後実装予定です。現在は設定値を保存するのみです。
				</div>

				<div class="setting-row">
					<div class="setting-info">
						<span class="setting-label">メール通知</span>
						<span class="setting-desc">低在庫アラートや入荷・出荷の通知をメールで受け取ります。</span>
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
					<Label>通知先メールアドレス</Label>
					<Input
						name="notification_email"
						type="email"
						bind:value={notificationEmail}
						placeholder="notify@example.com"
						disabled={!alertEmailEnabled}
					/>
				</div>

				<div class="setting-field">
					<Label>Slack Webhook URL</Label>
					<Input
						name="slack_webhook_url"
						bind:value={slackWebhookUrl}
						placeholder="https://hooks.slack.com/services/..."
					/>
					<span class="field-hint">設定すると Slack チャンネルへの通知が有効になります（実装予定）。</span>
				</div>
			</div>
		</Card>

		<div class="form-actions">
			<Button type="submit">保存</Button>
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
