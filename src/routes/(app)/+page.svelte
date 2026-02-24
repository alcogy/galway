<script lang="ts">
	import { Card } from '$lib/components';
	import { Activity, CalendarDays, CheckCircle, AlertTriangle } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>ダッシュボード — AES PROGRESS</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">ダッシュボード</h1>

	<!-- Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon green"><Activity size={20} /></div>
			<div class="stat-info">
				<span class="stat-value">{data.wbsSummary.active.length}</span>
				<span class="stat-label">継続中のWBS</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon blue"><CalendarDays size={20} /></div>
			<div class="stat-info">
				<span class="stat-value">{data.wbsSummary.upcoming.length}</span>
				<span class="stat-label">開始前のWBS</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon orange"><AlertTriangle size={20} /></div>
			<div class="stat-info">
				<span class="stat-value">{data.delayedTasks.length}</span>
				<span class="stat-label">遅延中の作業</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon gray"><CheckCircle size={20} /></div>
			<div class="stat-info">
				<span class="stat-value">{data.wbsSummary.finished.length}</span>
				<span class="stat-label">終了したWBS</span>
			</div>
		</div>
	</div>

	<div class="content-grid">
		<Card title="遅延している作業">
			{#if data.delayedTasks.length === 0}
				<p class="placeholder-text">遅延している作業はありません</p>
			{:else}
				<div class="list">
					{#each data.delayedTasks as task (task.id)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div class="list-item" onclick={() => goto(`/wbs/${task.wbs_id}`)}>
							<div class="list-main">
								<div class="list-title">{task.name}</div>
								<div class="list-meta">{task.wbs_title}</div>
								<div class="list-note">進捗: {task.progress}%</div>
							</div>
							<div class="list-time">{task.planned_end}</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>

		<Card title="本日が終了予定の作業">
			{#if data.todayTasks.length === 0}
				<p class="placeholder-text">本日終了予定の作業はありません</p>
			{:else}
				<div class="list">
					{#each data.todayTasks as task (task.id)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div class="list-item" onclick={() => goto(`/wbs/${task.wbs_id}`)}>
							<div class="list-main">
								<div class="list-title">{task.name}</div>
								<div class="list-meta">{task.wbs_title}</div>
								<div class="list-note">進捗: {task.progress}%</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
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

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
		gap: var(--space-lg);
	}

	.placeholder-text {
		color: var(--color-text-tertiary);
		font-size: 0.8125rem;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.list-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
		}
	}

	.list-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.list-title {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.list-meta {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.list-note {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.list-time {
		font-size: 0.75rem;
		color: var(--color-danger);
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
