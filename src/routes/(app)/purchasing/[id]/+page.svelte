<script lang="ts">
	import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Card, ConfirmDialog, Table } from '$lib/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showDeleteDialog = $state(false);
	let showConvertDialog = $state(false);
	let showStatusDialog = $state(false);
	let pendingTransition = $state<{ label: string; next: string } | null>(null);
	let updatingStatus = $state(false);

	const STATUS_LABELS = $derived<Record<string, string>>({
		draft: t('purchasing.statusDraft'),
		ordered: t('purchasing.statusOrdered'),
		received: t('purchasing.statusReceived'),
		cancelled: t('purchasing.statusCancelled'),
	});

	const STATUS_TRANSITIONS = $derived<Record<string, { label: string; next: string }[]>>({
		draft: [{ label: t('purchasing.actionConfirm'), next: 'ordered' }, { label: t('purchasing.actionCancel'), next: 'cancelled' }],
		ordered: [{ label: t('purchasing.actionReceive'), next: 'received' }, { label: t('purchasing.actionCancel'), next: 'cancelled' }],
		received: [],
		cancelled: [{ label: t('purchasing.actionRevertDraft'), next: 'draft' }],
	});

	const transitions = $derived(STATUS_TRANSITIONS[data.order.status] ?? []);

	function openStatusDialog(tr: { label: string; next: string }) {
		pendingTransition = tr;
		showStatusDialog = true;
	}

	async function confirmStatusChange() {
		if (!pendingTransition) return;
		updatingStatus = true;
		const fd = new FormData();
		fd.append('status', pendingTransition.next);
		await fetch('?/updateStatus', { method: 'POST', body: fd });
		await invalidateAll();
		updatingStatus = false;
		pendingTransition = null;
	}

	const columns = $derived([
		{ key: 'product_code', label: t('purchasing.productCode'), width: '160px' },
		{ key: 'product_name', label: t('purchasing.productName') },
		{ key: 'quantity', label: t('purchasing.quantity'), width: '100px', numeric: true },
		{ key: 'unit', label: t('purchasing.unit'), width: '80px' },
	]);
</script>

<svelte:head>
	<title>{data.order.order_number} — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/purchasing" class="back-link">
			<ArrowLeft size={16} />
			{t('purchasing.backToList')}
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{data.order.order_number}</h1>
		<div class="page-actions">
			{#each transitions as tr (tr.next)}
				<Button
					variant="secondary"
					size="sm"
					disabled={updatingStatus}
					onclick={() => openStatusDialog(tr)}
				>
					{tr.label}
				</Button>
			{/each}
			{#if data.order.status === 'ordered'}
				<Button size="sm" onclick={() => (showConvertDialog = true)}>
					{t('purchasing.createReceivingSlip')}
				</Button>
			{/if}
			{#if data.order.status === 'draft'}
				<Button variant="secondary" size="sm" onclick={() => goto(`/purchasing/${data.order.id}/edit`)}>
					<Pencil size={14} />
					{t('common.edit')}
				</Button>
			{/if}
		</div>
	</div>

	<Card title={t('purchasing.orderInfo')}>
		<dl class="info-grid">
			<div class="info-item">
				<dt class="info-label">{t('purchasing.orderNumber')}</dt>
				<dd class="info-value">{data.order.order_number}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('purchasing.status')}</dt>
				<dd class="info-value">
					<span class="status-badge status-{data.order.status}">
						{STATUS_LABELS[data.order.status]}
					</span>
				</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('purchasing.supplier')}</dt>
				<dd class="info-value">{data.order.supplier_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('purchasing.orderedAt')}</dt>
				<dd class="info-value">{data.order.ordered_at}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('purchasing.expectedAt')}</dt>
				<dd class="info-value">{data.order.expected_at ?? '—'}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">{t('purchasing.person')}</dt>
				<dd class="info-value">{data.order.user_name ?? '—'}</dd>
			</div>
			{#if data.order.note}
				<div class="info-item full">
					<dt class="info-label">{t('purchasing.note')}</dt>
					<dd class="info-value">{data.order.note}</dd>
				</div>
			{/if}
		</dl>
	</Card>

	<section>
		<h2 class="section-title">{t('purchasing.orderDetails')}</h2>
		<Table {columns} rows={data.details}>
			{#snippet empty()}
				<span>{t('common.noData')}</span>
			{/snippet}
		</Table>
	</section>

	{#if data.order.status === 'draft' || data.order.status === 'cancelled'}
		<section class="danger-zone">
			<h2 class="danger-title">{t('common.delete')}</h2>
			<p class="danger-desc">{t('purchasing.deleteConfirm')}</p>
			<Button variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
				<Trash2 size={14} />
				{t('common.delete')}
			</Button>
		</section>
	{/if}
</div>

<ConfirmDialog
	bind:open={showStatusDialog}
	title={pendingTransition?.label ?? ''}
	message={t('purchasing.statusChangeConfirm').replace('{label}', pendingTransition?.label ?? '')}
	confirmLabel={pendingTransition?.label ?? ''}
	cancelLabel={t('common.cancel')}
	onconfirm={confirmStatusChange}
/>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('purchasing.deleteConfirm')}
	message={t('purchasing.deleteConfirm')}
	confirmLabel={t('common.delete')}
	cancelLabel={t('common.cancel')}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		document.body.appendChild(form);
		form.submit();
	}}
/>

<ConfirmDialog
	bind:open={showConvertDialog}
	title={t('purchasing.createReceivingSlip')}
	message={t('purchasing.createReceivingSlipConfirm')}
	confirmLabel={t('purchasing.createReceivingSlip')}
	cancelLabel={t('common.cancel')}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/convertToReceiving';
		document.body.appendChild(form);
		form.submit();
	}}
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
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-lg);
		margin: 0;
		padding: 0;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&.full {
			grid-column: 1 / -1;
		}
	}

	.info-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.info-value {
		font-size: 0.875rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: var(--radius-full, 999px);
		font-size: 0.75rem;
		font-weight: 500;

		&.status-draft {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-secondary);
		}

		&.status-ordered {
			background-color: var(--color-primary-light);
			color: var(--color-primary);
		}

		&.status-received {
			background-color: var(--color-success-light);
			color: var(--color-success);
		}

		&.status-cancelled {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-bottom: var(--space-md);
	}

	.danger-zone {
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.danger-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-danger);
	}

	.danger-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}
</style>
