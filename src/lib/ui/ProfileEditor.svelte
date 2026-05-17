<script lang="ts">
	import Modal from './Modal.svelte';
	import Input from './Input.svelte';
	import Label from './Label.svelte';
	import Button from './Button.svelte';
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';

	interface ProfileData {
		name: string;
		email: string;
	}

	interface Props {
		open: boolean;
		profile?: ProfileData | null;
		onsave?: () => void;
	}

	let { open = $bindable(false), profile, onsave }: Props = $props();
</script>

<Modal bind:open title={t('profile.editTitle')}>
	<form
		class="editor-form"
		method="POST"
		action="?/update"
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
		<div class="field">
			<Label for="prof-name" required>{t('profile.name')}</Label>
			<Input
				id="prof-name"
				name="name"
				value={profile?.name || ''}
				placeholder="Your name"
				required
			/>
		</div>

		<div class="field">
			<Label for="prof-email" required>{t('profile.email')}</Label>
			<Input
				id="prof-email"
				name="email"
				type="email"
				value={profile?.email || ''}
				placeholder="your@email.com"
				required
			/>
		</div>

		<div class="divider"></div>

		<div class="field">
			<Label for="prof-current-password">{t('profile.currentPassword')}</Label>
			<Input
				id="prof-current-password"
				name="currentPassword"
				type="password"
				placeholder="Enter current password to change"
			/>
		</div>

		<div class="field">
			<Label for="prof-new-password">{t('profile.newPassword')}</Label>
			<Input
				id="prof-new-password"
				name="newPassword"
				type="password"
				placeholder="Enter new password (optional)"
			/>
		</div>

		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>{t('common.cancel')}</Button>
			<Button type="submit" variant="primary">{t('common.save')}</Button>
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

	.divider {
		height: 1px;
		background-color: var(--color-border-light);
		margin: var(--space-sm) 0;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
	}
</style>
