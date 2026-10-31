<script lang="ts">
	import type { LineChart } from '../../calculators/types';
	import { money, moneyCompact, num } from '../../calculators/format';

	let { chart }: { chart: LineChart } = $props();

	// Width is measured after mount; the height is fixed so nothing below ever moves.
	let width = $state(640);
	const height = 240;
	const pad = { top: 12, right: 16, bottom: 28, left: 56 };
	const colors = ['var(--gc-series-1)', 'var(--gc-series-2)'];

	const plotW = $derived(Math.max(width - pad.left - pad.right, 50));
	const plotH = height - pad.top - pad.bottom;

	const xs = $derived(chart.data.map((d) => d[chart.x]));
	const xMin = $derived(Math.min(...xs));
	const xMax = $derived(Math.max(...xs));
	const yMaxRaw = $derived(
		Math.max(1, ...chart.data.flatMap((d) => chart.series.map((s) => d[s.key] ?? 0)))
	);

	/** Round the axis top to a clean number: 1, 2, 2.5 or 5 × 10^k. */
	function niceMax(v: number): number {
		const p = Math.pow(10, Math.floor(Math.log10(v)));
		for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
		return 10 * p;
	}
	const yMax = $derived(niceMax(yMaxRaw));
	const yTicks = $derived([0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax));

	const sx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
	const sy = (y: number) => pad.top + plotH - (y / yMax) * plotH;

	const xTicks = $derived.by(() => {
		const span = xMax - xMin;
		const step = span <= 10 ? 2 : span <= 20 ? 5 : 10;
		const t: number[] = [];
		for (let x = xMin; x <= xMax; x += step) t.push(x);
		return t;
	});

	const paths = $derived(
		chart.series.map((s) =>
			chart.data
				.map((d, i) => `${i ? 'L' : 'M'}${sx(d[chart.x]).toFixed(1)},${sy(d[s.key] ?? 0).toFixed(1)}`)
				.join('')
		)
	);

	const fmtAxis = (v: number) => (chart.valueFormat === 'currency' ? moneyCompact(v) : num(v, 1));
	const fmtTip = (v: number) => (chart.valueFormat === 'currency' ? money(v, true) : num(v, 2));

	let hover = $state<number | null>(null);
	function onpointermove(e: PointerEvent) {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * width;
		const xv = xMin + ((x - pad.left) / plotW) * (xMax - xMin);
		let best = 0;
		for (let i = 1; i < chart.data.length; i++) {
			if (Math.abs(chart.data[i][chart.x] - xv) < Math.abs(chart.data[best][chart.x] - xv)) best = i;
		}
		hover = best;
	}

	const last = $derived(chart.data[chart.data.length - 1]);
	const ariaSummary = $derived(
		`${chart.title}. ${chart.series
			.map((s) => `${s.label} goes from ${fmtTip(chart.data[0][s.key])} to ${fmtTip(last[s.key])}`)
			.join('; ')}. Full values are in the table below.`
	);
	const tipLeft = $derived(hover === null ? 0 : sx(chart.data[hover][chart.x]));
</script>

<figure class="m-0">
	<figcaption class="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
		<span class="text-body font-semibold">{chart.title}</span>
		<span class="flex flex-wrap gap-4 text-footnote text-label-2">
			{#each chart.series as s, i (s.key)}
				<span class="flex items-center gap-1.5">
					<span class="inline-block h-0.5 w-4 rounded-full" style="background:{colors[i]}"></span>
					{s.label}
				</span>
			{/each}
		</span>
	</figcaption>

	<div class="relative h-60 w-full touch-pan-y select-none" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label={ariaSummary}
			class="block overflow-visible"
			{onpointermove}
			onpointerleave={() => (hover = null)}
		>
			{#each yTicks as t (t)}
				<line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke="var(--gc-separator)" />
				<text x={pad.left - 8} y={sy(t)} dy="0.32em" text-anchor="end" class="fill-label-2 text-[11px] tabular">{fmtAxis(t)}</text>
			{/each}
			{#each xTicks as t (t)}
				<text x={sx(t)} y={height - 8} text-anchor="middle" class="fill-label-2 text-[11px] tabular">{t}</text>
			{/each}
			{#each paths as d, i (i)}
				<path {d} fill="none" stroke={colors[i]} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			{/each}
			{#if hover !== null}
				<line x1={tipLeft} x2={tipLeft} y1={pad.top} y2={pad.top + plotH} stroke="var(--gc-label-3)" />
				{#each chart.series as s, i (s.key)}
					<circle cx={tipLeft} cy={sy(chart.data[hover][s.key])} r="4.5" fill={colors[i]} stroke="var(--gc-surface)" stroke-width="2" />
				{/each}
			{/if}
		</svg>
		{#if hover !== null}
			<div
				class="pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl border border-border bg-surface px-3 py-2 text-footnote shadow-lg"
				style="left:{Math.min(Math.max(tipLeft - 80, 0), width - 170)}px"
				aria-hidden="true"
			>
				<div class="mb-1 font-semibold">{chart.xLabel} {chart.data[hover][chart.x]}</div>
				{#each chart.series as s, i (s.key)}
					<div class="flex items-center justify-between gap-3">
						<span class="flex items-center gap-1.5 text-label-2">
							<span class="inline-block size-2 rounded-full" style="background:{colors[i]}"></span>{s.label}
						</span>
						<span class="tabular font-medium">{fmtTip(chart.data[hover][s.key])}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</figure>
