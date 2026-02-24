<script lang="ts">
	import { Button, Table, SearchBar, AccountEditor, ConfirmDialog, Pagination } from '$lib/components';
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state($page.url.searchParams.get('search') || '');
	let showEditor = $state(false);
	let editingAccount = $state<any>(null);
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<string | null>(null);

	const columns = [
		{ key: 'name', label: '名前' },
		{ key: 'email', label: 'メールアドレス' },
		{ key: 'role', label: '権限', width: '120px' },
		{ key: 'created_at', label: '登録日', width: '180px' }
	];

	const rows = $derived(
		data.accounts.map((account) => ({
			...account,
			created_at: new Date(account.created_at).toLocaleDateString('ja-JP')
		}))
	);

	function handleSearch() {
		const params = new URLSearchParams();
		if (search) {
			params.set('search', search);
		}
		params.set('page', '1'); // Reset to first page when searching
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function handlePageChange(newPage: number) {
		const params = new URLSearchParams();
		if (search) {
			params.set('search', search);
		}
		params.set('page', newPage.toString());
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function openEditor(account?: any) {
		editingAccount = account || null;
		showEditor = true;
	}

	async function handleSave() {
		await invalidateAll();
		showEditor = false;
		editingAccount = null;
	}

	function confirmDelete(id: string) {
		deleteTarget = id;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!deleteTarget) return;

		const formData = new FormData();
		formData.append('id', deleteTarget);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}

		deleteTarget = null;
	}
</script>

<svelte:head>
	<title>アカウント管理 — AES PROGRESS</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">アカウント管理</h1>
		<div class="page-actions">
			<Button variant="primary" size="sm" onclick={() => openEditor()}>
				<Plus size={14} />
				アカウント追加
			</Button>
		</div>
	</div>

	<SearchBar bind:value={search} placeholder="アカウントを検索..." onsubmit={handleSearch} />

	<div class="table-container">
		<Table {columns} {rows}>
			{#snippet empty()}
				<p>アカウントが見つかりません</p>
			{/snippet}
			{#snippet actions(account)}
				<div class="action-buttons">
					{#if account.id !== data.currentUserId}
						<button
							type="button"
							class="action-btn"
							onclick={() => openEditor(account)}
							aria-label="Edit account"
						>
							<Pencil size={14} />
						</button>
						<button
							type="button"
							class="action-btn delete"
							onclick={() => confirmDelete(account.id)}
							aria-label="Delete account"
						>
							<Trash2 size={14} />
						</button>
					{/if}
				</div>
			{/snippet}
		</Table>
		<Pagination
			totalItems={data.totalItems}
			itemsPerPage={data.itemsPerPage}
			currentPage={data.currentPage}
			onPageChange={handlePageChange}
		/>
	</div>
</div>

<AccountEditor bind:open={showEditor} account={editingAccount} onsave={handleSave} />

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="削除確認"
	message="このアカウントを削除してもよろしいですか？この操作は取り消せません。"
	confirmLabel="削除"
	onconfirm={handleDelete}
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
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.page-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.table-container {
		:global(.table-wrapper) {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
		}
	}

	.action-buttons {
		display: flex;
		gap: var(--space-xs);
		justify-content: flex-end;
	}

	.action-btn {
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
			background-color: var(--color-hover);
			color: var(--color-text);
		}

		&.delete:hover {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}
	}
</style>
