<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		value?: string | number;
		error?: string;
	}

	let { value = $bindable(''), error, ...rest }: Props = $props();
</script>

<div class="input-wrapper">
	<input class="input" class:has-error={!!error} bind:value {...rest} />
	{#if error}
		<p class="input-error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.input-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.input {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&::placeholder {
			color: var(--color-input-placeholder);
		}

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

	.input-error {
		font-size: 0.75rem;
		color: var(--color-danger);
	}
</style>
