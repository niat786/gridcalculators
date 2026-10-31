<script lang="ts">
	import { dev } from '$app/env';
	import { onMount } from 'svelte';
	import { ADSENSE_CLIENT, AD_SLOTS, type AdPlacement } from '../ads/config';
	import { loadAdSense } from '../ads/loader';

	interface Props {
		placement: AdPlacement;
		/**
		 * banner: 320×100 on phones, 728×90 from tablet up.
		 * rectangle: 300×250.  tower: 300×600 (desktop sidebar).
		 * The box keeps a FIXED height whether or not an ad fills it → zero layout shift.
		 */
		size: 'banner' | 'rectangle' | 'tower';
		class?: string;
	}
	let { placement, size, class: className = '' }: Props = $props();

	const enabled = $derived(ADSENSE_CLIENT !== '' && AD_SLOTS[placement] !== '');
	const show = $derived(enabled || dev);

	const box = $derived({
		banner: 'h-[100px] w-full max-w-[320px] md:h-[90px] md:max-w-[728px]',
		rectangle: 'h-[250px] w-[300px]',
		tower: 'h-[600px] w-[300px]'
	}[size]);

	let slot: HTMLElement | undefined = $state();

	onMount(() => {
		if (!enabled || !slot) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				io.disconnect();
				loadAdSense()
					.then(() => (window.adsbygoogle = window.adsbygoogle || []).push({}))
					.catch(() => {});
			},
			{ rootMargin: '300px 0px' }
		);
		io.observe(slot);
		return () => io.disconnect();
	});
</script>

{#if show}
	<aside aria-label="Advertisement" class="flex flex-col items-center gap-1.5 {className}">
		<span class="text-[11px] tracking-wider text-label-2 uppercase">Advertisement</span>
		<div class="overflow-hidden rounded-control bg-fill {box}">
			{#if enabled}
				<ins
					bind:this={slot}
					class="adsbygoogle block h-full w-full"
					data-ad-client={ADSENSE_CLIENT}
					data-ad-slot={AD_SLOTS[placement]}
					data-full-width-responsive="false"
				></ins>
			{:else}
				<div class="flex h-full items-center justify-center text-footnote text-label-2">
					Ad · {placement} · {size}
				</div>
			{/if}
		</div>
	</aside>
{/if}
