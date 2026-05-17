<script lang="ts">
	import { Button, Table, SearchBar, AccountEditor, ConfirmDialog, Pagination } from '$lib/ui';
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let search = $state($page.url.searchParams.get('search') || '');
	let showEditor = $state(false);
	let editingAccount = $state<any>(null);
	let showDeleteConfirm = $state(false);
	let deleteTarget = $state<string | null>(null);
	let deleteError = $state('');

	const columns = $derived([
		{ key: 'name', label: t('accounts.name') },
		{ key: 'email', label: t('accounts.email') },
		{ key: 'role', label: t('accounts.role'), width: '120px' },
		{ key: 'created_at', label: t('accounts.createdAt'), width: '180px' }
	]);

	const roleLabels = $derived<Record<string, string>>({ admin: t('accounts.roleAdmin'), general: t('accounts.roleGeneral') });

	const rows = $derived(
		data.accounts.map((account) => ({
			...account,
			role: roleLabels[account.role] ?? account.role,
			created_at: new Date(account.created_at).toLocaleDateString(),
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
			body: formData,
			headers: { 'x-sveltekit-action': 'true' }
		});

		const result = deserialize(await response.text()) as any;

		if (result.type === 'success') {
			await invalidateAll();
		} else if (result.type === 'failure') {
			deleteError = result.data?.error || t('common.error');
		} else {
			deleteError = t('common.error');
		}

		deleteTarget = null;
	}
</script>

<svelte:head>
	<title>{t('accounts.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('accounts.title')}</h1>
		<div class="page-actions">
			<Button variant="primary" size="sm" onclick={() => openEditor()}>
				<Plus size={14} />
				{t('accounts.createTitle')}
			</Button>
		</div>
	</div>

	{#if deleteError}
		<div class="error-notification" role="alert">
			<span>{deleteError}</span>
			<button type="button" onclick={() => (deleteError = '')} aria-label="Close">×</button>
		</div>
	{/if}

	<SearchBar bind:value={search} placeholder={t('accounts.searchPlaceholder')} onsubmit={handleSearch} />

	<div class="table-container">
		<Table {columns} {rows}>
			{#snippet empty()}
				<p>{t('accounts.empty')}</p>
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
	title={t('accounts.deleteConfirm')}
	message={t('accounts.deleteConfirm')}
	confirmLabel={t('common.delete')}
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

	.error-notification {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-md);
		background-color: var(--color-danger-bg);
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;

		button {
			background: none;
			border: none;
			color: inherit;
			cursor: pointer;
			font-size: 1rem;
			line-height: 1;
			padding: 0 var(--space-xs);
		}
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
