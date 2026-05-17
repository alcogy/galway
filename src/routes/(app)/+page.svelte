<script lang="ts">
	import { Building2, Package, PackageCheck, Truck, AlertTriangle, PackageCheck as InIcon, Truck as OutIcon } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ label: t('dashboard.suppliers'), value: data.supplierCount, icon: Building2, color: 'blue' },
		{ label: t('dashboard.products'), value: data.productCount, icon: Package, color: 'green' },
		{ label: t('dashboard.receivingThisMonth'), value: data.receivingCountThisMonth, icon: PackageCheck, color: 'orange' },
		{ label: t('dashboard.shippingThisMonth'), value: data.shippingCountThisMonth, icon: Truck, color: 'gray' }
	]);
</script>

<svelte:head>
	<title>{t('dashboard.pageTitle')}</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">{t('dashboard.title')}</h1>

	<div class="stats-grid">
		{#each stats as stat (stat.label)}
			<div class="stat-card">
				<div class="stat-icon {stat.color}">
					<stat.icon size={20} />
				</div>
				<div class="stat-info">
					<span class="stat-value">{stat.value}</span>
					<span class="stat-label">{stat.label}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Today's schedules -->
	<div class="today-grid">
		<!-- Today's receiving -->
		<div class="today-section">
			<div class="today-header receiving">
				<InIcon size={16} />
				<h2 class="today-title">{t('dashboard.todayReceiving')}</h2>
				<span class="today-count">{data.todayReceiving.length}{t('common.items')}</span>
			</div>
			{#if data.todayReceiving.length === 0}
				<p class="today-empty">{t('dashboard.noTodayReceiving')}</p>
			{:else}
				<table class="today-table">
					<thead>
						<tr>
							<th>{t('dashboard.orderNumber')}</th>
							<th>{t('dashboard.supplier')}</th>
							<th>{t('dashboard.product')}</th>
							<th class="num">{t('common.quantity')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.todayReceiving as item}
							<tr>
								<td><a href="/purchasing">{item.order_number}</a></td>
								<td>{item.supplier_name}</td>
								<td class="product-cell">
									<span class="product-code">{item.product_code}</span>
									{item.product_name}
								</td>
								<td class="num">{item.quantity.toLocaleString()} {item.unit}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Today's shipping -->
		<div class="today-section">
			<div class="today-header shipping">
				<OutIcon size={16} />
				<h2 class="today-title">{t('dashboard.todayShipping')}</h2>
				<span class="today-count">{data.todayShipping.length}{t('common.items')}</span>
			</div>
			{#if data.todayShipping.length === 0}
				<p class="today-empty">{t('dashboard.noTodayShipping')}</p>
			{:else}
				<table class="today-table">
					<thead>
						<tr>
							<th>{t('dashboard.slipNumber')}</th>
							<th>{t('dashboard.customer')}</th>
							<th>{t('dashboard.product')}</th>
							<th class="num">{t('common.quantity')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.todayShipping as item}
							<tr>
								<td><a href="/shipping">{item.slip_number}</a></td>
								<td>{item.customer_name ?? '—'}</td>
								<td class="product-cell">
									<span class="product-code">{item.product_code}</span>
									{item.product_name}
								</td>
								<td class="num">{item.quantity.toLocaleString()} {item.unit}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<!-- Low stock alert -->
	{#if data.lowStockItems.length > 0}
		<div class="low-stock-section">
			<div class="low-stock-header">
				<AlertTriangle size={18} />
				<h2 class="low-stock-title">{t('dashboard.lowStockAlert')}（{data.lowStockItems.length}{t('common.items')}）</h2>
			</div>
			<div class="low-stock-table-wrap">
				<table class="low-stock-table">
					<thead>
						<tr>
							<th>{t('dashboard.productCode')}</th>
							<th>{t('dashboard.productName')}</th>
							<th class="num">{t('dashboard.currentStock')}</th>
							<th class="num">{t('dashboard.minStock')}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.lowStockItems as item (item.product_code)}
							<tr>
								<td><a href="/inventory?search={item.product_code}">{item.product_code}</a></td>
								<td>{item.product_name}</td>
								<td class="num low">{Number(item.quantity).toLocaleString()} {item.unit}</td>
								<td class="num">{Number(item.min_quantity).toLocaleString()} {item.unit}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-xl);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-lg);
		flex-shrink: 0;

		&.blue   { background-color: var(--color-primary-light);  color: var(--color-primary); }
		&.green  { background-color: var(--color-success-light);  color: var(--color-success); }
		&.orange { background-color: var(--color-warning-light);  color: var(--color-warning); }
		&.gray   { background-color: var(--color-bg-sunken);      color: var(--color-text-secondary); }
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.today-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}

	.today-section {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.today-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-xl);
		border-bottom: 1px solid var(--color-border-light);

		&.receiving {
			background-color: var(--color-primary-light);
			color: var(--color-primary);
		}

		&.shipping {
			background-color: var(--color-warning-light);
			color: var(--color-warning);
		}
	}

	.today-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
		flex: 1;
	}

	.today-count {
		font-size: 0.75rem;
		font-weight: 600;
		background-color: rgba(255, 255, 255, 0.4);
		padding: 2px 8px;
		border-radius: var(--radius-full, 999px);
	}

	.today-empty {
		padding: var(--space-xl);
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		text-align: center;
		margin: 0;
	}

	.today-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;

		th {
			padding: var(--space-sm) var(--space-lg);
			text-align: left;
			font-weight: 500;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			white-space: nowrap;
			background-color: var(--color-bg-sunken);

			&.num { text-align: right; }
		}

		td {
			padding: var(--space-sm) var(--space-lg);
			border-bottom: 1px solid var(--color-border-light);

			&.num {
				text-align: right;
				font-variant-numeric: tabular-nums;
			}

			a {
				color: var(--color-primary);
				text-decoration: none;
				font-weight: 500;

				&:hover { text-decoration: underline; }
			}
		}

		.product-cell {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		.product-code {
			font-size: 0.75rem;
			color: var(--color-text-secondary);
			flex-shrink: 0;
		}

		tr:last-child td { border-bottom: none; }
	}

	.low-stock-section {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-danger, #f97316);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.low-stock-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-xl);
		background-color: color-mix(in srgb, var(--color-danger, #f97316) 10%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-danger, #f97316) 20%, transparent);
		color: var(--color-danger, #f97316);
	}

	.low-stock-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
	}

	.low-stock-table-wrap {
		overflow-x: auto;
	}

	.low-stock-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;

		th {
			padding: var(--space-sm) var(--space-lg);
			text-align: left;
			font-weight: 500;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			white-space: nowrap;

			&.num { text-align: right; }
		}

		td {
			padding: var(--space-sm) var(--space-lg);
			border-bottom: 1px solid var(--color-border-light);

			&.num { text-align: right; font-variant-numeric: tabular-nums; }
			&.low { color: var(--color-danger, #f97316); font-weight: 600; }

			a {
				color: var(--color-primary);
				text-decoration: none;
				&:hover { text-decoration: underline; }
			}
		}

		tr:last-child td { border-bottom: none; }
	}
</style>
