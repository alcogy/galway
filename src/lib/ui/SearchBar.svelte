<script lang="ts">
	import Input from './Input.svelte';
	import Button from './Button.svelte';
	import { Search } from '@lucide/svelte';
	import { t } from '$lib/i18n';

	interface Props {
		value: string;
		placeholder?: string;
		onsubmit?: () => void;
	}

	let { value = $bindable(''), placeholder = 'Search...', onsubmit }: Props = $props();

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onsubmit?.();
	}
</script>

<form class="search-bar" onsubmit={handleSubmit}>
	<Search size={16} />
	<input class="input" placeholder={placeholder} bind:value  />
	<Button type="submit" variant="secondary" size="sm">{t('common.search')}</Button>
</form>

<style lang="scss">
	.search-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-text-tertiary);
		max-width: 360px;
		width: fit-content;
		background-color: var(--color-input-bg);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		padding: 0 var(--space-md);
	}
	.input {
		width: 100%;
		min-width: 140px;
		flex: 1;
		height: 36px;
		padding: 0;
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 0;
		outline: none;
		font-family: inherit;
		font-size: 0.8125rem;
		&::placeholder {
			color: var(--color-input-placeholder);
		}
		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
