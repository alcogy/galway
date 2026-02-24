<script lang="ts">
	import { Building2, Package, PackageCheck, Truck } from '@lucide/svelte';
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
</style>
