<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		value?: string;
		error?: string;
	}

	let { value = $bindable(''), error, ...rest }: Props = $props();
</script>

<div class="textarea-wrapper">
	<textarea class="textarea" class:has-error={!!error} bind:value {...rest}></textarea>
	{#if error}
		<p class="textarea-error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.textarea-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.textarea {
		min-height: 100px;
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		line-height: 1.5;
		resize: vertical;
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

	.textarea-error {
		font-size: 0.75rem;
		color: var(--color-danger);
	}
</style>
