<script lang="ts">
	import { ArrowLeft, Plus, Trash2 } from '@lucide/svelte';
	import { Button, Card, Label, Select, SearchableSelect } from '$lib/components';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let receivedAt = $state(new Date().toISOString().slice(0, 10));
	let supplierId = $state('');
	let details = $state<{ product_id: string; quantity: number }[]>([{ product_id: '', quantity: 1 }]);

	const supplierOptions = $derived(
		data.suppliers.map((s) => ({ value: s.id, label: s.name }))
	);

	const productOptions = $derived(
		data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);

	function addDetail() {
		details = [...details, { product_id: '', quantity: 1 }];
	}

	function removeDetail(index: number) {
		details = details.filter((_, i) => i !== index);
	}
</script>

<svelte:head>
	<title>入荷登録 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/receiving" class="back-link">
			<ArrowLeft size={16} />
			入荷管理へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">入荷登録</h1>
	</div>

	<Card title="伝票情報">
		<form method="POST" action="?/create" class="form">
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
								<SearchableSelect
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
				<Button type="button" variant="secondary" onclick={() => goto('/receiving')}>
					キャンセル
				</Button>
				<Button type="submit">登録</Button>
			</div>
		</form>
	</Card>
</div>

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
		gap: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
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
</style>
