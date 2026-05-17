<script lang="ts">
	import { onMount } from 'svelte';
	import { Sidebar, ConfirmDialog } from '$lib/ui';
	import { getTheme, setTheme } from '$lib/theme.svelte';
	import { initLocale, t } from '$lib/i18n';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	let signoutOpen = $state(false);

	onMount(() => {
		initLocale();
	});
</script>

<ConfirmDialog
	bind:open={signoutOpen}
	title={t('nav.signOut')}
	message={t('nav.signOut') + '?'}
	confirmLabel={t('nav.signOut')}
	onconfirm={() => { window.location.href = '/logout'; }}
/>

<div class="app-shell">
	<Sidebar
		theme={getTheme()}
		onthemechange={setTheme}
		role={data.user?.role as 'admin' | 'general' | undefined}
		onsignout={() => (signoutOpen = true)}
	/>

	<main class="main-content">
		{@render children()}
	</main>
</div>

<style lang="scss">
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.main-content {
		flex: 1;
		margin-left: var(--sidebar-width);
		padding: var(--space-2xl);
		min-width: 0;
		transition: margin-left var(--transition-base);

		@media (max-width: 768px) {
			margin-left: 0;
			padding: var(--space-lg);
			padding-top: calc(var(--header-height) + var(--space-sm));
		}
	}
</style>
