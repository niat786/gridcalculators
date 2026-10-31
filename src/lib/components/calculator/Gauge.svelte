<script lang="ts">
	import type { Gauge } from '../../calculators/types';

	let { gauge }: { gauge: Gauge } = $props();

	const span = $derived(gauge.max - gauge.min);
	const clamped = $derived(Math.min(Math.max(gauge.value, gauge.min), gauge.max));
	const pos = $derived(((clamped - gauge.min) / span) * 100);
	const segments = $derived(
		gauge.bands.map((b, i) => {
			const from = i === 0 ? gauge.min : gauge.bands[i - 1].to;
			return {
				label: b.label,
				width: ((Math.min(b.to, gauge.max) - from) / span) * 100,
				active: gauge.value >= from && (gauge.value < b.to || i === gauge.bands.length - 1)
			};
		})
	);
</script>

<!-- Position is shown by a marker and the active band's label, never by color alone. -->
<div class="pt-2" aria-hidden="true">
	<div class="relative">
		<div class="flex h-2.5 gap-0.5">
			{#each segments as s (s.label)}
				<div class="h-full rounded-full {s.active ? 'bg-accent' : 'bg-fill-strong'}" style="width:{s.width}%"></div>
			{/each}
		</div>
		<div
			class="absolute -top-1 size-[18px] -translate-x-1/2 rounded-full border-[3px] border-surface bg-label shadow"
			style="left:{pos}%"
		></div>
	</div>
	<div class="mt-2 flex gap-0.5 text-caption">
		{#each segments as s (s.label)}
			<span class="truncate {s.active ? 'font-semibold text-label' : 'text-label-2'}" style="width:{s.width}%">{s.label}</span>
		{/each}
	</div>
</div>
