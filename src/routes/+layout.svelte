<script lang="ts">
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { getTheme } from '$lib/theme.svelte';
	import '../app.scss';

	let { children } = $props();

	// Apply theme to document element reactively
	$effect(() => {
		if (browser) {
			const theme = getTheme();
			document.documentElement.setAttribute('data-theme', theme);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-root">
	{@render children()}
</div>

<style lang="scss">
	.app-root {
		min-height: 100vh;
		background-color: var(--color-bg);
		color: var(--color-text);
	}
</style>
