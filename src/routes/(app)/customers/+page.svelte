<script lang="ts">
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, Textarea } from '$lib/components';
	import type { PageData } from './$types';
	import type { Customer } from './+page.server';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let editing = $state<Customer | null>(null);
	let deletingId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	let name = $state('');
	let tel = $state('');
	let zipcode = $state('');
	let address = $state('');
	let email = $state('');
	let note = $state('');

	function openCreate() {
		editing = null;
		name = '';
		tel = '';
		zipcode = '';
		address = '';
		email = '';
		note = '';
		errorMessage = null;
		showModal = true;
	}

	function openEdit(c: Customer) {
		editing = c;
		name = c.name;
		tel = c.tel ?? '';
		zipcode = c.zipcode ?? '';
		address = c.address ?? '';
		email = c.email ?? '';
		note = c.note ?? '';
		errorMessage = null;
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	const columns = [
		{ key: 'name', label: '出荷先名' },
		{ key: 'tel', label: '電話番号', width: '140px' },
		{ key: 'address', label: '住所' },
		{ key: 'email', label: 'メールアドレス', width: '200px' },
		{ key: 'slip_count', label: '出荷件数', width: '100px', numeric: true },
	];
</script>

<svelte:head>
	<title>出荷先管理 — Galway</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">出荷先管理</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	<Table {columns} rows={data.customers}>
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
			<span>出荷先が登録されていません</span>
		{/snippet}
	</Table>
</div>

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? '出荷先編集' : '出荷先登録'} size="md">
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

		<div class="form-grid">
			<div class="field full">
				<Label required>出荷先名</Label>
				<Input name="name" bind:value={name} placeholder="〇〇株式会社" required />
			</div>
			<div class="field">
				<Label>電話番号</Label>
				<Input name="tel" bind:value={tel} placeholder="03-1234-5678" />
			</div>
			<div class="field">
				<Label>メールアドレス</Label>
				<Input name="email" type="email" bind:value={email} placeholder="info@example.com" />
			</div>
			<div class="field">
				<Label>郵便番号</Label>
				<Input name="zipcode" bind:value={zipcode} placeholder="123-4567" />
			</div>
			<div class="field full">
				<Label>住所</Label>
				<Input name="address" bind:value={address} placeholder="東京都千代田区..." />
			</div>
			<div class="field full">
				<Label>備考</Label>
				<Textarea name="note" bind:value={note} placeholder="備考（任意）" rows={3} />
			</div>
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
	title="出荷先の削除"
	message="この出荷先を削除しますか？関連する出荷伝票の出荷先は未設定になります。"
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

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&.full {
			grid-column: 1 / -1;
		}
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
