<script lang="ts">
	import type { PageData } from './$types';
	import { t, getLocale } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	const totalQty = $derived(data.details.reduce((s, d) => s + d.quantity, 0));

	const localeStr = $derived(getLocale() === 'ja' ? 'ja-JP' : 'en-US');
</script>

<svelte:head>
	<title>{data.slip.slip_number} — {t('shipping.printPageTitle')}</title>
</svelte:head>

<div class="screen-toolbar">
	<button class="print-btn" onclick={() => window.print()}>
		{t('shipping.printButton')}
	</button>
</div>

<div class="print-page">
	<div class="doc-header">
		<h1 class="doc-title">{t('shipping.printDocTitle')}</h1>
		<div class="doc-meta">
			<span class="slip-number">{data.slip.slip_number}</span>
		</div>
	</div>

	<div class="info-section">
		<dl class="info-grid">
			<div class="info-item">
				<dt>{t('shipping.shippedAt')}</dt>
				<dd>{data.slip.shipped_at}</dd>
			</div>
			<div class="info-item">
				<dt>{t('shipping.customer')}</dt>
				<dd>{data.slip.customer_name || '—'}</dd>
			</div>
			<div class="info-item">
				<dt>{t('shipping.person')}</dt>
				<dd>{data.slip.user_name || '—'}</dd>
			</div>
			{#if data.slip.note}
				<div class="info-item full">
					<dt>{t('shipping.note')}</dt>
					<dd>{data.slip.note}</dd>
				</div>
			{/if}
		</dl>
	</div>

	<table class="items-table">
		<thead>
			<tr>
				<th class="col-no">No.</th>
				<th class="col-code">{t('shipping.productCode')}</th>
				<th class="col-name">{t('shipping.productName')}</th>
				<th class="col-qty">{t('shipping.quantity')}</th>
				<th class="col-unit">{t('shipping.unit')}</th>
				<th class="col-check">{t('shipping.colCheck')}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.details as d (d.line_no)}
				<tr>
					<td class="col-no">{d.line_no}</td>
					<td class="col-code">{d.product_code ?? ''}</td>
					<td class="col-name">{d.product_name ?? ''}</td>
					<td class="col-qty">{d.quantity.toLocaleString(localeStr)}</td>
					<td class="col-unit">{d.unit ?? ''}</td>
					<td class="col-check"></td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<td colspan="3" class="total-label">{t('shipping.total')}</td>
				<td class="col-qty total-qty">{totalQty.toLocaleString(localeStr)}</td>
				<td colspan="2"></td>
			</tr>
		</tfoot>
	</table>

	<div class="signature-section">
		<div class="sig-box">
			<span class="sig-label">{t('shipping.sigShipping')}</span>
			<div class="sig-area"></div>
		</div>
		<div class="sig-box">
			<span class="sig-label">{t('shipping.sigReceiving')}</span>
			<div class="sig-area"></div>
		</div>
	</div>

	<div class="footer">
		<span>{t('shipping.printedAt')} {new Date().toLocaleString(localeStr)}</span>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
		font-size: 12px;
		color: #000;
		background: #fff;
	}

	.screen-toolbar {
		display: none;
	}

	.print-page {
		width: 210mm;
		min-height: 297mm;
		margin: 0 auto;
		padding: 15mm 20mm;
		box-sizing: border-box;
	}

	.doc-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 8mm;
		border-bottom: 2px solid #000;
		padding-bottom: 4mm;
	}

	.doc-title {
		font-size: 22px;
		font-weight: 700;
		margin: 0;
		letter-spacing: 0.05em;
	}

	.slip-number {
		font-size: 13px;
		font-weight: 600;
		color: #333;
	}

	.info-section {
		margin-bottom: 8mm;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3mm 6mm;
		margin: 0;
		padding: 0;
	}

	.info-item {
		display: flex;
		gap: 2mm;

		&.full {
			grid-column: 1 / -1;
		}

		dt {
			font-weight: 600;
			white-space: nowrap;
			color: #555;
			min-width: 50px;

			&::after {
				content: ':';
			}
		}

		dd {
			margin: 0;
		}
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 8mm;
		font-size: 11px;
	}

	.items-table th,
	.items-table td {
		border: 1px solid #888;
		padding: 2mm 3mm;
	}

	.items-table thead {
		background-color: #eee;
		font-weight: 600;
	}

	.col-no {
		width: 30px;
		text-align: center;
	}

	.col-code {
		width: 90px;
	}

	.col-name {
		flex: 1;
	}

	.col-qty {
		width: 70px;
		text-align: right;
	}

	.col-unit {
		width: 60px;
		text-align: center;
	}

	.col-check {
		width: 50px;
	}

	.total-label {
		text-align: right;
		font-weight: 600;
		background-color: #f5f5f5;
	}

	.total-qty {
		font-weight: 700;
		background-color: #f5f5f5;
	}

	.signature-section {
		display: flex;
		gap: 10mm;
		margin-top: 10mm;
		margin-bottom: 8mm;
	}

	.sig-box {
		flex: 1;
		border: 1px solid #888;
	}

	.sig-label {
		display: block;
		padding: 2mm 3mm;
		font-size: 10px;
		font-weight: 600;
		background-color: #eee;
		border-bottom: 1px solid #888;
	}

	.sig-area {
		height: 20mm;
	}

	.footer {
		font-size: 9px;
		color: #666;
		text-align: right;
		border-top: 1px solid #ccc;
		padding-top: 2mm;
	}

	@media print {
		:global(body) {
			margin: 0;
		}

		.screen-toolbar {
			display: none !important;
		}

		.print-page {
			width: 100%;
			padding: 10mm 15mm;
		}

		:global(.sidebar),
		:global(.mobile-toggle) {
			display: none !important;
		}

		:global(.main-content) {
			margin-left: 0 !important;
			padding: 0 !important;
		}
	}

	@media screen {
		:global(body) {
			background: #f0f0f0;
		}

		:global(.sidebar),
		:global(.mobile-toggle) {
			display: none !important;
		}

		:global(.main-content) {
			margin-left: 0 !important;
			padding: 20px 0 !important;
		}

		.screen-toolbar {
			display: flex;
			justify-content: flex-end;
			width: 210mm;
			margin: 0 auto 8px;
			padding: 0 4px;
			box-sizing: border-box;
		}

		.print-btn {
			padding: 6px 20px;
			background-color: #1a73e8;
			color: #fff;
			border: none;
			border-radius: 4px;
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;

			&:hover {
				background-color: #1558b0;
			}
		}

		.print-page {
			background: #fff;
			box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
			margin: 0 auto;
		}
	}
</style>
