<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Card, ConfirmDialog, Modal, Table, Label, Input, Textarea } from '$lib/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showDeleteDialog = $state(false);
	let showReceiveModal = $state(false);
	let showStatusDialog = $state(false);
	let pendingTransition = $state<{ label: string; next: string } | null>(null);
	let updatingStatus = $state(false);

	type ReceiveItem = {
		product_id: string;
		product_code: string | null;
		product_name: string | null;
		ordered_qty: number;
		actual_qty: number;
		unit: string | null;
	};

	let receiveDate = $state('');
	let receiveNote = $state('');
	let receiveItems = $state<ReceiveItem[]>([]);

	function openReceiveModal() {
		receiveDate = data.order.expected_at ?? new Date().toISOString().slice(0, 10);
		receiveNote = '';
		receiveItems = data.details.map((d) => ({
			product_id: d.product_id,
			product_code: d.product_code,
			product_name: d.product_name,
			ordered_qty: d.quantity,
			actual_qty: d.quantity,
			unit: d.unit,
		}));
		showReceiveModal = true;
	}

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
				<Button size="sm" onclick={openReceiveModal}>
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

	<section>
		<h2 class="section-title">{t('purchasing.receivingHistory')}</h2>
		{#if data.receivingSlips.length === 0}
			<p class="empty-history">{t('purchasing.noReceivingHistory')}</p>
		{:else}
			<div class="history-table-wrap">
				<table class="history-table">
					<thead>
						<tr>
							<th>{t('receiving.slipNumber')}</th>
							<th>{t('receiving.receivedAt')}</th>
							<th class="num">{t('common.itemCount')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.receivingSlips as slip (slip.id)}
							<tr onclick={() => goto(`/receiving/${slip.id}`)} class="history-row">
								<td class="slip-number">{slip.slip_number}</td>
								<td>{slip.received_at}</td>
								<td class="num">{slip.item_count}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section>
		<h2 class="section-title">{t('purchasing.receivedQtySummary')}</h2>
		<div class="summary-table-wrap">
			<table class="summary-table">
				<thead>
					<tr class="history-row">
						<th>{t('purchasing.productName')}</th>
						<th class="num">{t('purchasing.orderedQty')}</th>
						<th class="num">{t('purchasing.totalReceived')}</th>
						<th class="num">{t('purchasing.diff')}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.details as detail (detail.product_id)}
						{@const received = Number(data.receivedByProduct.find((r) => r.product_id === detail.product_id)?.total_received ?? 0)}
						{@const diff = received - detail.quantity}
						<tr>
							<td>{detail.product_name ?? '—'}</td>
							<td class="num">{detail.quantity.toLocaleString('ja-JP')}</td>
							<td class="num">{received.toLocaleString('ja-JP')}</td>
							<td class="num diff" class:diff-pos={diff > 0} class:diff-zero={diff === 0 && received > 0} class:diff-neg={diff < 0}>
								{diff > 0 ? '+' : ''}{diff.toLocaleString('ja-JP')}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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

<Modal bind:open={showReceiveModal} title={t('purchasing.createReceivingSlip')} size="lg">
	<form
		method="POST"
		action="?/convertToReceiving"
		use:enhance={() => async ({ update }) => {
			await update({ reset: false });
			showReceiveModal = false;
		}}
		class="receive-form"
	>
		<p class="receive-hint">{t('purchasing.createReceivingSlipHint')}</p>

		<div class="receive-date-row">
			<Label>{t('purchasing.receivedAt')}</Label>
			<Input type="date" name="received_at" bind:value={receiveDate} required />
		</div>

		<div class="receive-table-wrap">
			<table class="receive-table">
				<thead>
					<tr>
						<th>{t('purchasing.productCode')}</th>
						<th>{t('purchasing.productName')}</th>
						<th class="num">{t('purchasing.orderedQty')}</th>
						<th class="num">{t('purchasing.actualQty')}</th>
						<th>{t('purchasing.unit')}</th>
					</tr>
				</thead>
				<tbody>
					{#each receiveItems as item, i (item.product_id)}
						<tr>
							<td class="code">{item.product_code ?? '—'}</td>
							<td>{item.product_name ?? '—'}</td>
							<td class="num ordered">{item.ordered_qty.toLocaleString('ja-JP')}</td>
							<td class="num">
								<input
									class="qty-input"
									type="number"
									min="0"
									step="any"
									bind:value={receiveItems[i].actual_qty}
								/>
							</td>
							<td class="unit">{item.unit ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<input
			type="hidden"
			name="details"
			value={JSON.stringify(receiveItems.map((it) => ({ product_id: it.product_id, quantity: it.actual_qty })))}
		/>

		<div class="receive-note-row">
			<Label>{t('common.note')}</Label>
			<Textarea name="note" bind:value={receiveNote} rows={2} />
		</div>

		<div class="receive-actions">
			<Button type="button" variant="secondary" onclick={() => (showReceiveModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button type="submit">
				{t('purchasing.createReceivingSlip')}
			</Button>
		</div>
	</form>
</Modal>

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
		align-items: flex-start;
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

	/* Receiving history */
	.empty-history {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* Shared styles for history + summary tables — matches Table component */
	.history-table-wrap,
	.summary-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
	}

	.history-table,
	.summary-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		background-color: var(--color-bg-elevated);

		thead {
			background-color: var(--color-bg-sunken);
		}

		th {
			padding: var(--space-md) var(--space-lg);
			text-align: left;
			font-weight: 600;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			white-space: nowrap;

			&.num {
				text-align: right;
			}
		}

		tbody tr {
			background-color: var(--color-bg-elevated);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-hover);
			}

			&:not(:last-child) td {
				border-bottom: 1px solid var(--color-border-light);
			}
		}

		td {
			padding: var(--space-md) var(--space-lg);
			color: var(--color-text);

			&.num {
				text-align: right;
				font-variant-numeric: tabular-nums;
				white-space: nowrap;
			}

			&.slip-number {
				font-family: monospace;
				color: var(--color-primary);
			}
		}
	}

	.history-row {
		cursor: pointer;
	}

	.diff {
		color: var(--color-text-secondary);

		&.diff-pos {
			color: var(--color-warning);
		}

		&.diff-zero {
			color: var(--color-success);
		}

		&.diff-neg {
			color: var(--color-text-secondary);
		}
	}

	/* Receive modal */
	.receive-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.receive-hint {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.receive-date-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-width: 200px;
	}

	.receive-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.receive-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;

		th {
			padding: var(--space-sm) var(--space-md);
			text-align: left;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--color-text-secondary);
			background-color: var(--color-bg-sunken);
			border-bottom: 1px solid var(--color-border);

			&.num {
				text-align: right;
			}
		}

		td {
			padding: var(--space-sm) var(--space-md);
			border-bottom: 1px solid var(--color-border-light);
			vertical-align: middle;

			&.num {
				text-align: right;
				font-variant-numeric: tabular-nums;
				white-space: nowrap;
			}

			&.ordered {
				color: var(--color-text-secondary);
			}

			&.code {
				font-family: monospace;
				font-size: 0.8125rem;
			}

			&.unit {
				color: var(--color-text-secondary);
				font-size: 0.8125rem;
			}
		}

		tr:last-child td {
			border-bottom: none;
		}
	}

	.qty-input {
		width: 80px;
		padding: 4px 8px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background-color: var(--color-bg);
		color: var(--color-text);
		font-size: 0.875rem;
		text-align: right;
		font-family: inherit;
		font-variant-numeric: tabular-nums;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
			box-shadow: 0 0 0 2px var(--color-primary-light);
		}
	}

	.receive-note-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.receive-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
	}
</style>
