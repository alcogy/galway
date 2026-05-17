<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { Card } from '$lib/ui';
	import ReceivingSlipForm from '$lib/ui/ReceivingSlipForm.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{t('receiving.newPageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-nav">
		<a href="/receiving" class="back-link">
			<ArrowLeft size={16} />
			{t('receiving.backToList')}
		</a>
	</div>

	<div class="page-header">
		<h1 class="page-title">{t('receiving.newSlip')}</h1>
	</div>

	<Card title={t('receiving.slipInfo')}>
		<ReceivingSlipForm
			suppliers={data.suppliers}
			products={data.products}
			oncancel={() => goto('/receiving')}
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
