<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		totalItems: number;
		itemsPerPage: number;
		currentPage: number;
		onPageChange: (page: number) => void;
	}

	let { totalItems, itemsPerPage, currentPage, onPageChange }: Props = $props();

	const totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
	const startItem = $derived((currentPage - 1) * itemsPerPage + 1);
	const endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));

	const canGoPrevious = $derived(currentPage > 1);
	const canGoNext = $derived(currentPage < totalPages);
	const canGoFirst = $derived(currentPage > 1);
	const canGoLast = $derived(currentPage < totalPages);

	const infoText = $derived(
		t('pagination.info')
			.replace('{total}', String(totalItems))
			.replace('{start}', String(startItem))
			.replace('{end}', String(endItem))
			.replace('{current}', String(currentPage))
			.replace('{pages}', String(totalPages))
	);

	function handleFirst() {
		if (canGoFirst) onPageChange(1);
	}

	function handlePrevious() {
		if (canGoPrevious) onPageChange(currentPage - 1);
	}

	function handleNext() {
		if (canGoNext) onPageChange(currentPage + 1);
	}

	function handleLast() {
		if (canGoLast) onPageChange(totalPages);
	}
</script>

{#if totalItems > 0}
	<div class="pagination">
		<div class="pagination-info">
			{infoText}
		</div>
		<div class="pagination-controls">
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoFirst}
				onclick={handleFirst}
				aria-label={t('pagination.first')}
			>
				&lt;&lt;
			</button>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoPrevious}
				onclick={handlePrevious}
				aria-label={t('pagination.previous')}
			>
				&lt;
			</button>
			<span class="current-page">{currentPage}</span>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoNext}
				onclick={handleNext}
				aria-label={t('pagination.next')}
			>
				&gt;
			</button>
			<button
				type="button"
				class="pagination-button"
				disabled={!canGoLast}
				onclick={handleLast}
				aria-label={t('pagination.last')}
			>
				&gt;&gt;
			</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-light);
		background-color: var(--color-bg-elevated);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.pagination-info {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.pagination-button {
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-sm);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.8125rem;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
			border-color: var(--color-blue);
		}

		&:active:not(:disabled) {
			background-color: var(--color-active);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.current-page {
		padding: var(--space-xs) var(--space-md);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-blue);
		min-width: 2rem;
		text-align: center;
	}
</style>
