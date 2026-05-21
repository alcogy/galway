<script lang="ts">
	import { ArrowLeft, Plus, Trash2 } from '@lucide/svelte';
	import { Button, Card, DetailCsvImport, Label, SearchableSelect, Textarea } from '$lib/ui';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	const supplierOptions = $derived(data.suppliers.map((s) => ({ value: s.id, label: s.name })));
	const productOptions = $derived(data.products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` })));

	let supplierId = $state('');
	let orderedAt = $state('');
	let expectedAt = $state('');
	let note = $state('');
	let details = $state<{ product_id: string; quantity: number }[]>([]);

	$effect(() => {
		supplierId = data.order.supplier_id;
		orderedAt = data.order.ordered_at;
		expectedAt = data.order.expected_at ?? '';
		note = data.order.note;
		details = data.details.map((d) => ({ product_id: d.product_id, quantity: d.quantity }));
	});

	function addDetail() {
		details = [...details, { product_id: '', quantity: 1 }];
	}

	function removeDetail(i: number) {
		details = details.filter((_, idx) => idx !== i);
	}
</script>

<svelte:head>
	<title>{data.order.order_number} — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/purchasing/{data.order.id}" class="back-link">
			<ArrowLeft size={16} />
			{data.order.order_number}
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{t('common.edit')}</h1>
	</div>

	<Card title={t('purchasing.orderInfo')}>
		<form method="POST" action="?/update" class="form">
			<input type="hidden" name="details" value={JSON.stringify(details)} />

			<div class="form-grid">
				<div class="field">
					<Label required>{t('purchasing.supplier')}</Label>
					<SearchableSelect
						name="supplier_id"
						options={supplierOptions}
						placeholder={t('purchasing.selectSupplier')}
						bind:value={supplierId}
					/>
				</div>
				<div class="field">
					<Label required>{t('purchasing.orderedAt')}</Label>
					<input class="date-input" type="date" name="ordered_at" bind:value={orderedAt} required />
				</div>
				<div class="field">
					<Label>{t('purchasing.expectedAt')}</Label>
					<input class="date-input" type="date" name="expected_at" bind:value={expectedAt} />
				</div>
				<div class="field full">
					<Label>{t('purchasing.note')}</Label>
					<Textarea name="note" placeholder={t('purchasing.notesPlaceholder')} bind:value={note} />
				</div>
			</div>

			<div class="details-section">
				<div class="details-header">
					<span class="details-title">{t('purchasing.orderDetails')}</span>
					<div class="details-header-actions">
						<DetailCsvImport products={data.products} onimport={(rows) => (details = rows)} />
						<Button type="button" variant="secondary" size="sm" onclick={addDetail}>
							<Plus size={14} />
							{t('purchasing.addItem')}
						</Button>
					</div>
				</div>

				<div class="details-table">
					<div class="details-head">
						<span class="col-product">{t('purchasing.productName')}</span>
						<span class="col-qty">{t('purchasing.quantity')}</span>
						<span class="col-del"></span>
					</div>
					{#each details as detail, i (i)}
						<div class="details-row">
							<div class="col-product">
								<SearchableSelect
									options={productOptions}
									placeholder={t('purchasing.selectProduct')}
									bind:value={detail.product_id}
								/>
							</div>
							<div class="col-qty">
								<input class="qty-input" type="number" min="1" step="0.01" bind:value={detail.quantity} required />
							</div>
							<div class="col-del">
								{#if details.length > 1}
									<Button type="button" variant="ghost" size="sm" onclick={() => removeDetail(i)}>
										<Trash2 size={14} />
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="form-actions">
				<Button type="button" variant="secondary" onclick={() => goto(`/purchasing/${data.order.id}`)}>
					{t('common.cancel')}
				</Button>
				<Button type="submit">{t('common.update')}</Button>
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

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);

		@media (max-width: 640px) {
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
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.details-header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
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
		grid-template-columns: 1fr 110px 36px;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg-sunken);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.details-row {
		display: grid;
		grid-template-columns: 1fr 110px 36px;
		gap: var(--space-sm);
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--color-border-light);
	}

	.col-product {
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
