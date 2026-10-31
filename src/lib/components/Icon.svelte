<script lang="ts">
	import { ICONS, type IconName } from '../icons';

	interface Props {
		name: IconName;
		size?: number;
		strokeWidth?: number;
		class?: string;
		/** Leave empty for decorative icons (the default); set for meaningful standalone icons. */
		label?: string;
	}
	let { name, size = 20, strokeWidth = 1.8, class: className = '', label }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	<!-- Trusted static geometry from icons.ts, never user input. -->
	{@html ICONS[name]}
</svg>
