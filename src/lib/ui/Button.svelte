<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, ...rest }: Props = $props();
</script>

<button class="btn btn-{variant} btn-{size}" {...rest}>
	{@render children()}
</button>

<style lang="scss">
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast),
			color var(--transition-fast);
		white-space: nowrap;
		line-height: 1;

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	/* --- Sizes --- */
	.btn-sm {
		height: 28px;
		padding: 0 var(--space-md);
		font-size: 0.75rem;
	}

	.btn-md {
		height: 36px;
		padding: 0 var(--space-lg);
		font-size: 0.8125rem;
	}

	.btn-lg {
		height: 44px;
		padding: 0 var(--space-xl);
		font-size: 0.875rem;
	}

	/* --- Variants --- */
	.btn-primary {
		background-color: var(--color-primary);
		color: var(--color-primary-text);

		&:hover:not(:disabled) {
			background-color: var(--color-primary-hover);
		}

		&:active:not(:disabled) {
			background-color: var(--color-primary-active);
		}
	}

	.btn-secondary {
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		border-color: var(--color-border);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
		}

		&:active:not(:disabled) {
			background-color: var(--color-active);
		}
	}

	.btn-ghost {
		background-color: transparent;
		color: var(--color-text-secondary);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
			color: var(--color-text);
		}

		&:active:not(:disabled) {
			background-color: var(--color-active);
		}
	}

	.btn-danger {
		background-color: var(--color-danger);
		color: #ffffff;

		&:hover:not(:disabled) {
			background-color: var(--color-danger-hover);
		}
	}
</style>
