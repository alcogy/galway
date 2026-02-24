<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Label } from '$lib/components';
	import { Trash2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let newDate = $state('');
	let newName = $state('');
</script>

<svelte:head>
	<title>設定 — AES PROGRESS</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">設定</h1>
	</div>

	<!-- ── 祝日管理 ── -->
	<section class="section">
		<h2 class="section-title">祝日管理</h2>

		<!-- 追加フォーム -->
		<form
			class="add-form"
			method="POST"
			action="?/add"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						newDate = '';
						newName = '';
					}
					await update();
				}}
		>
			<div class="form-row">
				<div class="field">
					<Label for="hol-date" required>日付</Label>
					<Input id="hol-date" name="date" type="date" bind:value={newDate} required />
				</div>
				<div class="field field-grow">
					<Label for="hol-name" required>名称</Label>
					<Input
						id="hol-name"
						name="name"
						placeholder="例: 元日"
						bind:value={newName}
						required
					/>
				</div>
				<div class="field field-btn">
					<Button type="submit" variant="primary" size="sm">追加</Button>
				</div>
			</div>
		</form>

		<!-- 祝日一覧 -->
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>日付</th>
						<th>名称</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if data.holidays.length === 0}
						<tr>
							<td colspan="3" class="empty">祝日が登録されていません</td>
						</tr>
					{:else}
						{#each data.holidays as holiday (holiday.id)}
							<tr>
								<td class="col-date">{holiday.date}</td>
								<td>{holiday.name}</td>
								<td class="col-action">
									<form
										method="POST"
										action="?/delete"
										use:enhance={() =>
											async ({ update }) => {
												await update();
											}}
									>
										<input type="hidden" name="id" value={holiday.id} />
										<button type="submit" class="delete-btn" aria-label="削除">
											<Trash2 size={14} />
										</button>
									</form>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>

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
		gap: var(--space-md);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
	}

	/* ── Add form ── */
	.add-form {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.form-row {
		display: flex;
		align-items: flex-end;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-grow {
		flex: 1;
		min-width: 160px;
	}

	.field-btn {
		flex-shrink: 0;
		padding-bottom: 2px; /* align button baseline with input */
	}

	/* ── Table ── */
	.table-wrap {
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background-color: var(--color-bg-elevated);
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;

		thead {
			background-color: var(--color-bg-sunken);

			th {
				padding: var(--space-md) var(--space-lg);
				text-align: left;
				font-weight: 600;
				color: var(--color-text-secondary);
				border-bottom: 1px solid var(--color-border-light);
			}
		}

		tbody {
			tr:not(:last-child) td {
				border-bottom: 1px solid var(--color-border-light);
			}

			td {
				padding: var(--space-md) var(--space-lg);
			}
		}
	}

	.col-date {
		width: 140px;
		white-space: nowrap;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.col-action {
		width: 48px;
		text-align: right;
	}

	.empty {
		text-align: center;
		color: var(--color-text-tertiary);
		padding: var(--space-xl) !important;
	}

	.delete-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);

		&:hover {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}
	}
</style>
