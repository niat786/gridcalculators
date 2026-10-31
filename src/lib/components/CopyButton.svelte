<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from '../icons';

	interface Props {
		/** Called at click time so the copied text is always current. */
		getText: () => string;
		label: string;
		copiedLabel?: string;
		icon?: IconName;
		/** primary: blue pill · secondary: grey pill · link: text button · icon: round icon-only */
		variant?: 'primary' | 'secondary' | 'link' | 'icon';
		/** On phones, open the native share sheet instead of copying (for links). */
		share?: { title: string };
		oncopied?: () => void;
		class?: string;
	}
	let {
		getText,
		label,
		copiedLabel = 'Copied',
		icon = 'copy',
		variant = 'secondary',
		share,
		oncopied,
		class: className = ''
	}: Props = $props();

	let copied = $state(false);
	let run = $state(0); // bumps on every success so the animations replay
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function onclick() {
		const text = getText();
		if (!text) return;
		try {
			if (share && navigator.share && matchMedia('(pointer: coarse)').matches) {
				await navigator.share({ title: share.title, url: text });
				return;
			}
			await navigator.clipboard.writeText(text);
		} catch {
			return; // share sheet dismissed or clipboard blocked
		}
		copied = true;
		run++;
		oncopied?.();
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1800);
	}

	const styles = {
		primary:
			'min-h-11 rounded-full bg-accent px-4 text-subhead font-semibold text-white hover:brightness-110 active:brightness-95',
		secondary: 'min-h-11 rounded-full bg-fill px-4 text-subhead font-semibold text-label hover:bg-fill-strong',
		link: 'min-h-9 rounded-lg px-2 text-footnote font-medium text-accent-text hover:bg-fill',
		icon: 'size-10 justify-center rounded-full text-label-2 hover:bg-fill hover:text-label'
	};
	const size = $derived(variant === 'link' ? 14 : 18);
</script>

<span class="relative inline-flex {className}">
	{#key run}
		<button
			type="button"
			{onclick}
			aria-label={variant === 'icon' ? label : undefined}
			title={variant === 'icon' ? label : undefined}
			class="flex w-full items-center justify-center gap-2 transition-colors {styles[variant]} {run ? 'gc-pop' : ''}"
		>
			{#if copied}
				<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path class="gc-draw" d="M20 6 9 17l-5-5" />
				</svg>
			{:else}
				<Icon name={icon} {size} strokeWidth={2} />
			{/if}
			{#if variant !== 'icon'}<span>{copied ? copiedLabel : label}</span>{/if}
		</button>
	{/key}
	{#if copied}
		{#key run}
			<span
				aria-hidden="true"
				style={variant === 'icon' ? '--gc-tx: 0' : undefined}
				class="gc-toast pointer-events-none absolute bottom-full z-20 mb-2 {variant === 'icon' ? 'right-0' : 'left-1/2'} rounded-full bg-label px-3 py-1 text-caption font-semibold whitespace-nowrap text-canvas shadow-lg"
			>
				{copiedLabel}
			</span>
		{/key}
	{/if}
	<span class="sr-only" aria-live="polite">{copied ? copiedLabel : ''}</span>
</span>
