<script lang="ts">
	import { Upload } from '@lucide/svelte';
	import Button from './Button.svelte';
	import { t } from '$lib/i18n';
	import { parseCSV } from '$lib/utils/csv';

	interface DetailItem {
		product_id: string;
		quantity: number;
	}

	interface Props {
		products: { id: string; code: string; name: string }[];
		onimport: (details: DetailItem[]) => void;
	}

	let { products, onimport }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let errors = $state<string[]>([]);

	function openDialog() {
		errors = [];
		fileInput?.click();
	}

	async function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';

		const text = await file.text();
		const result = importFromCsv(text);

		if (result.errors.length > 0) {
			errors = result.errors;
		} else {
			errors = [];
			onimport(result.details);
		}
	}

	function importFromCsv(text: string): { details: DetailItem[]; errors: string[] } {
		const rows = parseCSV(text);
		if (rows.length === 0) return { details: [], errors: [t('slipForm.csvNoValidRows')] };

		// Detect if first row is a header (non-numeric in quantity column)
		const codeMap = new Map(products.map((p) => [p.code.trim(), p.id]));
		const errors: string[] = [];
		const details: DetailItem[] = [];

		// Skip header row if first row looks like a header
		const startRow = isHeaderRow(rows[0]) ? 1 : 0;

		for (let i = startRow; i < rows.length; i++) {
			const row = rows[i];
			if (row.length < 2) continue;

			const code = row[0]?.trim();
			const qtyStr = row[1]?.trim();

			if (!code && !qtyStr) continue; // blank row

			const qty = parseFloat(qtyStr ?? '');

			if (!code) continue;

			if (isNaN(qty) || qty <= 0) {
				errors.push(
					t('slipForm.csvInvalidQty')
						.replace('{row}', String(i + 1))
						.replace('{value}', qtyStr ?? '')
				);
				continue;
			}

			const productId = codeMap.get(code);
			if (!productId) {
				errors.push(t('slipForm.csvUnknownCode').replace('{code}', code));
				continue;
			}

			details.push({ product_id: productId, quantity: qty });
		}

		if (errors.length > 0) return { details: [], errors };
		if (details.length === 0) return { details: [], errors: [t('slipForm.csvNoValidRows')] };

		return { details, errors: [] };
	}

	function isHeaderRow(row: string[]): boolean {
		if (!row || row.length < 2) return false;
		const second = row[1]?.trim() ?? '';
		return isNaN(parseFloat(second));
	}
</script>

<div class="csv-import">
	<Button type="button" variant="ghost" size="sm" onclick={openDialog}>
		<Upload size={14} />
		{t('slipForm.importCsv')}
	</Button>
	<input
		bind:this={fileInput}
		type="file"
		accept=".csv,text/csv"
		class="hidden-input"
		onchange={handleFile}
	/>

	{#if errors.length > 0}
		<div class="error-block">
			<span class="error-title">{t('slipForm.csvImportError')}</span>
			<ul class="error-list">
				{#each errors as err}
					<li>{err}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style lang="scss">
	.csv-import {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.hidden-input {
		display: none;
	}

	.error-block {
		background-color: var(--color-danger-bg);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.error-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-danger);
	}

	.error-list {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.75rem;
		color: var(--color-danger);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
