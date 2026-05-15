<script lang="ts">
	import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Card, ConfirmDialog, Table } from '$lib/components';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showDeleteDialog = $state(false);
	let updatingStatus = $state(false);

	const STATUS_LABELS: Record<string, string> = {
		draft: '下書き',
		ordered: '発注済',
		received: '入荷済',
		cancelled: 'キャンセル',
	};

	const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
		draft: [{ label: '発注確定', next: 'ordered' }, { label: 'キャンセル', next: 'cancelled' }],
		ordered: [{ label: '入荷済にする', next: 'received' }, { label: 'キャンセル', next: 'cancelled' }],
		received: [],
		cancelled: [{ label: '下書きに戻す', next: 'draft' }],
	};

	const transitions = $derived(STATUS_TRANSITIONS[data.order.status] ?? []);

	async function changeStatus(next: string) {
		updatingStatus = true;
		const fd = new FormData();
		fd.append('status', next);
		await fetch('?/updateStatus', { method: 'POST', body: fd });
		await invalidateAll();
		updatingStatus = false;
	}

	const columns = [
		{ key: 'product_code', label: '商品コード', width: '160px' },
		{ key: 'product_name', label: '商品名' },
		{ key: 'quantity', label: '数量', width: '100px', numeric: true },
		{ key: 'unit', label: '単位', width: '80px' },
	];
</script>

<svelte:head>
	<title>{data.order.order_number} — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/purchasing" class="back-link">
			<ArrowLeft size={16} />
			発注管理へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{data.order.order_number}</h1>
		<div class="page-actions">
			{#each transitions as t (t.next)}
				<Button
					variant="secondary"
					size="sm"
					disabled={updatingStatus}
					onclick={() => changeStatus(t.next)}
				>
					{t.label}
				</Button>
			{/each}
			{#if data.order.status === 'draft'}
				<Button variant="secondary" size="sm" onclick={() => goto(`/purchasing/${data.order.id}/edit`)}>
					<Pencil size={14} />
					編集
				</Button>
			{/if}
		</div>
	</div>

	<Card title="発注情報">
		<dl class="info-grid">
			<div class="info-item">
				<dt class="info-label">発注番号</dt>
				<dd class="info-value">{data.order.order_number}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">ステータス</dt>
				<dd class="info-value">
					<span class="status-badge status-{data.order.status}">
						{STATUS_LABELS[data.order.status]}
					</span>
				</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">仕入先</dt>
				<dd class="info-value">{data.order.supplier_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">発注日</dt>
				<dd class="info-value">{data.order.ordered_at}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">入荷予定日</dt>
				<dd class="info-value">{data.order.expected_at ?? '—'}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">担当者</dt>
				<dd class="info-value">{data.order.user_name ?? '—'}</dd>
			</div>
			{#if data.order.note}
				<div class="info-item full">
					<dt class="info-label">備考</dt>
					<dd class="info-value">{data.order.note}</dd>
				</div>
			{/if}
		</dl>
	</Card>

	<section>
		<h2 class="section-title">発注明細</h2>
		<Table {columns} rows={data.details}>
			{#snippet empty()}
				<span>明細がありません</span>
			{/snippet}
		</Table>
	</section>

	{#if data.order.status === 'draft' || data.order.status === 'cancelled'}
		<section class="danger-zone">
			<h2 class="danger-title">削除</h2>
			<p class="danger-desc">この発注を削除します。この操作は取り消せません。</p>
			<Button variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
				<Trash2 size={14} />
				発注を削除
			</Button>
		</section>
	{/if}
</div>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="発注の削除"
	message="この発注を削除しますか？"
	confirmLabel="削除"
	cancelLabel="キャンセル"
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
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
