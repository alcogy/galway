<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="card">
	{#if title}
		<div class="card-header">
			<h3 class="card-title">{title}</h3>
		</div>
	{/if}
	<div class="card-body">
		{@render children()}
	</div>
</div>

<style lang="scss">
	.card {
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.card-header {
		padding: var(--space-lg) var(--space-xl);
		border-bottom: 1px solid var(--color-border-light);
	}

	.card-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.card-body {
		padding: var(--space-xl);
	}
</style>
