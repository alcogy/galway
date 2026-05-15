<script lang="ts">
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, Textarea } from '$lib/components';
	import type { PageData } from './$types';
	import type { Category } from './+page.server';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let editing = $state<Category | null>(null);
	let deletingId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	let name = $state('');
	let description = $state('');

	function openCreate() {
		editing = null;
		name = '';
		description = '';
		errorMessage = null;
		showModal = true;
	}

	function openEdit(cat: Category) {
		editing = cat;
		name = cat.name;
		description = cat.description ?? '';
		errorMessage = null;
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	const columns = [
		{ key: 'name', label: 'カテゴリ名' },
		{ key: 'description', label: '説明' },
		{ key: 'product_count', label: '商品数', width: '100px', numeric: true },
	];
</script>

<svelte:head>
	<title>カテゴリ管理 — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">カテゴリ管理</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	<Table {columns} rows={data.categories}>
		{#snippet actions(row)}
			<div class="row-actions">
				<Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
					<Pencil size={14} />
				</Button>
				<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
					<Trash2 size={14} />
				</Button>
			</div>
		{/snippet}
		{#snippet empty()}
			<span>カテゴリが登録されていません</span>
		{/snippet}
	</Table>
</div>

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? 'カテゴリ編集' : 'カテゴリ登録'} size="sm">
	<form
		method="POST"
		action={editing ? '?/update' : '?/create'}
		class="form"
		onsubmit={() => { errorMessage = null; }}
	>
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		{#if errorMessage}
			<div class="error-banner">{errorMessage}</div>
		{/if}

		<div class="field">
			<Label required>カテゴリ名</Label>
			<Input name="name" bind:value={name} placeholder="例: 電子部品" required />
		</div>
		<div class="field">
			<Label>説明</Label>
			<Textarea name="description" bind:value={description} placeholder="カテゴリの説明（任意）" rows={3} />
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				キャンセル
			</Button>
			<Button type="submit">{editing ? '更新' : '登録'}</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title="カテゴリの削除"
	message="このカテゴリを削除しますか？商品のカテゴリは未設定になります。"
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

	.error-banner {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		background-color: var(--color-danger-bg);
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-light);
	}
</style>
