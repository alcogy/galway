<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import { Upload, FileText, X } from '@lucide/svelte';
	import { t } from '$lib/i18n';

	interface Props {
		open: boolean;
		title?: string;
		onimport?: (file: File, mode: 'append' | 'replace') => void;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		onimport,
		onclose
	}: Props = $props();

	const resolvedTitle = $derived(title ?? t('csvDialog.defaultTitle'));

	const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

	let isDragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let errorMessage = $state('');
	let importMode = $state<'append' | 'replace'>('append');
	let fileInputEl: HTMLInputElement | undefined;

	const fileSizeLabel = $derived.by(() => {
		if (!selectedFile) return '';
		const bytes = selectedFile.size;
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	});

	function validateFile(file: File): string {
		if (!file.name.toLowerCase().endsWith('.csv')) {
			return t('csvDialog.invalidFile');
		}
		if (file.size > MAX_SIZE) {
			return t('csvDialog.fileTooLarge');
		}
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
		if (fileInputEl) fileInputEl.value = '';
	}

	function handleImport() {
		if (!selectedFile) return;
		onimport?.(selectedFile, importMode);
		open = false;
	}

	function handleClose() {
		clearFile();
		importMode = 'append';
		onclose?.();
	}
</script>

<Modal bind:open title={resolvedTitle} onclose={handleClose} size="md">
	<div class="import-dialog">
		<!-- Drop zone -->
		<div
			class="drop-zone"
			class:drag-over={isDragOver}
			class:has-file={selectedFile}
			class:has-error={!!errorMessage}
			role="button"
			tabindex="0"
			aria-label={t('csvDialog.dropFile')}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			onclick={() => !selectedFile && fileInputEl?.click()}
			onkeydown={(e) => e.key === 'Enter' && !selectedFile && fileInputEl?.click()}
		>
			{#if selectedFile}
				<div class="file-info">
					<FileText size={28} class="file-icon" />
					<div class="file-details">
						<span class="file-name">{selectedFile.name}</span>
						<span class="file-size">{fileSizeLabel}</span>
					</div>
					<button
						class="clear-btn"
						onclick={(e) => { e.stopPropagation(); clearFile(); }}
						aria-label={t('csvDialog.deleteFile')}
					>
						<X size={16} />
					</button>
				</div>
			{:else}
				<div class="drop-prompt">
					<Upload size={32} class="upload-icon" />
					<p class="drop-primary">{t('csvDialog.dropFile')}</p>
					<p class="drop-secondary">{t('csvDialog.orClick')}</p>
					<p class="drop-hint">{t('csvDialog.hint')}</p>
				</div>
			{/if}
		</div>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		<input
			bind:this={fileInputEl}
			type="file"
			accept=".csv"
			class="visually-hidden"
			onchange={onFileChange}
		/>

		<!-- Import mode -->
		<div class="mode-section">
			<p class="mode-label">{t('csvDialog.importMode')}</p>
			<div class="mode-options">
				<label class="mode-option" class:selected={importMode === 'append'}>
					<input type="radio" bind:group={importMode} value="append" />
					<div class="mode-content">
						<span class="mode-title">{t('csvDialog.append')}</span>
						<span class="mode-desc">{t('csvDialog.appendDesc')}</span>
					</div>
				</label>
				<label class="mode-option" class:selected={importMode === 'replace'}>
					<input type="radio" bind:group={importMode} value="replace" />
					<div class="mode-content">
						<span class="mode-title">{t('csvDialog.replace')}</span>
						<span class="mode-desc">{t('csvDialog.replaceDesc')}</span>
					</div>
				</label>
			</div>
		</div>

		<!-- Footer -->
		<div class="footer">
			<Button variant="secondary" onclick={handleClose}>{t('csvDialog.cancel')}</Button>
			<Button variant="primary" disabled={!selectedFile} onclick={handleImport}>
				<Upload size={14} />
				{t('csvDialog.import')}
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
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);
		text-align: center;

		&:hover,
		&:focus-visible {
			border-color: var(--color-primary);
			background-color: var(--color-primary-light);
			outline: none;
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

		:global(.file-icon) {
			color: var(--color-primary);
			flex-shrink: 0;
		}
	}

	.file-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
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

	.mode-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.mode-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.mode-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.mode-option {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		input[type='radio'] {
			margin-top: 2px;
			flex-shrink: 0;
			accent-color: var(--color-primary);
		}

		&:hover {
			border-color: var(--color-border-focus);
			background-color: var(--color-hover);
		}

		&.selected {
			border-color: var(--color-primary);
			background-color: var(--color-primary-light);
		}
	}

	.mode-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mode-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.mode-desc {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-light);
	}
</style>
