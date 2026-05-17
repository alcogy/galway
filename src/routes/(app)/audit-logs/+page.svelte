<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Select, Pagination, Input, Button } from '$lib/ui';
	import type { PageData } from './$types';
	import { t } from '$lib/i18n';

	let { data }: { data: PageData } = $props();

	let filterUser = $state(page.url.searchParams.get('user') || '');
	let filterAction = $state(page.url.searchParams.get('action') || '');
	let filterTarget = $state(page.url.searchParams.get('target') || '');

	const actionOptions = $derived([
		{ value: '', label: t('auditLogs.allActions') },
		{ value: 'create', label: t('auditLogs.actionCreate') },
		{ value: 'update', label: t('auditLogs.actionUpdate') },
		{ value: 'delete', label: t('auditLogs.actionDelete') },
		{ value: 'import', label: t('auditLogs.actionImport') },
		{ value: 'status_change', label: t('auditLogs.actionStatusChange') },
		{ value: 'stocktake', label: t('auditLogs.actionStocktake') },
		{ value: 'settings_save', label: t('auditLogs.actionSettingsSave') },
	]);

	const targetOptions = $derived([
		{ value: '', label: t('auditLogs.allTargets') },
		{ value: 'product', label: t('auditLogs.targetProduct') },
		{ value: 'supplier', label: t('auditLogs.targetSupplier') },
		{ value: 'receiving_slip', label: t('auditLogs.targetReceivingSlip') },
		{ value: 'shipping_slip', label: t('auditLogs.targetShippingSlip') },
		{ value: 'inventory', label: t('auditLogs.targetInventory') },
		{ value: 'purchase_order', label: t('auditLogs.targetPurchaseOrder') },
		{ value: 'customer', label: t('auditLogs.targetCustomer') },
		{ value: 'category', label: t('auditLogs.targetCategory') },
		{ value: 'account', label: t('auditLogs.targetAccount') },
		{ value: 'settings', label: t('auditLogs.targetSettings') },
	]);

	const actionLabelMap = $derived<Record<string, string>>({
		create: t('auditLogs.actionCreate'),
		update: t('auditLogs.actionUpdate'),
		delete: t('auditLogs.actionDelete'),
		import: t('auditLogs.actionImport'),
		status_change: t('auditLogs.actionStatusChange'),
		stocktake: t('auditLogs.actionStocktake'),
		settings_save: t('auditLogs.actionSettingsSave'),
	});

	const targetLabelMap = $derived<Record<string, string>>({
		product: t('auditLogs.targetProduct'),
		supplier: t('auditLogs.targetSupplier'),
		receiving_slip: t('auditLogs.targetReceivingSlip'),
		shipping_slip: t('auditLogs.targetShippingSlip'),
		inventory: t('auditLogs.targetInventory'),
		purchase_order: t('auditLogs.targetPurchaseOrder'),
		customer: t('auditLogs.targetCustomer'),
		category: t('auditLogs.targetCategory'),
		account: t('auditLogs.targetAccount'),
		settings: t('auditLogs.targetSettings'),
	});

	function buildParams(p: number) {
		const params = new URLSearchParams();
		if (filterUser) params.set('user', filterUser);
		if (filterAction) params.set('action', filterAction);
		if (filterTarget) params.set('target', filterTarget);
		params.set('page', String(p));
		return params;
	}

	function handleFilter() {
		goto(`?${buildParams(1).toString()}`, { keepFocus: true });
	}

	function handlePageChange(p: number) {
		goto(`?${buildParams(p).toString()}`);
	}

	function formatDate(iso: string) {
		const d = new Date(iso);
		return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
	}

	function parseDetail(json: string | null): string {
		if (!json) return '';
		try {
			const obj = JSON.parse(json);
			return Object.entries(obj)
				.map(([k, v]) => `${k}: ${v}`)
				.join(' / ');
		} catch {
			return json;
		}
	}

	const ACTION_COLOR: Record<string, string> = {
		create: 'green',
		update: 'blue',
		delete: 'red',
		import: 'orange',
		status_change: 'purple',
		stocktake: 'teal',
		settings_save: 'gray',
	};
</script>

<svelte:head>
	<title>{t('auditLogs.pageTitle')}</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">{t('auditLogs.title')}</h1>

	<div class="filters">
		<div class="filter-field">
			<Input bind:value={filterUser} placeholder={t('auditLogs.searchUserPlaceholder')} onkeydown={(e) => e.key === 'Enter' && handleFilter()} />
		</div>
		<div class="filter-select">
			<Select options={actionOptions} bind:value={filterAction} onchange={handleFilter} />
		</div>
		<div class="filter-select">
			<Select options={targetOptions} bind:value={filterTarget} onchange={handleFilter} />
		</div>
		<Button variant="secondary" size="sm" onclick={handleFilter}>Search</Button>
	</div>

	<div class="log-count">{data.totalItems.toLocaleString()} {t('common.items')}</div>

	<div class="table-wrap">
		<table class="log-table">
			<thead>
				<tr>
					<th class="col-date">{t('auditLogs.createdAt')}</th>
					<th class="col-user">{t('auditLogs.user')}</th>
					<th class="col-action">{t('auditLogs.action')}</th>
					<th class="col-target">{t('auditLogs.target')}</th>
					<th class="col-label">{t('auditLogs.target')}</th>
					<th class="col-detail">{t('auditLogs.detail')}</th>
				</tr>
			</thead>
			<tbody>
				{#if data.logs.length === 0}
					<tr>
						<td colspan="6" class="empty-cell">{t('auditLogs.empty')}</td>
					</tr>
				{:else}
					{#each data.logs as log (log.id)}
						<tr>
							<td class="col-date mono">{formatDate(log.created_at)}</td>
							<td class="col-user">{log.user_name ?? '—'}</td>
							<td class="col-action">
								<span class="action-badge action-{ACTION_COLOR[log.action] ?? 'gray'}">
									{actionLabelMap[log.action] ?? log.action}
								</span>
							</td>
							<td class="col-target">{targetLabelMap[log.target_type] ?? log.target_type}</td>
							<td class="col-label">{log.target_label ?? log.target_id ?? '—'}</td>
							<td class="col-detail muted">{parseDetail(log.detail)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<Pagination
		totalItems={data.totalItems}
		itemsPerPage={data.itemsPerPage}
		currentPage={data.currentPage}
		onPageChange={handlePageChange}
	/>
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.filters {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.filter-field {
		flex: 1;
		min-width: 180px;
		max-width: 240px;
	}

	.filter-select {
		width: 150px;
	}

	.log-count {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
	}

	.log-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;

		th {
			padding: var(--space-sm) var(--space-md);
			text-align: left;
			font-weight: 600;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			background-color: var(--color-bg-sunken);
			white-space: nowrap;
		}

		td {
			padding: var(--space-sm) var(--space-md);
			border-bottom: 1px solid var(--color-border-light);
			vertical-align: middle;
		}

		tr:last-child td {
			border-bottom: none;
		}
	}

	.col-date { width: 160px; }
	.col-user { width: 100px; }
	.col-action { width: 110px; }
	.col-target { width: 90px; }
	.col-label { width: 200px; }
	.col-detail { flex: 1; }

	.mono {
		font-variant-numeric: tabular-nums;
		font-size: 0.75rem;
	}

	.muted {
		color: var(--color-text-secondary);
	}

	.empty-cell {
		text-align: center;
		padding: var(--space-3xl) !important;
		color: var(--color-text-tertiary);
	}

	.action-badge {
		display: inline-flex;
		padding: 2px 8px;
		border-radius: var(--radius-full, 999px);
		font-size: 0.75rem;
		font-weight: 500;

		&.action-green  { background-color: var(--color-success-light);  color: var(--color-success); }
		&.action-blue   { background-color: var(--color-primary-light);  color: var(--color-primary); }
		&.action-red    { background-color: var(--color-danger-bg);      color: var(--color-danger); }
		&.action-orange { background-color: var(--color-warning-light);  color: var(--color-warning); }
		&.action-purple { background-color: #f3e8ff; color: #7c3aed; }
		&.action-teal   { background-color: #ccfbf1; color: #0f766e; }
		&.action-gray   { background-color: var(--color-bg-sunken);      color: var(--color-text-secondary); }
	}
</style>
