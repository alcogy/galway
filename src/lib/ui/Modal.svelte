<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose?: () => void;
		children: Snippet;
		size?: 'sm' | 'md' | 'lg';
	}

	let { open = $bindable(false), title, onclose, children, size = 'md' }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

<dialog bind:this={dialog} class="modal size-{size}" onclose={handleClose}>
	<div class="modal-container">
		<header class="modal-header">
			<h2 class="modal-title">{title}</h2>
			<button class="modal-close" onclick={handleClose} aria-label="Close dialog">
				<X size={18} />
			</button>
		</header>
		<div class="modal-body">
			{@render children()}
		</div>
	</div>
</dialog>

<style lang="scss">
	.modal {
		border: none;
		border-radius: var(--radius-xl);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		padding: 0;
		margin: auto;
		max-height: calc(100vh - var(--space-3xl) * 2);
		box-shadow: var(--shadow-lg);

		&.size-sm {
			width: min(380px, calc(100vw - var(--space-2xl) * 2));
		}

		&.size-md {
			width: min(480px, calc(100vw - var(--space-2xl) * 2));
		}

		&.size-lg {
			width: min(640px, calc(100vw - var(--space-2xl) * 2));
		}

		&::backdrop {
			background-color: var(--color-bg-overlay);
		}

		&[open] {
			display: flex;
			flex-direction: column;
		}
	}

	.modal-container {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		width: 100%;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-lg) var(--space-xl);
		border-bottom: 1px solid var(--color-border-light);
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
	}

	.modal-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
			color: var(--color-text);
		}
	}

	.modal-body {
		padding: var(--space-xl);
		overflow-y: auto;
	}
</style>
