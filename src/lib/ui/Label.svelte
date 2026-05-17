<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';

	interface Props extends HTMLLabelAttributes {
		required?: boolean;
		bold?: boolean;
		children: Snippet;
	}

	let { required = false, bold = false, children, ...rest }: Props = $props();
</script>

<label class={`label ${bold && 'bold'}`} {...rest}>
	{@render children()}
	{#if required}
		<span class="required" aria-hidden="true">*</span>
	{/if}
</label>

<style lang="scss">
	.label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
		&.bold {
			font-weight: 700;
		}
	}

	.required {
		color: var(--color-danger);
	}
</style>
