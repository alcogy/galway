<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface Column {
		key: string;
		label: string;
		width?: string;
	}

	interface Props {
		columns: Column[];
		rows: T[];
		row?: Snippet<[T, number]>;
		cell?: Snippet<[Column, unknown]>;
		empty?: Snippet;
		onrowclick?: (row: T) => void;
		actions?: Snippet<[T]>;
	}

	let { columns, rows, row, cell, empty, onrowclick, actions }: Props = $props();
</script>

<div class="table-wrapper">
	<table class="table">
		<thead>
			<tr>
				{#each columns as col (col.key)}
					<th style:width={col.width}>{col.label}</th>
				{/each}
				{#if actions}
					<th class="actions-header" style:width="100px">操作</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#if rows.length === 0}
				<tr>
					<td colspan={columns.length + (actions ? 1 : 0)} class="empty-cell">
						{#if empty}
							{@render empty()}
						{:else}
							<span class="empty-text">No data</span>
						{/if}
					</td>
				</tr>
			{:else}
				{#each rows as item, i (i)}
					{#if row}
						{@render row(item, i)}
					{:else}
						<tr
							class:clickable={!!onrowclick && !actions}
							onclick={() => (!actions && onrowclick) ? onrowclick(item) : undefined}
							role={(!actions && onrowclick) ? 'button' : undefined}
							tabindex={(!actions && onrowclick) ? 0 : undefined}
						>
							{#each columns as col (col.key)}
							<td>
								{#if cell}
									{@render cell(col, (item as Record<string, unknown>)[col.key])}
								{:else}
									{(item as Record<string, unknown>)[col.key] ?? ''}
								{/if}
							</td>
						{/each}
							{#if actions}
								<td class="actions-cell">
									{@render actions(item)}
								</td>
							{/if}
						</tr>
					{/if}
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style lang="scss">
	.table-wrapper {
		overflow-x: auto;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		background-color: var(--color-bg-elevated);
	}

	thead {
		background-color: var(--color-bg-sunken);

		th {
			padding: var(--space-md) var(--space-lg);
			text-align: left;
			font-weight: 600;
			color: var(--color-text-secondary);
			border-bottom: 1px solid var(--color-border-light);
			white-space: nowrap;
		}
	}

	tbody {
		background-color: var(--color-bg-elevated);

		tr {
			background-color: var(--color-bg-elevated);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-hover);
			}

			&.clickable {
				cursor: pointer;

				&:active {
					background-color: var(--color-active);
				}
			}

			&:not(:last-child) {
				td {
					border-bottom: 1px solid var(--color-border-light);
				}
			}
		}

		td {
			padding: var(--space-md) var(--space-lg);
			color: var(--color-text);
		}
	}

	.empty-cell {
		text-align: center;
		padding: var(--space-3xl) var(--space-lg) !important;
	}

	.empty-text {
		color: var(--color-text-tertiary);
	}

	.actions-header {
		text-align: center;
	}

	.actions-cell {
		text-align: right;
		white-space: nowrap;
	}
</style>
