<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		open: boolean;
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm?: () => void;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		title = 'Confirm',
		message,
		confirmLabel = 'OK',
		cancelLabel,
		onconfirm,
		oncancel
	}: Props = $props();

	const resolvedCancelLabel = $derived(cancelLabel ?? t('common.cancel'));

	function handleConfirm() {
		onconfirm?.();
		open = false;
	}

	function handleCancel() {
		oncancel?.();
		open = false;
	}
</script>

<Modal bind:open {title} size="sm">
	<div class="confirm-content">
		<p class="confirm-message">{message}</p>

		<div class="confirm-actions">
			<Button type="button" variant="secondary" onclick={handleCancel}>{resolvedCancelLabel}</Button>
			<Button type="button" variant="primary" onclick={handleConfirm}>{confirmLabel}</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.confirm-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.confirm-message {
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text);
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
	}
</style>
