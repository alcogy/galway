<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { Card } from '$lib/components';
	import ShippingSlipForm from '$lib/components/ShippingSlipForm.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const initialData = $derived({
		id: data.slip.id,
		shipped_at: data.slip.shipped_at,
		account_id: data.slip.account_id,
		note: data.slip.note,
		details: data.details.map((d) => ({ product_id: d.product_id, quantity: d.quantity }))
	});
</script>

<svelte:head>
	<title>{data.slip.slip_number} 編集 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/shipping/{data.slip.id}" class="back-link">
			<ArrowLeft size={16} />
			{data.slip.slip_number} へ戻る
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">出荷編集</h1>
	</div>

	<Card title="伝票情報">
		<ShippingSlipForm
			products={data.products}
			accounts={data.accounts}
			isAdmin={data.isAdmin}
			{initialData}
			oncancel={() => goto(`/shipping/${data.slip.id}`)}
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
