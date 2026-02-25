<script lang="ts">
	import { ArrowLeft, Pencil, Trash2, Download } from '@lucide/svelte';
	import { Button, Card, ConfirmDialog, Table } from '$lib/components';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let showDeleteDialog = $state(false);

	async function handleDeleteSlip() {
		const formData = new FormData();
		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/receiving');
		}
	}

	const columns = [
		{ key: 'product_code', label: '商品コード', width: '160px' },
		{ key: 'product_name', label: '商品名' },
		{ key: 'quantity', label: '数量', width: '100px', numeric: true },
		{ key: 'unit', label: '単位', width: '80px' }
	];
</script>

<svelte:head>
	<title>{data.slip.slip_number} — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/receiving" class="back-link">
			<ArrowLeft size={16} />
			入荷管理へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{data.slip.slip_number}</h1>
		<div class="page-actions">
			<a href="/receiving/{data.slip.id}/export" class="btn-download">
				<Download size={14} />
				CSVダウンロード
			</a>
			<Button variant="secondary" size="sm" onclick={() => goto(`/receiving/${data.slip.id}/edit`)}>
				<Pencil size={14} />
				編集
			</Button>
		</div>
	</div>

	<Card title="伝票情報">
		<dl class="info-grid">
			<div class="info-item">
				<dt class="info-label">伝票番号</dt>
				<dd class="info-value">{data.slip.slip_number}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">入荷日</dt>
				<dd class="info-value">{data.slip.received_at}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">仕入先</dt>
				<dd class="info-value">{data.slip.supplier_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">品目数</dt>
				<dd class="info-value">{data.slip.item_count}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">担当者</dt>
				<dd class="info-value">{data.slip.user_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">備考</dt>
				<dd class="info-value">{data.slip.note || '-'}</dd>
			</div>
		</dl>
	</Card>

	<div class="section">
		<div class="section-header">
			<h2 class="section-title">明細</h2>
		</div>
		<div class="table-container">
			<Table {columns} rows={data.details}>
				{#snippet empty()}
					<span>明細がありません</span>
				{/snippet}
			</Table>
		</div>
	</div>

	<div class="section danger-section">
		<div class="section-header">
			<h2 class="section-title">入荷伝票削除</h2>
		</div>
		<div class="danger-zone-body">
			<div class="danger-zone-item">
				<div class="danger-zone-item-info">
					<p class="danger-zone-item-label">この入荷伝票を削除する</p>
					<p class="danger-zone-item-desc">
						入荷伝票に紐づく全てのデータ（明細・在庫数）が完全に削除されます。この操作は取り消せません。
					</p>
				</div>
				<Button variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
					<Trash2 size={14} />
					入荷伝票を削除
				</Button>
			</div>
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="入荷伝票の削除"
	message="この入荷伝票を削除しますか？在庫数も変更されます。"
	confirmLabel="削除"
	cancelLabel="キャンセル"
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
