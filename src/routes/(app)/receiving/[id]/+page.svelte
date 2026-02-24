<script lang="ts">
	import { ArrowLeft, Pencil, Trash2, Plus } from '@lucide/svelte';
	import { Button, Card, Label, Modal, ConfirmDialog, Table, Select } from '$lib/components';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let receivedAt = $state('');
	let supplierId = $state('');
	let editDetails = $state<{ product_id: string; quantity: number }[]>([]);

	const supplierOptions = $derived(
		data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	);

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);

	function openEdit() {
		receivedAt = data.slip.received_at;
		supplierId = data.slip.supplier_id;
		editDetails = data.details.map((d) => ({ product_id: d.product_id, quantity: d.quantity }));
		showModal = true;
	}

	function addDetail() {
		editDetails = [...editDetails, { product_id: '', quantity: 1 }];
	}

	function removeDetail(index: number) {
		editDetails = editDetails.filter((_, i) => i !== index);
	}

	async function handleDeleteSlip() {
		const formData = new FormData();
		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/receiving');
		}
	}

	const columns = [
		{ key: 'product_code', label: '商品コード', width: '160px' },
		{ key: 'product_name', label: '商品名' },
		{ key: 'quantity', label: '数量', width: '100px' },
		{ key: 'unit', label: '単位', width: '80px' }
	];
</script>

<svelte:head>
	<title>{data.slip.slip_number} — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/receiving" class="back-link">
			<ArrowLeft size={16} />
			入荷管理へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{data.slip.slip_number}</h1>
		<div class="page-actions">
			<Button variant="secondary" size="sm" onclick={openEdit}>
				<Pencil size={14} />
				編集
			</Button>			
		</div>
	</div>

	<Card title="伝票情報">
		<dl class="info-grid">
			<div class="info-item">
				<dt class="info-label">伝票番号</dt>
				<dd class="info-value">{data.slip.slip_number}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">入荷日</dt>
				<dd class="info-value">{data.slip.received_at}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">仕入先</dt>
				<dd class="info-value">{data.slip.supplier_name}</dd>
			</div>
			<div class="info-item">
				<dt class="info-label">品目数</dt>
				<dd class="info-value">{data.slip.item_count}</dd>
			</div>
		</dl>
	</Card>

	<div class="section">
		<div class="section-header">
			<h2 class="section-title">明細</h2>
		</div>
		<div class="table-container">
			<Table {columns} rows={data.details}>
				{#snippet empty()}
					<span>明細がありません</span>
				{/snippet}
			</Table>
		</div>
	</div>

	<!-- Danger Zone (Admin only) -->
	<!--{#if data.user?.role === 'admin'}-->
	<div class="section danger-section">
		<div class="section-header">
			<h2 class="section-title">入荷伝票削除</h2>
		</div>
		<div class="danger-zone-body">
			<div class="danger-zone-item">
				<div class="danger-zone-item-info">
					<p class="danger-zone-item-label">この入荷伝票を削除する</p>
					<p class="danger-zone-item-desc">
						入荷伝票に紐づく全てのデータ（明細・在庫数）が完全に削除されます。この操作は取り消せません。
					</p>
				</div>
				<Button variant="danger" size="sm" onclick={() => (showDeleteDialog = true)}>
					<Trash2 size={14} />
					入荷伝票を削除
				</Button>
			</div>
		</div>
	</div>
	<!--{/if}-->
</div>



<!-- Edit Modal -->
<Modal bind:open={showModal} title="入荷編集" size="lg">
	<form method="POST" action="?/update" class="form">
		<input type="hidden" name="id" value={data.slip.id} />
		<input type="hidden" name="details" value={JSON.stringify(editDetails)} />

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
				{#each editDetails as detail, i (i)}
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
							{#if editDetails.length > 1}
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
			<Button type="submit">更新</Button>
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
	onconfirm={handleDeleteSlip}
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
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
		margin: 0;

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.info-value {
		font-size: 0.9375rem;
		color: var(--color-text);
	}

	.detail-table-card {
		:global(.card-body) {
			padding: 0;
			overflow: hidden;
			border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		}

		:global(.table-wrapper) {
			border: none;
			border-radius: 0;
		}
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}

	.danger-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-light);
	}

	.danger-zone-body {
		padding: var(--space-xl);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
	}

	.danger-zone-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xl);
	}

	.danger-zone-item-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.danger-zone-item-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.danger-zone-item-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.table-container {
		:global(.table-wrapper) {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
		}
	}
</style>
