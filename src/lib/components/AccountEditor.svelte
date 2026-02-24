<script lang="ts">
	import Modal from './Modal.svelte';
	import Input from './Input.svelte';
	import Label from './Label.svelte';
	import Button from './Button.svelte';
	import { enhance } from '$app/forms';

	interface AccountData {
		id?: string;
		name: string;
		email: string;
		role: 'admin' | 'general';
	}

	interface Props {
		open: boolean;
		account?: AccountData | null;
		onsave?: () => void;
	}

	let { open = $bindable(false), account, onsave }: Props = $props();

	const isEdit = $derived(!!account?.id);
	const actionUrl = $derived(isEdit ? '?/update' : '?/create');
</script>

<Modal bind:open title={isEdit ? 'アカウント編集' : 'アカウント新規作成'}>
	<form
		class="editor-form"
		method="POST"
		action={actionUrl}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					open = false;
					onsave?.();
				}
				await update();
			};
		}}
	>
		{#if isEdit && account?.id}
			<input type="hidden" name="id" value={account.id} />
		{/if}

		<div class="field">
			<Label for="acct-name" required>名前</Label>
			<Input
				id="acct-name"
				name="name"
				value={account?.name || ''}
				placeholder="氏名を入力"
				required
			/>
		</div>

		<div class="field">
			<Label for="acct-email" required>メールアドレス</Label>
			<Input
				id="acct-email"
				name="email"
				type="email"
				value={account?.email || ''}
				placeholder="user@company.com"
				required
			/>
		</div>

		<div class="field">
			<Label for="acct-role" required>権限</Label>
			<select id="acct-role" name="role" class="select" value={account?.role || 'general'}>
				<option value="general">一般</option>
				<option value="admin">管理者</option>
			</select>
		</div>

		<div class="field">
			<Label for="acct-password">{isEdit ? '新しいパスワード（任意）' : 'パスワード'}</Label>
			<Input
				id="acct-password"
				name="password"
				type="password"
				placeholder={isEdit ? '空欄の場合は変更されません' : 'パスワードを設定'}
				required={!isEdit}
			/>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>キャンセル</Button>
			<Button type="submit" variant="primary">{isEdit ? '保存' : '作成'}</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.editor-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.select {
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
	}
</style>
