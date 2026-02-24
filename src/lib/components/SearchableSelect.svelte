<script lang="ts">
	import { ChevronDown, Search } from '@lucide/svelte';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		options: Option[];
		placeholder?: string;
		value?: string;
		name?: string;
		disabled?: boolean;
		error?: string;
	}

	let {
		options,
		placeholder = '選択してください',
		value = $bindable(''),
		name,
		disabled,
		error
	}: Props = $props();

	let open = $state(false);
	let searchQuery = $state('');
	let dropdownTop = $state(0);
	let dropdownLeft = $state(0);
	let dropdownWidth = $state(0);

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

	const filteredOptions = $derived(
		searchQuery.trim()
			? options.filter((o) =>
					o.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
				)
			: options
	);

	function openDropdown(e: MouseEvent) {
		if (disabled) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		dropdownTop = rect.bottom + 4;
		dropdownLeft = rect.left;
		dropdownWidth = rect.width;
		open = true;
	}

	function selectOption(opt: Option) {
		value = opt.value;
		open = false;
		searchQuery = '';
	}

	function closeDropdown() {
		open = false;
		searchQuery = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeDropdown();
	}
</script>

{#if name}
	<input type="hidden" {name} value={value} />
{/if}

<div class="wrapper">
	<button
		type="button"
		class="trigger"
		class:is-placeholder={!selectedLabel}
		class:has-error={!!error}
		{disabled}
		onclick={openDropdown}
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		<span class="trigger-label">{selectedLabel || placeholder}</span>
		<span class="chevron" class:is-open={open}>
			<ChevronDown size={14} />
		</span>
	</button>
	{#if error}
		<p class="error-text">{error}</p>
	{/if}
</div>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onclick={closeDropdown}
		onkeydown={handleKeydown}
	></div>
	<div
		class="dropdown"
		style="top: {dropdownTop}px; left: {dropdownLeft}px; width: {dropdownWidth}px;"
		role="listbox"
		aria-label="選択肢"
	>
		<div class="search-wrapper">
			<span class="search-icon"><Search size={13} /></span>
			<input
				{@attach (node) => { node.focus(); }}
				class="search-input"
				type="text"
				placeholder="検索..."
				bind:value={searchQuery}
				onkeydown={handleKeydown}
			/>
		</div>
		<ul class="options-list">
			{#each filteredOptions as opt (opt.value)}
				<li>
					<button
						type="button"
						class="option"
						class:is-selected={opt.value === value}
						onclick={() => selectOption(opt)}
					>
						{opt.label}
					</button>
				</li>
			{:else}
				<li class="no-options">該当する選択肢がありません</li>
			{/each}
		</ul>
	</div>
{/if}

<style lang="scss">
	.wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xs);
		height: 36px;
		padding: 0 var(--space-sm) 0 var(--space-md);
		width: 100%;
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
		text-align: left;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.is-placeholder {
			color: var(--color-text-secondary);
		}

		&.has-error {
			border-color: var(--color-danger);

			&:focus {
				box-shadow: 0 0 0 3px var(--color-danger-light);
			}
		}
	}

	.trigger-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		display: flex;
		flex-shrink: 0;
		color: var(--color-text-secondary);
		transition: transform var(--transition-fast);

		&.is-open {
			transform: rotate(180deg);
		}
	}

	.error-text {
		font-size: 0.75rem;
		color: var(--color-danger);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.dropdown {
		position: fixed;
		z-index: 100;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.search-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--color-border-light);
		flex-shrink: 0;
	}

	.search-icon {
		display: flex;
		align-items: center;
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		height: 28px;
		background: transparent;
		border: none;
		outline: none;
		color: var(--color-text);
		font-family: inherit;
		font-size: 0.8125rem;

		&::placeholder {
			color: var(--color-text-secondary);
		}
	}

	.options-list {
		list-style: none;
		padding: var(--space-xs) 0;
		margin: 0;
		max-height: 220px;
		overflow-y: auto;
	}

	.option {
		display: block;
		width: 100%;
		padding: var(--space-xs) var(--space-md);
		background: transparent;
		border: none;
		color: var(--color-text);
		font-family: inherit;
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;

		&:hover {
			background-color: var(--color-hover);
		}

		&.is-selected {
			color: var(--color-primary);
			font-weight: 500;
		}
	}

	.no-options {
		padding: var(--space-sm) var(--space-md);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-align: center;
	}
</style>
