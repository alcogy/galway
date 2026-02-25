<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Label from './Label.svelte';
	import SearchableSelect from './SearchableSelect.svelte';
	import { Upload, FileText, X } from '@lucide/svelte';

	interface Supplier {
		id: string;
		name: string;
	}

	interface Props {
		open: boolean;
		title?: string;
		dateLabel?: string;
		suppliers?: Supplier[];
		onimport?: (file: File, date: string, supplierId: string | undefined) => void;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title = 'CSVインポート',
		dateLabel = '入荷日',
		suppliers,
		onimport,
		onclose
	}: Props = $props();

	const MAX_SIZE = 1 * 1024 * 1024 * 1024;

	let isDragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let errorMessage = $state('');
	let date = $state(new Date().toISOString().slice(0, 10));
	let supplierId = $state('');

	const supplierOptions = $derived(
		(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))
	);

	const fileSizeLabel = $derived.by(() => {
		if (!selectedFile) return '';
		const bytes = selectedFile.size;
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	});

	const canImport = $derived(
		!!selectedFile && !!date && (suppliers == null || !!supplierId)
	);

	function validateFile(file: File): string {
		if (!file.name.toLowerCase().endsWith('.csv')) return 'CSVファイル（.csv）を選択してください。';
		if (file.size > MAX_SIZE) return 'ファイルサイズが1GBを超えています。';
		return '';
	}

	function setFile(file: File) {
		const err = validateFile(file);
		if (err) {
			errorMessage = err;
			selectedFile = null;
		} else {
			errorMessage = '';
			selectedFile = file;
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function onDragLeave() {
		isDragOver = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) setFile(file);
	}

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) setFile(file);
	}

	function clearFile() {
		selectedFile = null;
		errorMessage = '';
	}

	function handleImport() {
		if (!canImport || !selectedFile) return;
		onimport?.(selectedFile, date, suppliers != null ? supplierId || undefined : undefined);
		open = false;
	}

	function handleClose() {
		clearFile();
		date = new Date().toISOString().slice(0, 10);
		supplierId = '';
		onclose?.();
	}
</script>

<Modal bind:open {title} onclose={handleClose} size="md">
	<div class="import-dialog">

		<!-- Drop zone -->
		<label
			class="drop-zone"
			class:drag-over={isDragOver}
			class:has-file={!!selectedFile}
			class:has-error={!!errorMessage}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
		>
			{#if selectedFile}
				<div class="file-info">
					<FileText size={28} />
					<div class="file-details">
						<span class="file-name">{selectedFile.name}</span>
						<span class="file-size">{fileSizeLabel}</span>
					</div>
					<button
						class="clear-btn"
						type="button"
						onclick={(e) => { e.preventDefault(); clearFile(); }}
						aria-label="ファイルを削除"
					>
						<X size={16} />
					</button>
				</div>
			{:else}
				<div class="drop-prompt">
					<Upload size={32} class="upload-icon" />
					<p class="drop-primary">ファイルをここにドロップ</p>
					<p class="drop-secondary">またはクリックしてファイルを選択</p>
					<p class="drop-hint">.csv形式 · 最大 1 GB</p>
				</div>
			{/if}
			<input
				type="file"
				accept=".csv"
				class="visually-hidden"
				onchange={onFileChange}
			/>
		</label>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		<!-- Date and supplier settings -->
		<div class="settings">
			<div class="field">
				<Label required>{dateLabel}</Label>
				<input class="date-input" type="date" bind:value={date} required />
			</div>
			{#if suppliers != null}
				<div class="field">
					<Label required>仕入先</Label>
					<SearchableSelect
						options={supplierOptions}
						placeholder="仕入先を選択"
						bind:value={supplierId}
					/>
				</div>
			{/if}
		</div>

		<!-- CSV format hint -->
		<div class="csv-hint">
			<p class="csv-hint-label">CSVフォーマット（1行目はヘッダー行）</p>
			<div class="csv-hint-table">
				<span class="csv-hint-col">商品コード</span>
				<span class="csv-hint-col">商品名</span>
				<span class="csv-hint-col">数量</span>
			</div>
			<p class="csv-hint-example">例: PRD001, アルミフレーム A型, 100</p>
		</div>

		<!-- Footer -->
		<div class="footer">
			<Button variant="secondary" onclick={handleClose}>キャンセル</Button>
			<Button disabled={!canImport} onclick={handleImport}>
				<Upload size={14} />
				インポート
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.import-dialog {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.drop-zone {
		display: block;
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);
		text-align: center;

		&:hover,
		&:focus-within {
			border-color: var(--color-primary);
			background-color: var(--color-primary-light);
		}

		&.drag-over {
			border-color: var(--color-primary);
			background-color: var(--color-primary-light);
		}

		&.has-file {
			border-style: solid;
			border-color: var(--color-primary);
			background-color: var(--color-primary-light);
			cursor: default;
			text-align: left;
			padding: var(--space-lg);
		}

		&.has-error {
			border-color: var(--color-danger);
			background-color: var(--color-danger-bg);
		}
	}

	.drop-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);

		:global(.upload-icon) {
			color: var(--color-text-muted);
			margin-bottom: var(--space-xs);
		}
	}

	.drop-primary {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.drop-secondary {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.drop-hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: var(--space-xs);
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		color: var(--color-primary);
	}

	.file-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-align: left;
	}

	.file-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.clear-btn {
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
		flex-shrink: 0;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}
	}

	.error-message {
		font-size: 0.8125rem;
		color: var(--color-danger);
		margin-top: calc(-1 * var(--space-sm));
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
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

	.csv-hint {
		padding: var(--space-md);
		background-color: var(--color-bg-sunken);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.csv-hint-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.csv-hint-table {
		display: flex;
		gap: var(--space-sm);
	}

	.csv-hint-col {
		font-size: 0.75rem;
		font-family: monospace;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-sm);
		padding: 2px var(--space-xs);
		color: var(--color-text);
	}

	.csv-hint-example {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-family: monospace;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-light);
	}
</style>
