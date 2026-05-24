<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, Textarea } from '$lib/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { InventorySchedule } from './+page.server';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let showCancelDialog = $state(false);
	let showStatusDialog = $state(false);
	let deletingId = $state<string | null>(null);
	let cancellingId = $state<string | null>(null);
	let pendingStatusChange = $state<{ id: string; label: string; next: string } | null>(null);
	let title = $state('');
	let scheduledAt = $state('');
	let note = $state('');

	const STATUS_LABELS = $derived<Record<string, string>>({
		planned: t('inventorySchedules.statusPlanned'),
		in_progress: t('inventorySchedules.statusInProgress'),
		completed: t('inventorySchedules.statusCompleted'),
		cancelled: t('inventorySchedules.statusCancelled'),
	});

	const STATUS_NEXT = $derived<Record<string, { label: string; next: string }>>({
		planned: { label: t('inventorySchedules.actionStart'), next: 'in_progress' },
		in_progress: { label: t('inventorySchedules.actionComplete'), next: 'completed' },
	});

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

	function openCancel(id: string) {
		cancellingId = id;
		showCancelDialog = true;
	}

	function openStatusDialog(id: string, label: string, next: string) {
		pendingStatusChange = { id, label, next };
		showStatusDialog = true;
	}

	async function changeStatus(id: string, next: string) {
		const fd = new FormData();
		fd.append('id', id);
		fd.append('status', next);
		await fetch('?/updateStatus', { method: 'POST', body: fd });
		await invalidateAll();
	}

	const columns = $derived([
		{ key: 'scheduled_at', label: t('inventorySchedules.scheduledAt'), width: '120px' },
		{ key: 'title', label: t('inventorySchedules.scheduleTitle') },
		{ key: 'status', label: t('inventorySchedules.status'), width: '110px' },
		{ key: 'note', label: t('inventorySchedules.note') },
	]);
</script>

<svelte:head>
	<title>{t('inventorySchedules.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('inventorySchedules.title')}</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				{t('common.new')}
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
					{@const next = STATUS_NEXT[row.status]}
					<Button variant="secondary" size="sm" onclick={() => openStatusDialog(row.id, next.label, next.next)}>
						{next.label}
					</Button>
				{/if}
				{#if row.status === 'in_progress'}
					<Button variant="ghost" size="sm" onclick={() => openStatusDialog(row.id, t('inventorySchedules.actionRevertPlanned'), 'planned')}>
						{t('inventorySchedules.actionRevertPlanned')}
					</Button>
				{/if}
				{#if row.status === 'planned' || row.status === 'in_progress'}
					<Button variant="ghost" size="sm" onclick={() => openCancel(row.id)}>
						{t('inventorySchedules.actionCancel')}
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
			<span>{t('inventorySchedules.empty')}</span>
		{/snippet}
	</Table>
</div>

<!-- Create Modal -->
<Modal bind:open={showModal} title={t('inventorySchedules.createTitle')} size="sm">
	<form method="POST" action="?/create" class="form">
		<div class="field">
			<Label required>{t('inventorySchedules.titleLabel')}</Label>
			<Input name="title" bind:value={title} placeholder={t('inventorySchedules.titlePlaceholder')} required />
		</div>
		<div class="field">
			<Label required>{t('inventorySchedules.scheduledAtLabel')}</Label>
			<input class="date-input" type="date" name="scheduled_at" bind:value={scheduledAt} required />
		</div>
		<div class="field">
			<Label>{t('inventorySchedules.noteLabel')}</Label>
			<Textarea name="note" bind:value={note} rows={3} />
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button type="submit">{t('common.register')}</Button>
		</div>
	</form>
</Modal>

<!-- Status Change Confirm -->
<ConfirmDialog
	bind:open={showStatusDialog}
	title={pendingStatusChange?.label ?? ''}
	message={t('inventorySchedules.statusChangeConfirm').replace('{label}', pendingStatusChange?.label ?? '')}
	confirmLabel={pendingStatusChange?.label ?? ''}
	cancelLabel={t('common.cancel')}
	onconfirm={() => changeStatus(pendingStatusChange?.id ?? '', pendingStatusChange?.next ?? '')}
/>

<!-- Cancel Confirm -->
<ConfirmDialog
	bind:open={showCancelDialog}
	title={t('inventorySchedules.actionCancel')}
	message={t('inventorySchedules.cancelConfirm')}
	confirmLabel={t('inventorySchedules.actionCancel')}
	cancelLabel={t('common.cancel')}
	onconfirm={() => changeStatus(cancellingId ?? '', 'cancelled')}
/>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('inventorySchedules.deleteConfirm')}
	message={t('inventorySchedules.deleteConfirm')}
	confirmLabel={t('common.delete')}
	cancelLabel={t('common.cancel')}
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
