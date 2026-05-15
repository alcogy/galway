<script lang="ts">
	import { Plus, Upload } from '@lucide/svelte';
	import { Button, Table, Pagination, SlipCsvImportDialog } from '$lib/components';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let page = $state(1);
	let showImportDialog = $state(false);
	let importNotification = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	const ITEMS_PER_PAGE = 20;
	const pagedSlips = $derived(
		data.slips.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
	);

	const columns = [
		{ key: 'slip_number', label: '伝票番号', width: '140px' },
		{ key: 'shipped_at', label: '出荷日', width: '120px' },
		{ key: 'customer_name', label: '出荷先', width: '160px' },
		{ key: 'item_count', label: '品目数', width: '80px', numeric: true },
		{ key: 'user_name', label: '担当者', width: '120px' }
	];
</script>

<svelte:head>
	<title>出荷管理 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">出荷管理</h1>
		<div class="page-actions">
			<Button variant="secondary" size="sm" onclick={() => (showImportDialog = true)}>
				<Upload size={14} />
				CSVインポート
			</Button>
			<Button size="sm" onclick={() => goto('/shipping/new')}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	{#if importNotification}
		<div class="notification" class:is-error={importNotification.type === 'error'}>
			{importNotification.message}
		</div>
	{/if}

	<div class="table-with-pagination">
		<Table {columns} rows={pagedSlips} onrowclick={(row) => goto(`/shipping/${row.id}`)}>
			{#snippet empty()}
				<span>出荷伝票が登録されていません</span>
			{/snippet}
		</Table>
		<Pagination
			totalItems={data.slips.length}
			itemsPerPage={ITEMS_PER_PAGE}
			currentPage={page}
			onPageChange={(p) => (page = p)}
		/>
	</div>
</div>

<SlipCsvImportDialog
	bind:open={showImportDialog}
	title="出荷伝票CSVインポート"
	dateLabel="出荷日"
	onimport={async (file, date) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('date', date);
		try {
			const res = await fetch('?/import', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData
			});
			const json = await res.json();
			if (json.type === 'success') {
				await invalidateAll();
				importNotification = { type: 'success', message: `${json.data?.count ?? ''}件の出荷伝票データをインポートしました` };
			} else {
				importNotification = { type: 'error', message: json.data?.error || 'インポートに失敗しました' };
			}
		} catch {
			importNotification = { type: 'error', message: 'インポートに失敗しました' };
		}
		setTimeout(() => { importNotification = null; }, 6000);
	}}
/>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
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

	.notification {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		background-color: var(--color-success-bg, #ecfdf5);
		color: var(--color-success, #059669);
		border: 1px solid var(--color-success-border, #6ee7b7);

		&.is-error {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
			border-color: var(--color-danger);
		}
	}

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
		}
	}
</style>
