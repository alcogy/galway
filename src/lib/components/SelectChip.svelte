<script lang="ts">
	interface Props {
		label: string;
		name: string;
		value: string | number;
		checked?: boolean;
		onChange?: (v?: any) => void;
	}
	let { label, name, value, checked = false, onChange }: Props = $props();
</script>

<label>
	<input
		type="checkbox"
		name={name}
		value={value}
		class="select-chip-input"
		bind:checked={checked}
		onchange={() => onChange?.(checked)}
	/>
	{label}
</label>

<style lang="scss">
	.select-chip-input {
		display: none;
	}

	label {
		display: inline-block;
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background-color: var(--color-bg);
		color: var(--color-text);
		cursor: pointer;
		user-select: none;
	}

	label:has(.select-chip-input:checked) {
		background-color: var(--color-bg-light);
		border-color: var(--color-bg-light);
		color: var(--color-primary-text);
	}
</style>