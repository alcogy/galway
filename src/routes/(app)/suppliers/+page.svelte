<script lang="ts">
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, SearchBar, Pagination } from '$lib/components';
	import type { PageData } from './$types';
	import type { Supplier } from './+page.server';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let showDeleteDialog = $state(false);
	let editing = $state<Supplier | null>(null);
	let deletingId = $state<string | null>(null);
	let searchQuery = $state('');
	let page = $state(1);

	const ITEMS_PER_PAGE = 20;

	const filteredSuppliers = $derived(
		data.suppliers.filter(
			(s) =>
				s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.code.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
	const pagedSuppliers = $derived(
		filteredSuppliers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
	);

	$effect(() => {
		searchQuery;
		page = 1;
	});

	// Form state
	let code = $state('');
	let name = $state('');
	let phone = $state('');
	let address = $state('');
	let email = $state('');

	function openCreate() {
		editing = null;
		code = '';
		name = '';
		phone = '';
		address = '';
		email = '';
		showModal = true;
	}

	function openEdit(supplier: Supplier) {
		editing = supplier;
		code = supplier.code;
		name = supplier.name;
		phone = supplier.phone ?? '';
		address = supplier.address ?? '';
		email = supplier.email ?? '';
		showModal = true;
	}

	function openDelete(id: string) {
		deletingId = id;
		showDeleteDialog = true;
	}

	const columns = [
		{ key: 'code', label: '仕入先コード', width: '160px' },
		{ key: 'name', label: '仕入先名' },
		{ key: 'phone', label: '電話番号', width: '140px' },
		{ key: 'address', label: '住所' },
		{ key: 'email', label: 'メールアドレス', width: '200px' }
	];
</script>

<svelte:head>
	<title>仕入先管理 — AES Supplier</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">仕入先管理</h1>
		<div class="page-actions">
			<SearchBar placeholder="仕入先名・コードで検索" bind:value={searchQuery} />
			<Button onclick={openCreate}>
				<Plus size={16} />
				新規登録
			</Button>
		</div>
	</div>

	<div class="table-with-pagination">
	<Table {columns} rows={pagedSuppliers}>
		{#snippet actions(row)}
			<div class="row-actions">
				<Button variant="ghost" size="sm" onclick={() => openEdit(row)}>
					<Pencil size={14} />
					編集
				</Button>
				<Button variant="ghost" size="sm" onclick={() => openDelete(row.id)}>
					<Trash2 size={14} />
					削除
				</Button>
			</div>
		{/snippet}
		{#snippet empty()}
			<span>仕入先が登録されていません</span>
		{/snippet}
	</Table>
	<Pagination
		totalItems={filteredSuppliers.length}
		itemsPerPage={ITEMS_PER_PAGE}
		currentPage={page}
		onPageChange={(p) => (page = p)}
	/>
	</div>
</div>

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? '仕入先編集' : '仕入先登録'} size="md">
	<form method="POST" action={editing ? '?/update' : '?/create'} class="form">
		{#if editing}
			<input type="hidden" name="id" value={editing.id} />
		{/if}

		<div class="form-grid">
			<div class="field">
				<Label required>仕入先コード</Label>
				<Input name="code" bind:value={code} placeholder="SUP001" required />
			</div>
			<div class="field">
				<Label required>仕入先名</Label>
				<Input name="name" bind:value={name} placeholder="株式会社〇〇" required />
			</div>
			<div class="field">
				<Label>電話番号</Label>
				<Input name="phone" bind:value={phone} placeholder="03-0000-0000" type="tel" />
			</div>
			<div class="field">
				<Label>メールアドレス</Label>
				<Input name="email" bind:value={email} placeholder="contact@example.com" type="email" />
			</div>
			<div class="field full">
				<Label>住所</Label>
				<Input name="address" bind:value={address} placeholder="東京都〇〇区..." />
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
	title="仕入先の削除"
	message="この仕入先を削除しますか？関連する商品との紐付けも削除されます。"
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
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
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

	.table-with-pagination {
		:global(.table-wrapper) {
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
			border-bottom: none;
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
