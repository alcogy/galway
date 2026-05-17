<script lang="ts">
	import { ClipboardList, Upload, Download, AlertTriangle } from '@lucide/svelte';
	import { Button, Label, Modal, Table, Select, SearchBar, SearchableSelect, Pagination, CsvImportDialog } from '$lib/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showImportDialog = $state(false);
	let importNotification = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let stocktakeProductId = $state('');
	let stocktakeQuantity = $state(0);
	let searchQuery = $state(page.url.searchParams.get('search') || '');
	let supplierFilter = $state(page.url.searchParams.get('supplier') || '');

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);

	const supplierOptions = $derived([
		{ value: '', label: t('inventory.allSuppliers') },
		...data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	]);

	function openStocktake() {
		stocktakeProductId = '';
		stocktakeQuantity = 0;
		showModal = true;
	}

	function buildParams(page: number) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (supplierFilter) params.set('supplier', supplierFilter);
		params.set('page', String(page));
		return params;
	}

	function handleSearch() {
		goto(`?${buildParams(1).toString()}`, { keepFocus: true });
	}

	function handleSupplierChange(val: string) {
		supplierFilter = val;
		goto(`?${buildParams(1).toString()}`, { keepFocus: true });
	}

	function handlePageChange(newPage: number) {
		goto(`?${buildParams(newPage).toString()}`, { keepFocus: true });
	}

	function getExportUrl() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (supplierFilter) params.set('supplier', supplierFilter);
		return `/inventory/export?${params.toString()}`;
	}

	const columns = $derived([
		{ key: 'product_code', label: t('inventory.productCode'), width: '160px' },
		{ key: 'product_name', label: t('inventory.productName') },
		{ key: 'quantity', label: t('inventory.quantity'), width: '100px', numeric: true },
		{ key: 'unit', label: t('inventory.unit'), width: '80px' },
		{ key: 'updated_at', label: t('inventory.lastUpdated'), width: '150px' }
	]);

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		const d = new Date(iso);
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${y}/${mo}/${day} ${h}:${min}`;
	}
</script>

<svelte:head>
	<title>{t('inventory.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('inventory.title')}</h1>
		<div class="page-actions">
			<a href={getExportUrl()} class="btn-download" download>
				<Download size={14} />
				{t('common.csvDownload')}
			</a>
			<Button variant="secondary" size="sm" onclick={() => (showImportDialog = true)}>
				<Upload size={14} />
				{t('common.csvImport')}
			</Button>
			<Button size="sm" onclick={openStocktake}>
				<ClipboardList size={16} />
				{t('inventory.stocktake')}
			</Button>
		</div>
	</div>

	{#if importNotification}
		<div class="notification" class:is-error={importNotification.type === 'error'}>
			{importNotification.message}
		</div>
	{/if}

	<div class="filters">
		<SearchBar bind:value={searchQuery} placeholder={t('inventory.searchPlaceholder')} onsubmit={handleSearch} />
		<div class="supplier-filter">
			<SearchableSelect
				options={supplierOptions}
				bind:value={supplierFilter}
				placeholder={t('inventory.allSuppliers')}
				onchange={handleSupplierChange}
			/>
		</div>
	</div>

	<div class="table-with-pagination">
		<Table {columns} rows={data.inventory}>
			{#snippet row(item)}
				{@const isLow = item.min_quantity > 0 && item.quantity < item.min_quantity}
				<tr class:low-stock={isLow}>
					<td>{item.product_code}</td>
					<td>{item.product_name}</td>
					<td class="num" class:qty-low={isLow}>
						<span class="qty-cell">
							{item.quantity.toLocaleString()}
							{#if isLow}
								<span class="low-badge" title="{t('inventory.lowStock')}: {item.min_quantity.toLocaleString()}">
									<AlertTriangle size={12} />
								</span>
							{/if}
						</span>
					</td>
					<td>{item.unit}</td>
					<td>{formatDate(item.updated_at)}</td>
				</tr>
			{/snippet}
			{#snippet empty()}
				<span>{t('inventory.empty')}</span>
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

<CsvImportDialog
	bind:open={showImportDialog}
	onimport={async (file, mode) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('mode', mode);
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

<!-- Stocktake Modal -->
<Modal bind:open={showModal} title={t('inventory.stocktakeTitle')} size="sm">
	<form method="POST" action="?/stocktake" class="form">
		<div class="field">
			<Label required>{t('inventory.product')}</Label>
			<Select
				name="product_id"
				options={productOptions}
				placeholder={t('purchasing.selectProduct')}
				bind:value={stocktakeProductId}
				required
			/>
		</div>
		<div class="field">
			<Label required>{t('inventory.stocktakeQty')}</Label>
			<input
				class="number-input"
				type="number"
				name="quantity"
				min="0"
				bind:value={stocktakeQuantity}
				required
			/>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button type="submit">{t('common.register')}</Button>
		</div>
	</form>
</Modal>

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
		cursor: pointer;
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

	.filters {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.supplier-filter {
		width: 220px;
		flex-shrink: 0;
	}

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
		}

		/* row スニペット使用時は Table.svelte のスコープ付き td スタイルが当たらないため補完 */
		:global(tbody tr td) {
			padding: var(--space-md) var(--space-lg);
			color: var(--color-text);
			font-size: 0.8125rem;
		}

		:global(tbody tr:not(:last-child) td) {
			border-bottom: 1px solid var(--color-border-light);
		}

		:global(tr.low-stock) {
			background-color: color-mix(in srgb, var(--color-danger, #f97316) 6%, transparent) !important;
		}

		:global(td.num) {
			text-align: right;
			font-variant-numeric: tabular-nums;
		}

		:global(.qty-cell) {
			display: inline-flex;
			align-items: center;
			gap: var(--space-xs);
			justify-content: flex-end;
			width: 100%;
		}

		:global(.qty-low) {
			color: var(--color-danger, #f97316);
			font-weight: 600;
		}

		:global(.low-badge) {
			color: var(--color-danger, #f97316);
			display: inline-flex;
			align-items: center;
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.number-input {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
