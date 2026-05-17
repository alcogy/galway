<script lang="ts">
	import { Plus, Pencil, Trash2, Download, Upload } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, SearchBar, Textarea, Pagination, CsvImportDialog, Select } from '$lib/ui';
	import type { PageData } from './$types';
	import type { Product } from './+page.server';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let showImportDialog = $state(false);
	let editing = $state<Product | null>(null);
	let deletingId = $state<string | null>(null);
	let searchQuery = $state(page.url.searchParams.get('search') || '');
	let categoryFilter = $state(page.url.searchParams.get('category') || '');
	let importNotification = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	const categoryOptions = $derived([
		{ value: '', label: t('products.allCategories') },
		...data.categories.map((c) => ({ value: c.id, label: c.name })),
	]);

	function buildParams(p: number) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (categoryFilter) params.set('category', categoryFilter);
		params.set('page', String(p));
		return params;
	}

	function handleSearch() {
		goto(`?${buildParams(1).toString()}`, { keepFocus: true });
	}

	function handleCategoryChange() {
		goto(`?${buildParams(1).toString()}`, { keepFocus: true });
	}

	function handlePageChange(newPage: number) {
		goto(`?${buildParams(newPage).toString()}`, { keepFocus: true });
	}

	function getExportUrl() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (categoryFilter) params.set('category', categoryFilter);
		return `/products/export?${params.toString()}`;
	}

	// Form state
	let code = $state('');
	let name = $state('');
	let unit = $state('');
	let description = $state('');
	let minQuantity = $state('0');
	let selectedCategoryId = $state('');

	function openCreate() {
		editing = null;
		code = '';
		name = '';
		unit = '';
		description = '';
		minQuantity = '0';
		selectedCategoryId = '';
		showModal = true;
	}

	function openEdit(product: Product) {
		editing = product;
		code = product.code;
		name = product.name;
		unit = product.unit;
		description = product.description ?? '';
		minQuantity = String(product.min_quantity);
		selectedCategoryId = product.category_id ?? '';
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	const columns = $derived([
		{ key: 'code', label: t('products.productCode'), width: '160px' },
		{ key: 'name', label: t('products.productName') },
		{ key: 'category_name', label: t('products.category'), width: '140px' },
		{ key: 'unit', label: t('products.unit'), width: '80px' },
		{ key: 'description', label: t('products.description') },
	]);
</script>

<svelte:head>
	<title>{t('products.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('products.title')}</h1>
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
		<SearchBar bind:value={searchQuery} placeholder={t('products.searchPlaceholder')} onsubmit={handleSearch} />
		<div class="category-filter">
			<Select options={categoryOptions} bind:value={categoryFilter} onchange={handleCategoryChange} />
		</div>

	</div>

	<div class="table-with-pagination">
		<Table {columns} rows={data.products}>
			{#snippet actions(row)}
				<div class="row-actions">
					<Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
						<Pencil size={14} />
					</Button>
					<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
						<Trash2 size={14} />
					</Button>
				</div>
			{/snippet}
			{#snippet empty()}
				<span>{t('products.empty')}</span>
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
<Modal bind:open={showModal} title={editing ? t('products.editTitle') : t('products.createTitle')} size="md">
	<form method="POST" action={editing ? '?/update' : '?/create'} class="form">
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		<div class="form-grid">
			<div class="field">
				<Label required>{t('products.productCode')}</Label>
				<Input name="code" bind:value={code} placeholder="PRD001" required />
			</div>
			<div class="field">
				<Label required>{t('products.productName')}</Label>
				<Input name="name" bind:value={name} required />
			</div>
			<div class="field">
				<Label required>{t('products.unit')}</Label>
				<Input name="unit" bind:value={unit} required />
			</div>
			<div class="field">
				<Label>{t('products.category')}</Label>
				<Select
					name="category_id"
					options={[{ value: '', label: t('products.allCategories') }, ...data.categories.map((c) => ({ value: c.id, label: c.name }))]}
					bind:value={selectedCategoryId}
				/>
			</div>
			<div class="field">
				<Label>{t('products.minQuantity')}</Label>
				<Input name="min_quantity" type="number" bind:value={minQuantity} min="0" step="0.01" placeholder="0" />
			</div>
			<div class="field full">
				<Label>{t('products.description')}</Label>
				<Textarea name="description" bind:value={description} rows={3} />
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

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('products.deleteConfirm')}
	message={t('products.deleteConfirm')}
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
		grid-template-columns: 1fr;
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

	.filters {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;

		.category-filter {
			width: 180px;
			flex-shrink: 0;
		}
	}
</style>
