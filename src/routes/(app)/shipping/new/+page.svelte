<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { Card } from '$lib/components';
	import ShippingSlipForm from '$lib/components/ShippingSlipForm.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>出荷登録 — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/shipping" class="back-link">
			<ArrowLeft size={16} />
			出荷管理へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">出荷登録</h1>
	</div>

	<Card title="伝票情報">
		<ShippingSlipForm
			products={data.products}
			customers={data.customers}
			oncancel={() => goto('/shipping')}
		/>
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
</style>
