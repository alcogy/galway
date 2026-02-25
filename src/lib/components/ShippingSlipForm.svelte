<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import Button from './Button.svelte';
	import Label from './Label.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import Textarea from './Textarea.svelte';

	interface DetailItem {
		product_id: string;
		quantity: number;
	}

	interface SlipData {
		id: string;
		shipped_at: string;
		account_id: string;
		note: string | null;
		details: DetailItem[];
	}

	interface Props {
		products: { id: string; code: string; name: string }[];
		accounts?: { id: string; name: string }[];
		isAdmin?: boolean;
		initialData?: SlipData;
		oncancel?: () => void;
	}

	let { products, accounts = [], isAdmin = false, initialData, oncancel }: Props = $props();

	const isEdit = $derived(!!initialData?.id);
	const action = $derived(isEdit ? '?/update' : '?/create');
	const submitLabel = $derived(isEdit ? '更新' : '登録');

	const productOptions = $derived(
		products.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))
	);
	const accountOptions = $derived(accounts.map((a) => ({ value: a.id, label: a.name })));

	let date = $state('');
	let accountId = $state('');
	let note = $state('');
	let details = $state<DetailItem[]>([]);

	$effect(() => {
		if (initialData) {
			date = initialData.shipped_at;
			accountId = initialData.account_id;
			note = initialData.note ?? '';
			details = initialData.details.map((d) => ({ product_id: d.product_id, quantity: d.quantity }));
		} else {
			date = new Date().toISOString().slice(0, 10);
			accountId = '';
			note = '';
			details = [{ product_id: '', quantity: 1 }];
		}
	});

	function addDetail() {
		details = [...details, { product_id: '', quantity: 1 }];
	}

	function removeDetail(index: number) {
		details = details.filter((_, i) => i !== index);
	}
</script>

<form method="POST" {action} class="form">
	{#if isEdit && initialData?.id}
		<input type="hidden" name="id" value={initialData.id} />
	{/if}
	<input type="hidden" name="details" value={JSON.stringify(details)} />

	<div class="field">
		<Label required>出荷日</Label>
		<input class="date-input" type="date" name="shipped_at" bind:value={date} required />
	</div>

	{#if isAdmin}
		<div class="field">
			<Label required>担当者</Label>
			<SearchableSelect
				name="account_id"
				options={accountOptions}
				placeholder="担当者を選択"
				bind:value={accountId}
			/>
		</div>
	{/if}

	<div class="field">
		<Label>備考</Label>
		<Textarea name="note" placeholder="備考欄" bind:value={note} />
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
						<input class="qty-input" type="number" min="1" bind:value={detail.quantity} required />
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
		<Button type="button" variant="secondary" onclick={oncancel}>キャンセル</Button>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>

<style lang="scss">
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
