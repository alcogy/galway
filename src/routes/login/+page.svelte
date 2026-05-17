<script lang="ts">
	import { Button, Input, Label } from '$lib/ui';
	import { getTheme, setTheme, type Theme } from '$lib/theme.svelte';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const themeIcons: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
	let ThemeIcon = $derived(themeIcons[getTheme()]);

	function cycleTheme() {
		const order: Theme[] = ['light', 'dark', 'system'];
		const idx = order.indexOf(getTheme());
		setTheme(order[(idx + 1) % order.length]);
	}
</script>

<svelte:head>
	<title>サインイン — Galway</title>
</svelte:head>

<div class="login-page">
	<button class="theme-toggle" onclick={cycleTheme} aria-label="Toggle theme">
		<ThemeIcon size={16} />
	</button>

	<div class="login-card">
		<div class="login-header">
			<h1 class="login-title">Galway</h1>
			<p class="login-subtitle">Sign in to your account</p>
		</div>

		<form method="POST" class="login-form">
			{#if form?.error}
				<div class="login-error" role="alert">{form.error}</div>
			{/if}

			<div class="field">
				<Label for="email" required>メールアドレス</Label>
				<Input
					id="email"
					type="email"
					name="email"
					placeholder="admin@example.com"
					autocomplete="email"
					required
				/>
			</div>

			<div class="field">
				<Label for="password" required>パスワード</Label>
				<Input
					id="password"
					type="password"
					name="password"
					placeholder="Enter your password"
					autocomplete="current-password"
					required
				/>
			</div>

			<Button type="submit" variant="primary" size="lg">サインイン</Button>
		</form>
	</div>
</div>

<style lang="scss">
	.login-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-lg);
		position: relative;
	}

	.theme-toggle {
		position: absolute;
		top: var(--space-lg);
		right: var(--space-lg);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
			color: var(--color-text);
		}
	}

	.login-card {
		width: 100%;
		max-width: 380px;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		padding: var(--space-2xl);
	}

	.login-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.login-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.login-subtitle {
		margin-top: var(--space-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.login-error {
		padding: var(--space-md);
		background-color: var(--color-danger-light);
		color: var(--color-danger);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.login-hint {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border);
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-align: center;
	}
</style>
