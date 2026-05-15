<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const maxReceiving = $derived(Math.max(...data.receivingByMonth.map((m) => m.value), 1));
	const maxShipping = $derived(Math.max(...data.shippingByMonth.map((m) => m.value), 1));
	const maxTopQty = $derived(Math.max(...data.topProducts.map((p) => p.total_shipped), 1));
	const maxSlipCount = $derived(Math.max(...data.supplierRanking.map((s) => Number(s.slip_count)), 1));
</script>

<svelte:head>
	<title>レポート — Galway</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">レポート・分析</h1>

	<div class="charts-grid">
		<!-- 入荷推移 -->
		<div class="chart-card">
			<h2 class="chart-title">月別入荷数量（直近6ヶ月）</h2>
			<div class="bar-chart">
				{#each data.receivingByMonth as m (m.label)}
					<div class="bar-col">
						<span class="bar-value">{m.value.toLocaleString('ja-JP')}</span>
						<div class="bar-wrap">
							<div class="bar bar-receiving" style:height="{(m.value / maxReceiving) * 100}%"></div>
						</div>
						<span class="bar-label">{m.label.slice(-3)}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- 出荷推移 -->
		<div class="chart-card">
			<h2 class="chart-title">月別出荷数量（直近6ヶ月）</h2>
			<div class="bar-chart">
				{#each data.shippingByMonth as m (m.label)}
					<div class="bar-col">
						<span class="bar-value">{m.value.toLocaleString('ja-JP')}</span>
						<div class="bar-wrap">
							<div class="bar bar-shipping" style:height="{(m.value / maxShipping) * 100}%"></div>
						</div>
						<span class="bar-label">{m.label.slice(-3)}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="tables-grid">
		<!-- 出荷数量トップ商品 -->
		<div class="rank-card">
			<h2 class="chart-title">出荷数量トップ商品</h2>
			{#if data.topProducts.length === 0}
				<p class="empty-text">データがありません</p>
			{:else}
				<div class="rank-list">
					{#each data.topProducts as p, i (p.product_code)}
						<div class="rank-item">
							<span class="rank-no">{i + 1}</span>
							<div class="rank-info">
								<span class="rank-name">{p.product_name}</span>
								<span class="rank-code">{p.product_code}</span>
							</div>
							<div class="rank-bar-wrap">
								<div class="rank-bar rank-bar-shipping" style:width="{(p.total_shipped / maxTopQty) * 100}%"></div>
							</div>
							<span class="rank-value">{p.total_shipped.toLocaleString('ja-JP')} {p.unit}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- 仕入先別入荷件数 -->
		<div class="rank-card">
			<h2 class="chart-title">仕入先別入荷件数</h2>
			{#if data.supplierRanking.length === 0}
				<p class="empty-text">データがありません</p>
			{:else}
				<div class="rank-list">
					{#each data.supplierRanking as s, i (s.supplier_name)}
						<div class="rank-item">
							<span class="rank-no">{i + 1}</span>
							<div class="rank-info">
								<span class="rank-name">{s.supplier_name}</span>
							</div>
							<div class="rank-bar-wrap">
								<div class="rank-bar rank-bar-receiving" style:width="{(Number(s.slip_count) / maxSlipCount) * 100}%"></div>
							</div>
							<span class="rank-value">{s.slip_count} 件</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}

	.tables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}

	.chart-card,
	.rank-card {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
	}

	.chart-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-bottom: var(--space-lg);
	}

	/* Bar chart */
	.bar-chart {
		display: flex;
		align-items: flex-end;
		gap: var(--space-sm);
		height: 180px;
		padding-top: var(--space-xl);
	}

	.bar-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		height: 100%;
	}

	.bar-value {
		font-size: 0.625rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.bar-wrap {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
	}

	.bar {
		width: 100%;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		min-height: 4px;
		transition: height 0.3s ease;

		&.bar-receiving {
			background-color: var(--color-primary);
		}

		&.bar-shipping {
			background-color: var(--color-warning, #f59e0b);
		}
	}

	.bar-label {
		font-size: 0.625rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	/* Rank list */
	.rank-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.rank-item {
		display: grid;
		grid-template-columns: 24px 1fr 100px 80px;
		align-items: center;
		gap: var(--space-sm);
	}

	.rank-no {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.rank-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.rank-name {
		font-size: 0.8125rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rank-code {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
	}

	.rank-bar-wrap {
		height: 8px;
		background-color: var(--color-bg-sunken);
		border-radius: 4px;
		overflow: hidden;
	}

	.rank-bar {
		height: 100%;
		border-radius: 4px;
		min-width: 4px;

		&.rank-bar-shipping {
			background-color: var(--color-warning, #f59e0b);
		}

		&.rank-bar-receiving {
			background-color: var(--color-primary);
		}
	}

	.rank-value {
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.empty-text {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
	}
</style>
