<script lang="ts">
	import { ClipboardList } from '@lucide/svelte';
	import { Button, Label, Modal, Table, Select, Pagination } from '$lib/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let stocktakeProductId = $state('');
	let stocktakeQuantity = $state(0);
	let page = $state(1);

	const ITEMS_PER_PAGE = 20;
	const pagedInventory = $derived(
		data.inventory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
	);

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);

	function openStocktake() {
		stocktakeProductId = '';
		stocktakeQuantity = 0;
		showModal = true;
	}

	const columns = [
		{ key: 'product_code', label: '商品コード', width: '160px' },
		{ key: 'product_name', label: '商品名' },
		{ key: 'quantity', label: '在庫数', width: '100px' },
		{ key: 'unit', label: '単位', width: '80px' },
		{ key: 'updated_at', label: '最終更新日', width: '160px' }
	];
</script>

<svelte:head>
	<title>在庫管理 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">在庫管理</h1>
		<div class="page-actions">
			<Button onclick={openStocktake}>
				<ClipboardList size={16} />
				棚卸登録
			</Button>
		</div>
	</div>

	<div class="table-with-pagination">
	<Table {columns} rows={pagedInventory}>
		{#snippet cell(col, value)}
			{#if col.key === 'quantity'}
				<span class="quantity">{value}</span>
			{:else}
				{value ?? ''}
			{/if}
		{/snippet}
		{#snippet empty()}
			<span>在庫データがありません</span>
		{/snippet}
	</Table>
	<Pagination
		totalItems={data.inventory.length}
		itemsPerPage={ITEMS_PER_PAGE}
		currentPage={page}
		onPageChange={(p) => (page = p)}
	/>
	</div>
</div>

<!-- Stocktake Modal -->
<Modal bind:open={showModal} title="棚卸登録" size="sm">
	<form method="POST" action="?/stocktake" class="form">
		<div class="field">
			<Label required>商品</Label>
			<Select
				name="product_id"
				options={productOptions}
				placeholder="商品を選択"
				bind:value={stocktakeProductId}
				required
			/>
		</div>
		<div class="field">
			<Label required>実数量</Label>
			<input
				class="number-input"
				type="number"
				name="quantity"
				min="0"
				bind:value={stocktakeQuantity}
				required
			/>
			<p class="field-hint">現在の実際の在庫数を入力してください</p>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				キャンセル
			</Button>
			<Button type="submit">登録</Button>
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

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
		}
	}

	.quantity {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
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
