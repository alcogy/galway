<script lang="ts">
	import { Plus, Upload } from '@lucide/svelte';
	import { Button, Table, Pagination, SlipCsvImportDialog, SearchBar } from '$lib/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';
	let { data }: { data: PageData } = $props();

	let showImportDialog = $state(false);
	let importNotification = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let searchQuery = $state(page.url.searchParams.get('search') || '');

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handlePageChange(newPage: number) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	const columns = $derived([
		{ key: 'slip_number', label: t('receiving.slipNumber'), width: '180px' },
		{ key: 'supplier_name', label: t('receiving.supplier') },
		{ key: 'received_at', label: t('receiving.receivedAt'), width: '120px' },
		{ key: 'item_count', label: t('receiving.itemCount'), width: '80px', numeric: true },
		{ key: 'user_name', label: t('receiving.person'), width: '120px' }
	]);
</script>

<svelte:head>
	<title>{t('receiving.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('receiving.title')}</h1>
		<div class="page-actions">
			<Button variant="secondary" size="sm" onclick={() => (showImportDialog = true)}>
				<Upload size={14} />
				{t('common.csvImport')}
			</Button>
			<Button size="sm" onclick={() => goto('/receiving/new')}>
				<Plus size={16} />
				{t('receiving.newSlip')}
			</Button>
		</div>
	</div>

	<div class="filters">
		<SearchBar bind:value={searchQuery} onsubmit={handleSearch} />
	</div>

	{#if importNotification}
		<div class="notification" class:is-error={importNotification.type === 'error'}>
			{importNotification.message}
		</div>
	{/if}

	<div class="table-with-pagination">
		<Table {columns} rows={data.slips} onrowclick={(row) => goto(`/receiving/${row.id}`)}>
			{#snippet empty()}
				<span>{t('receiving.empty')}</span>
			{/snippet}
		</Table>
		<Pagination
			totalItems={data.totalItems}
			itemsPerPage={data.itemsPerPage}
			currentPage={data.currentPage}
			onPageChange={handlePageChange}
		/>
	</div>
</div>

<SlipCsvImportDialog
	bind:open={showImportDialog}
	title={t('receiving.importTitle')}
	dateLabel={t('receiving.receivedAt')}
	suppliers={data.suppliers}
	onimport={async (file, date, supplierId) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('date', date);
		if (supplierId) formData.append('supplier_id', supplierId);
		try {
			const res = await fetch('?/import', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: formData
			});
			const json = await res.json() as any;
			if (json.type === 'success') {
				await invalidateAll();
				importNotification = { type: 'success', message: `${json.data?.count ?? ''} ${t('common.items')} imported` };
			} else {
				importNotification = { type: 'error', message: json.data?.error || t('common.error') };
			}
		} catch {
			importNotification = { type: 'error', message: t('common.error') };
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

	.filters {
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
