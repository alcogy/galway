<script lang="ts">
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Label, Modal, ConfirmDialog, Table, Select, Pagination } from '$lib/components';
	import type { PageData } from './$types';
	import type { ReceivingSlip } from './+page.server';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let editing = $state<ReceivingSlip | null>(null);
	let deletingId = $state<string | null>(null);
	let page = $state(1);

	const ITEMS_PER_PAGE = 20;
	const pagedSlips = $derived(
		data.slips.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
	);

	// Form state
	let receivedAt = $state('');
	let supplierId = $state('');
	let details = $state<{ product_id: string; quantity: number }[]>([]);

	const supplierOptions = $derived(
		data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	);

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);

	function openCreate() {
		editing = null;
		receivedAt = new Date().toISOString().slice(0, 10);
		supplierId = '';
		details = [{ product_id: '', quantity: 1 }];
		showModal = true;
	}

	function openEdit(slip: ReceivingSlip) {
		editing = slip;
		receivedAt = slip.received_at;
		supplierId = slip.supplier_id;
		details = [{ product_id: '', quantity: 1 }];
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	function addDetail() {
		details = [...details, { product_id: '', quantity: 1 }];
	}

	function removeDetail(index: number) {
		details = details.filter((_, i) => i !== index);
	}

	const columns = [
		{ key: 'slip_number', label: '伝票番号', width: '140px' },
		{ key: 'received_at', label: '入荷日', width: '120px' },
		{ key: 'supplier_name', label: '仕入先' },
		{ key: 'item_count', label: '品目数', width: '80px' }
	];
</script>

<svelte:head>
	<title>入荷管理 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">入荷管理</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	<div class="table-with-pagination">
	<Table {columns} rows={pagedSlips}>
		{#snippet actions(row)}
			<div class="row-actions">
				<Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
					<Pencil size={14} />
					編集
				</Button>
				<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
					<Trash2 size={14} />
					削除
				</Button>
			</div>
		{/snippet}
		{#snippet empty()}
			<span>入荷伝票が登録されていません</span>
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

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? '入荷編集' : '入荷登録'} size="lg">
	<form method="POST" action={editing ? '?/update' : '?/create'} class="form">
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}
		<input type="hidden" name="details" value={JSON.stringify(details)} />

		<div class="form-row">
			<div class="field">
				<Label required>入荷日</Label>
				<input
					class="date-input"
					type="date"
					name="received_at"
					bind:value={receivedAt}
					required
				/>
			</div>
			<div class="field">
				<Label required>仕入先</Label>
				<Select
					name="supplier_id"
					options={supplierOptions}
					placeholder="仕入先を選択"
					bind:value={supplierId}
					required
				/>
			</div>
		</div>

		<div class="details-section">
			<div class="details-header">
				<span class="details-title">明細</span>
				<Button type="button" variant="secondary" size="sm" onclick={addDetail}>
					<Plus size={14} />
					行追加
				</Button>
			</div>

			<div class="details-table">
				<div class="details-head">
					<span class="col-product">商品</span>
					<span class="col-qty">数量</span>
					<span class="col-del"></span>
				</div>
				{#each details as detail, i (i)}
					<div class="details-row">
						<div class="col-product">
							<Select
								options={productOptions}
								placeholder="商品を選択"
								bind:value={detail.product_id}
							/>
						</div>
						<div class="col-qty">
							<input
								class="qty-input"
								type="number"
								min="1"
								bind:value={detail.quantity}
								required
							/>
						</div>
						<div class="col-del">
							{#if details.length > 1}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removeDetail(i)}
									aria-label="行を削除"
								>
									<Trash2 size={14} />
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				キャンセル
			</Button>
			<Button type="submit">{editing ? '更新' : '登録'}</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title="入荷伝票の削除"
	message="この入荷伝票を削除しますか？在庫数も変更されます。"
	confirmLabel="削除"
	cancelLabel="キャンセル"
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

	.form-row {
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
	}

	.date-input {
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

	.details-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.details-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.details-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.details-table {
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.details-head {
		display: grid;
		grid-template-columns: 1fr 100px 36px;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg-sunken);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.details-row {
		display: grid;
		grid-template-columns: 1fr 100px 36px;
		gap: var(--space-sm);
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--color-border-light);
	}

	.col-product {
		min-width: 0;
	}

	.col-qty {
		min-width: 0;
	}

	.col-del {
		display: flex;
		justify-content: center;
	}

	.qty-input {
		width: 100%;
		height: 36px;
		padding: 0 var(--space-sm);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		text-align: right;

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
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
</style>
