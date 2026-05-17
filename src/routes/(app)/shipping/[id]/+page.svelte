<script lang="ts">
	import { ArrowLeft, Pencil, Trash2, Download, FileText } from '@lucide/svelte';
	import { Button, Card, ConfirmDialog, Table } from '$lib/ui';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showDeleteDialog = $state(false);

	async function handleDeleteSlip() {
		const formData = new FormData();
		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/shipping');
		}
	}

	const columns = $derived([
		{ key: 'product_code', label: t('shipping.productCode'), width: '160px' },
		{ key: 'product_name', label: t('shipping.productName') },
		{ key: 'quantity', label: t('shipping.quantity'), width: '100px', numeric: true },
		{ key: 'unit', label: t('shipping.unit'), width: '120px' }
	]);
</script>

<svelte:head>
	<title>{data.slip.slip_number} — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/shipping" class="back-link">
			<ArrowLeft size={16} />
			{t('shipping.backToList')}
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{data.slip.slip_number}</h1>
		<div class="page-actions">
			<a href="/shipping/{data.slip.id}/export" class="btn-download">
				<Download size={14} />
				{t('common.csvDownload')}
			</a>
			<a href="/shipping/{data.slip.id}/print" target="_blank" class="btn-download">
				<FileText size={14} />
				{t('shipping.printPdf')}
			</a>
			<Button variant="secondary" size="sm" onclick={() => goto(`/shipping/${data.slip.id}/edit`)}>
				<Pencil size={14} />
				{t('common.edit')}
			</Button>
		</div>
	</div>

	<Card title={t('shipping.slipInfo')}>
		<dl class="info-grid">
			<div class="info-item">
				<dt class="info-label">{t('shipping.slipNumber')}</dt>
				<dd class="info-value">{data.slip.slip_number}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('shipping.shippedAt')}</dt>
				<dd class="info-value">{data.slip.shipped_at}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('shipping.customer')}</dt>
				<dd class="info-value">{data.slip.customer_name || '—'}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('shipping.itemCount')}</dt>
				<dd class="info-value">{data.slip.item_count}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('shipping.person')}</dt>
				<dd class="info-value">{data.slip.user_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('shipping.note')}</dt>
				<dd class="info-value">{data.slip.note || '-'}</dd>
			</div>
		</dl>
	</Card>

	<div class="section">
		<div class="section-header">
			<h2 class="section-title">{t('shipping.slipDetails')}</h2>
		</div>
		<div class="table-container">
			<Table {columns} rows={data.details}>
				{#snippet empty()}
					<span>{t('common.noData')}</span>
				{/snippet}
			</Table>
		</div>
	</div>

	<div class="section danger-section">
		<div class="section-header">
			<h2 class="section-title">{t('shipping.deleteConfirm')}</h2>
		</div>
		<div class="danger-zone-body">
			<div class="danger-zone-item">
				<div class="danger-zone-item-info">
					<p class="danger-zone-item-label">{t('shipping.deleteConfirm')}</p>
					<p class="danger-zone-item-desc">{t('shipping.deleteMessage')}</p>
				</div>
				<Button variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
					<Trash2 size={14} />
					{t('common.delete')}
				</Button>
			</div>
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('shipping.deleteConfirm')}
	message={t('shipping.deleteMessage')}
	confirmLabel={t('common.delete')}
	cancelLabel={t('common.cancel')}
	onconfirm={handleDeleteSlip}
/>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.page-nav {
		margin-bottom: calc(-1 * var(--space-sm));
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-decoration: none;

		&:hover {
			color: var(--color-text);
		}
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
		margin: 0;

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.info-value {
		font-size: 0.9375rem;
		color: var(--color-text);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.btn-download {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		height: 28px;
		padding: 0 var(--space-md);
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
		}

		&:active {
			background-color: var(--color-active);
		}
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.table-container {
		:global(.table-wrapper) {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
		}
	}

	.danger-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-light);
	}

	.danger-zone-body {
		padding: var(--space-xl);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
	}

	.danger-zone-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xl);
	}

	.danger-zone-item-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.danger-zone-item-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.danger-zone-item-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}
</style>
