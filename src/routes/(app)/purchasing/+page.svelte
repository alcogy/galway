<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button, Table, Pagination } from '$lib/ui';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let currentPage = $state(1);
	const ITEMS_PER_PAGE = 20;
	const pagedOrders = $derived(
		data.orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
	);

	const STATUS_LABELS = $derived<Record<string, string>>({
		draft: t('purchasing.statusDraft'),
		ordered: t('purchasing.statusOrdered'),
		received: t('purchasing.statusReceived'),
		cancelled: t('purchasing.statusCancelled'),
	});

	const columns = $derived([
		{ key: 'order_number', label: t('purchasing.orderNumber'), width: '150px' },
		{ key: 'ordered_at', label: t('purchasing.orderedAt'), width: '110px' },
		{ key: 'expected_at', label: t('purchasing.expectedAt'), width: '120px' },
		{ key: 'supplier_name', label: t('purchasing.supplier') },
		{ key: 'item_count', label: t('purchasing.itemCount'), width: '80px', numeric: true },
		{ key: 'status', label: t('purchasing.status'), width: '110px' },
		{ key: 'user_name', label: t('purchasing.person'), width: '110px' },
	]);
</script>

<svelte:head>
	<title>{t('purchasing.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('purchasing.title')}</h1>
		<div class="page-actions">
			<Button size="sm" onclick={() => goto('/purchasing/new')}>
				<Plus size={16} />
				{t('purchasing.newOrder')}
			</Button>
		</div>
	</div>

	<div class="table-with-pagination">
		<Table {columns} rows={pagedOrders} onrowclick={(row) => goto(`/purchasing/${row.id}`)}>
			{#snippet cell(col, value)}
				{#if col.key === 'status'}
					<span class="status-badge status-{value}">{STATUS_LABELS[value as string] ?? value}</span>
				{:else if col.key === 'expected_at'}
					{(value as string | null) ?? '—'}
				{:else}
					{value}
				{/if}
			{/snippet}
			{#snippet empty()}
				<span>{t('purchasing.empty')}</span>
			{/snippet}
		</Table>
		<Pagination
			totalItems={data.orders.length}
			itemsPerPage={ITEMS_PER_PAGE}
			currentPage={currentPage}
			onPageChange={(p) => (currentPage = p)}
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
</style>
