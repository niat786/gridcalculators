<script lang="ts">
	import type { CalculatorCard } from '../calculators/catalog';
	import { REGIONS } from '../calculators/regions';
	import { TONE_TILE } from '../tones';
	import Icon from './Icon.svelte';

	let { calc }: { calc: CalculatorCard } = $props();
</script>

<a
	href="/{calc.slug}"
	class="flex h-full flex-row items-start gap-4 rounded-card bg-surface p-4 text-label no-underline shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-transform hover:-translate-y-0.5 sm:flex-col sm:gap-3.5 sm:p-5"
>
	<span class="flex size-11 shrink-0 items-center justify-center rounded-xl {TONE_TILE[calc.category]}">
		<Icon name={calc.icon} size={22} />
	</span>
	<span class="flex min-w-0 flex-col gap-1">
		<span class="flex flex-wrap items-center gap-x-2 font-semibold"
			>{calc.name}{#if calc.region}<span class="rounded-md bg-fill px-1.5 py-px text-caption font-bold text-label-2" title="For {REGIONS[calc.region].the} only">{calc.region}</span>{/if}</span
		>
		<span class="text-subhead text-label-2">{calc.shortDescription}</span>
	</span>
</a>
