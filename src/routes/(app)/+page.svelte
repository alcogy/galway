<script lang="ts">
	import { Building2, Package, PackageCheck, Truck, AlertTriangle } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ label: '仕入先数', value: data.supplierCount, icon: Building2, color: 'blue' },
		{ label: '商品数', value: data.productCount, icon: Package, color: 'green' },
		{ label: '今月の入荷件数', value: data.receivingCountThisMonth, icon: PackageCheck, color: 'orange' },
		{ label: '今月の出荷件数', value: data.shippingCountThisMonth, icon: Truck, color: 'gray' }
	]);
</script>

<svelte:head>
	<title>ダッシュボード — AES Supplier</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">ダッシュボード</h1>

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

	{#if data.lowStockItems.length > 0}
		<div class="low-stock-section">
			<div class="low-stock-header">
				<AlertTriangle size={18} />
				<h2 class="low-stock-title">在庫不足アラート（{data.lowStockItems.length}件）</h2>
			</div>
			<div class="low-stock-table-wrap">
				<table class="low-stock-table">
					<thead>
						<tr>
							<th>商品コード</th>
							<th>商品名</th>
							<th class="num">現在庫</th>
							<th class="num">最低在庫数</th>
						</tr>
					</thead>
					<tbody>
						{#each data.lowStockItems as item (item.product_code)}
							<tr>
								<td><a href="/inventory?search={item.product_code}">{item.product_code}</a></td>
								<td>{item.product_name}</td>
								<td class="num low">{Number(item.quantity).toLocaleString('ja-JP')} {item.unit}</td>
								<td class="num">{Number(item.min_quantity).toLocaleString('ja-JP')} {item.unit}</td>
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

		&.blue {
			background-color: var(--color-primary-light);
			color: var(--color-primary);
		}
		&.green {
			background-color: var(--color-success-light);
			color: var(--color-success);
		}
		&.orange {
			background-color: var(--color-warning-light);
			color: var(--color-warning);
		}
		&.gray {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-secondary);
		}
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

			&.num {
				text-align: right;
			}
		}

		td {
			padding: var(--space-sm) var(--space-lg);
			border-bottom: 1px solid var(--color-border-light);

			&.num {
				text-align: right;
				font-variant-numeric: tabular-nums;
			}

			&.low {
				color: var(--color-danger, #f97316);
				font-weight: 600;
			}

			a {
				color: var(--color-primary);
				text-decoration: none;

				&:hover {
					text-decoration: underline;
				}
			}
		}

		tr:last-child td {
			border-bottom: none;
		}
	}
</style>
