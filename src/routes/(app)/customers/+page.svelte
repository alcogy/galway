<script lang="ts">
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { Button, Input, Label, Modal, ConfirmDialog, Table, Textarea } from '$lib/ui';
	import type { PageData } from './$types';
	import type { Customer } from './+page.server';
	import { t } from '$lib/i18n';

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

	const columns = $derived([
		{ key: 'name', label: t('customers.customerName') },
		{ key: 'tel', label: t('customers.phone'), width: '140px' },
		{ key: 'address', label: t('customers.address') },
		{ key: 'email', label: t('customers.email'), width: '200px' },
		{ key: 'slip_count', label: t('customers.shippingCount'), width: '100px', numeric: true },
	]);
</script>

<svelte:head>
	<title>{t('customers.pageTitle')}</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1 class="page-title">{t('customers.title')}</h1>
		<div class="page-actions">
			<Button size="sm" onclick={openCreate}>
				<Plus size={16} />
				{t('common.new')}
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
			<span>{t('customers.empty')}</span>
		{/snippet}
	</Table>
</div>

<!-- Create / Edit Modal -->
<Modal bind:open={showModal} title={editing ? t('customers.editTitle') : t('customers.createTitle')} size="md">
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
				<Label required>{t('customers.customerName')}</Label>
				<Input name="name" bind:value={name} placeholder={t('customers.namePlaceholder')} required />
			</div>
			<div class="field">
				<Label>{t('customers.phone')}</Label>
				<Input name="tel" bind:value={tel} placeholder="03-1234-5678" />
			</div>
			<div class="field">
				<Label>{t('customers.email')}</Label>
				<Input name="email" type="email" bind:value={email} placeholder="info@example.com" />
			</div>
			<div class="field">
				<Label>{t('customers.zipcode')}</Label>
				<Input name="zipcode" bind:value={zipcode} placeholder="123-4567" />
			</div>
			<div class="field full">
				<Label>{t('customers.address')}</Label>
				<Input name="address" bind:value={address} />
			</div>
			<div class="field full">
				<Label>{t('common.note')}</Label>
				<Textarea name="note" bind:value={note} rows={3} />
			</div>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (showModal = false)}>
				{t('common.cancel')}
			</Button>
			<Button type="submit">{editing ? t('common.update') : t('common.register')}</Button>
		</div>
	</form>
</Modal>

<!-- Delete Confirm -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title={t('customers.deleteConfirm')}
	message={t('customers.deleteConfirm')}
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
