<script lang="ts">
	import type { CalculationResult } from '../../calculators/types';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';
	import Gauge from './Gauge.svelte';

	interface Props {
		result: CalculationResult;
		/** Rows reserved for metrics so the card height never jumps (CLS). */
		metricRows: number;
		/** Returns the shareable link (inputs in the query string). */
		shareUrl: () => string;
		title: string;
		onreset: () => void;
		disclaimer?: string;
	}
	let { result, metricRows, shareUrl, title, onreset, disclaimer }: Props = $props();

	let flash = $state(0);
	const canCopy = $derived(result.primaryResult !== '' && result.primaryResult !== '—');
	/** Long text results (encoders, converters) use a smaller monospace style. */
	const long = $derived(Boolean(result.long));
</script>

<section aria-labelledby="result-label" class="rounded-card bg-surface p-5 sm:p-6">
	<div aria-live="polite" aria-atomic="true">
		<h2 id="result-label" class="text-subhead font-medium text-label-2">{result.primaryLabel}</h2>
		<div class="mt-1 flex min-h-12 items-start justify-between gap-2">
			{#key flash}
				<p
					class="tabular -mx-1 min-w-0 px-1 font-bold break-words text-accent-text {long
						? 'font-mono text-title3 leading-snug font-semibold break-all whitespace-pre-line max-h-96 overflow-auto'
						: 'text-[2.5rem] leading-[1.15] tracking-tight'} {flash ? 'gc-flash' : ''}"
				>
					{result.primaryResult}
				</p>
			{/key}
			{#if canCopy}
				<CopyButton
					variant="icon"
					label="Copy {result.primaryLabel.toLowerCase()}"
					getText={() => result.primaryResult}
					oncopied={() => flash++}
					class="mt-1 shrink-0"
				/>
			{/if}
		</div>
		<p class="mt-1 min-h-[1.375rem] text-subhead text-label-2">{result.summary ?? ''}</p>
	</div>

	{#if result.gauge}
		<div class="mt-4"><Gauge gauge={result.gauge} /></div>
	{/if}

	{#if metricRows > 0}
		<dl class="mt-4 border-t border-separator text-subhead" style="min-height:{metricRows * 2.75}rem">
			{#each result.secondaryMetrics ?? [] as m, i (`${i}-${m.label}`)}
				<div class="flex min-h-11 items-center justify-between gap-4 border-b border-separator py-2 last:border-b-0">
					<dt class="text-label-2">{m.label}</dt>
					<dd class="tabular text-right font-semibold text-label">{m.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	<div class="mt-5 flex gap-2">
		<CopyButton
			variant="primary"
			icon="link"
			label="Share result"
			copiedLabel="Link copied"
			getText={shareUrl}
			share={{ title }}
			class="flex-1"
		/>
		<button
			type="button"
			onclick={onreset}
			class="flex min-h-11 items-center justify-center gap-2 rounded-full bg-fill px-4 text-subhead font-semibold text-label hover:bg-fill-strong"
		>
			<Icon name="reset" size={18} strokeWidth={2} />
			Reset
		</button>
	</div>

	{#if disclaimer}
		<p class="mt-4 flex gap-2 text-footnote text-label-2">
			<Icon name="info" size={16} class="mt-px shrink-0" />{disclaimer}
		</p>
	{/if}
</section>
