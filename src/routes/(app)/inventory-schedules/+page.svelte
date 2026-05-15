<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, Textarea } from '$lib/components';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { InventorySchedule } from './+page.server';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let deletingId = $state<string | null>(null);
	let title = $state('');
	let scheduledAt = $state('');
	let note = $state('');

	const STATUS_LABELS: Record<string, string> = {
		planned: '予定',
		in_progress: '実施中',
		completed: '完了',
		cancelled: 'キャンセル',
	};

	const STATUS_NEXT: Record<string, { label: string; next: string }> = {
		planned: { label: '実施開始', next: 'in_progress' },
		in_progress: { label: '完了にする', next: 'completed' },
	};

	function openCreate() {
		title = '';
		scheduledAt = '';
		note = '';
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	async function changeStatus(id: string, next: string) {
		const fd = new FormData();
		fd.append('id', id);
		fd.append('status', next);
		await fetch('?/updateStatus', { method: 'POST', body: fd });
		await invalidateAll();
	}

	const columns = [
		{ key: 'scheduled_at', label: '予定日', width: '120px' },
		{ key: 'title', label: 'タイトル' },
		{ key: 'status', label: 'ステータス', width: '110px' },
		{ key: 'note', label: '備考' },
	];
</script>

<svelte:head>
	<title>棚卸スケジュール — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">棚卸スケジュール</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	<Table {columns} rows={data.schedules}>
		{#snippet cell(col, value)}
			{#if col.key === 'status'}
				<span class="status-badge status-{value}">{STATUS_LABELS[value as string] ?? value}</span>
			{:else}
				{(value as string | null) ?? '—'}
			{/if}
		{/snippet}
		{#snippet actions(row: InventorySchedule)}
			<div class="row-actions">
				{#if STATUS_NEXT[row.status]}
					{@const t = STATUS_NEXT[row.status]}
					<Button variant="secondary" size="sm" onclick={() => changeStatus(row.id, t.next)}>
						{t.label}
					</Button>
				{/if}
				{#if row.status === 'planned' || row.status === 'cancelled'}
					<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
						<Trash2 size={14} />
					</Button>
				{/if}
			</div>
		{/snippet}
		{#snippet empty()}
			<span>棚卸スケジュールが登録されていません</span>
		{/snippet}
	</Table>
</div>

<!-- Create Modal -->
<Modal bind:open={showModal} title="棚卸スケジュール登録" size="sm">
	<form method="POST" action="?/create" class="form">
		<div class="field">
			<Label required>タイトル</Label>
			<Input name="title" bind:value={title} placeholder="例: 月次棚卸" required />
		</div>
		<div class="field">
			<Label required>予定日</Label>
			<input class="date-input" type="date" name="scheduled_at" bind:value={scheduledAt} required />
		</div>
		<div class="field">
			<Label>備考</Label>
			<Textarea name="note" bind:value={note} placeholder="備考（任意）" rows={3} />
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				キャンセル
			</Button>
			<Button type="submit">登録</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title="スケジュールの削除"
	message="この棚卸スケジュールを削除しますか？"
	confirmLabel="削除"
	cancelLabel="キャンセル"
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'id';
		input.value = deletingId ?? '';
		form.appendChild(input);
		document.body.appendChild(form);
		form.submit();
	}}
/>

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
		gap: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.row-actions {
		display: flex;
		gap: var(--space-xs);
		justify-content: flex-end;
		align-items: center;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: var(--radius-full, 999px);
		font-size: 0.75rem;
		font-weight: 500;

		&.status-planned {
			background-color: var(--color-bg-sunken);
			color: var(--color-text-secondary);
		}

		&.status-in_progress {
			background-color: var(--color-warning-light);
			color: var(--color-warning);
		}

		&.status-completed {
			background-color: var(--color-success-light);
			color: var(--color-success);
		}

		&.status-cancelled {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.date-input {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
