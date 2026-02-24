<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button, Table, Pagination } from '$lib/components';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let page = $state(1);

	const ITEMS_PER_PAGE = 20;
	const pagedSlips = $derived(
		data.slips.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
	);

	const columns = [
		{ key: 'slip_number', label: '伝票番号', width: '140px' },
		{ key: 'shipped_at', label: '出荷日', width: '120px' },
		{ key: 'item_count', label: '品目数', width: '80px' }
	];
</script>

<svelte:head>
	<title>出荷管理 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">出荷管理</h1>
		<div class="page-actions">
			<Button size="sm" onclick={() => goto('/shipping/new')}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

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

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
		}
	}
</style>
