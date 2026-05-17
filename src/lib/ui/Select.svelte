<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Option {
		value: string;
		label: string;
	}

	interface Props extends HTMLSelectAttributes {
		options: Option[];
		placeholder?: string;
		error?: string;
	}

	let { options, placeholder, error, value = $bindable(''), ...rest }: Props = $props();
</script>

<div class="select-wrapper">
	<select class="select" class:has-error={!!error} bind:value {...rest}>
		{#if placeholder}
			<option value="">{placeholder}</option>
		{/if}
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if error}
		<p class="select-error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.select-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.select {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.has-error {
			border-color: var(--color-danger);

			&:focus {
				box-shadow: 0 0 0 3px var(--color-danger-light);
			}
		}
	}

	.select-error {
		font-size: 0.75rem;
		color: var(--color-danger);
	}
</style>
