<script lang="ts">
	import { Plus, Pencil, Trash2, Download, Upload, Package } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, SearchBar, Pagination, CsvImportDialog } from '$lib/ui';
	import type { PageData } from './$types';
	import type { Supplier } from './+page.server';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let showImportDialog = $state(false);
	let showProductsModal = $state(false);
	let editing = $state<Supplier | null>(null);
	let deletingId = $state<string | null>(null);
	let managingProductsSupplierId = $state<string | null>(null);
	let managingProductsSupplierName = $state('');
	let selectedProductIds = $state<Set<string>>(new Set());

	function openManageProducts(supplier: Supplier) {
		managingProductsSupplierId = supplier.id;
		managingProductsSupplierName = supplier.name;
		const linked = data.supplierProductMap[supplier.id] ?? [];
		selectedProductIds = new Set(linked);
		showProductsModal = true;
	}

	async function saveProducts() {
		if (!managingProductsSupplierId) return;
		const fd = new FormData();
		fd.append('supplier_id', managingProductsSupplierId);
		for (const id of selectedProductIds) fd.append('product_ids', id);
		await fetch('?/setProducts', { method: 'POST', body: fd });
		await invalidateAll();
		showProductsModal = false;
	}
	let searchQuery = $state(page.url.searchParams.get('search') || '');
	let importNotification = $state<{ type: 'success' | 'error'; message: string } | null>(null);

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

	function getExportUrl() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		return `/suppliers/export?${params.toString()}`;
	}

	// Form state
	let name = $state('');
	let tel = $state('');
	let fax = $state('');
	let zipcode = $state('');
	let address = $state('');
	let email = $state('');

	function openCreate() {
		editing = null;
		name = '';
		tel = '';
		fax = '';
		zipcode = '';
		address = '';
		email = '';
		showModal = true;
	}

	function openEdit(supplier: Supplier) {
		editing = supplier;
		name = supplier.name;
		tel = supplier.tel ?? '';
		fax = supplier.fax ?? '';
		zipcode = supplier.zipcode ?? '';
		address = supplier.address ?? '';
		email = supplier.email ?? '';
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	const columns = $derived([
		{ key: 'name', label: t('suppliers.supplierName') },
		{ key: 'tel', label: t('common.phone'), width: '140px' },
		{ key: 'zipcode', label: t('common.zipcode'), width: '100px' },
		{ key: 'address', label: t('common.address') },
		{ key: 'email', label: t('common.email'), width: '200px' }
	]);
</script>

<svelte:head>
	<title>{t('suppliers.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('suppliers.title')}</h1>
		<div class="page-actions">
			<a href={getExportUrl()} download>
				<Button variant="secondary" size="sm">
					<Download size={14} />
					{t('common.csvDownload')}
				</Button>
			</a>
			<Button variant="secondary" size="sm" onclick={() => (showImportDialog = true)}>
				<Upload size={14} />
				{t('common.csvImport')}
			</Button>
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				{t('common.new')}
			</Button>
		</div>
	</div>

	<div class="filters">
		<SearchBar bind:value={searchQuery} placeholder={t('suppliers.searchPlaceholder')} onsubmit={handleSearch} />
	</div>

	<div class="table-with-pagination">
		<Table {columns} rows={data.suppliers}>
			{#snippet actions(row)}
				<div class="row-actions">
					<Button variant="ghost" size="sm" onclick={() => openManageProducts(row)} title={t('suppliers.manageProducts')}>
						<Package size={14} />
					</Button>
					<Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
						<Pencil size={14} />
					</Button>
					<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
						<Trash2 size={14} />
					</Button>
				</div>
			{/snippet}
			{#snippet empty()}
				<span>{t('suppliers.empty')}</span>
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

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? t('suppliers.editTitle') : t('suppliers.createTitle')} size="md">
	<form method="POST" action={editing ? '?/update' : '?/create'} class="form">
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		<div class="form-grid">
			<div class="field full">
				<Label required>{t('suppliers.supplierName')}</Label>
				<Input name="name" bind:value={name} required />
			</div>
			<div class="field">
				<Label>{t('common.phone')}</Label>
				<Input name="tel" bind:value={tel} placeholder="03-0000-0000" type="tel" />
			</div>
			<div class="field">
				<Label>{t('common.fax')}</Label>
				<Input name="fax" bind:value={fax} placeholder="03-0000-0001" type="tel" />
			</div>
			<div class="field">
				<Label>{t('common.zipcode')}</Label>
				<Input name="zipcode" bind:value={zipcode} placeholder="000-0000" />
			</div>
			<div class="field">
				<Label>{t('common.email')}</Label>
				<Input name="email" bind:value={email} placeholder="contact@example.com" type="email" />
			</div>
			<div class="field full">
				<Label>{t('common.address')}</Label>
				<Input name="address" bind:value={address} />
			</div>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button type="submit">{editing ? t('common.update') : t('common.register')}</Button>
		</div>
	</form>
</Modal>

<!-- Manage Products Modal -->
<Modal bind:open={showProductsModal} title="{t('suppliers.linkedProducts')}: {managingProductsSupplierName}" size="md">
	<div class="products-modal">
		<div class="products-list">
			{#each data.allProducts as product (product.id)}
				<label class="product-item">
					<input
						type="checkbox"
						checked={selectedProductIds.has(product.id)}
						onchange={(e) => {
							const next = new Set(selectedProductIds);
							if ((e.target as HTMLInputElement).checked) next.add(product.id);
							else next.delete(product.id);
							selectedProductIds = next;
						}}
					/>
					<span class="product-code">{product.code}</span>
					<span class="product-name">{product.name}</span>
					<span class="product-unit">{product.unit}</span>
				</label>
			{/each}
			{#if data.allProducts.length === 0}
				<p class="empty-note">{t('products.empty')}</p>
			{/if}
		</div>
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showProductsModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button onclick={saveProducts}>{t('common.save')}</Button>
		</div>
	</div>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('suppliers.deleteConfirm')}
	message={t('suppliers.deleteConfirm')}
	confirmLabel={t('common.delete')}
	cancelLabel={t('common.cancel')}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'id';
		input.value = deletingId ?? '';
		form.appendChild(input);
		document.body.appendChild(form);
		form.submit();
	}}
/>

<!-- CSV Import -->
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
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.row-actions {
		display: flex;
		gap: var(--space-xs);
		justify-content: flex-end;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&.full {
			grid-column: 1 / -1;
		}
	}

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}

	.products-modal {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.products-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-height: 360px;
		overflow-y: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
	}

	.product-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.875rem;

		&:hover {
			background-color: var(--color-bg-sunken);
		}
	}

	.product-code {
		font-family: monospace;
		color: var(--color-text-secondary);
		min-width: 80px;
	}

	.product-name {
		flex: 1;
	}

	.product-unit {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}

	.empty-note {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-lg);
	}

	.filters {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}
</style>
