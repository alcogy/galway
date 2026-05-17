<script lang="ts">
	import { Button, Card, ProfileEditor } from '$lib/ui';
	import { Pencil } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showEditor = $state(false);

	async function handleSave() {
		await invalidateAll();
		showEditor = false;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>プロフィール — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">プロフィール</h1>
		<Button variant="secondary" size="sm" onclick={() => (showEditor = true)}>
			<Pencil size={14} />
			編集
		</Button>
	</div>

	{#if data.account}
		<Card>
			<div class="profile-section">
				<h2 class="section-title">アカウント情報</h2>

				<div class="detail-grid">
					<div class="detail-item">
						<span class="detail-label">名前</span>
						<span class="detail-value">{data.account.name}</span>
					</div>

					<div class="detail-item">
						<span class="detail-label">メールアドレス</span>
						<span class="detail-value">{data.account.email}</span>
					</div>

					<div class="detail-item">
						<span class="detail-label">権限</span>
						<span class="detail-value role-{data.account.role}">{data.account.role}</span>
					</div>

					<div class="detail-item">
						<span class="detail-label">登録日</span>
						<span class="detail-value">{formatDate(data.account.created_at)}</span>
					</div>
				</div>
			</div>
		</Card>
	{:else}
		<Card>
			<p>Account information not found.</p>
		</Card>
	{/if}
</div>

<ProfileEditor bind:open={showEditor} profile={data.account} onsave={handleSave} />

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.profile-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-lg);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.detail-value {
		font-size: 0.875rem;

		&.role-admin {
			color: var(--color-primary);
			font-weight: 500;
		}

		&.role-general {
			color: var(--color-text);
		}
	}
</style>
