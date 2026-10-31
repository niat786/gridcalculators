<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import type { CalculationResult, CalculatorConfig } from '../../calculators/types';
	import { CURRENCIES, currencySymbol, DASH, setCurrency } from '../../calculators/format';
	import DataTable from './DataTable.svelte';
	import Field from './Field.svelte';
	import LineChart from './LineChart.svelte';
	import ResultCard from './ResultCard.svelte';
	import {
		defaultRaw,
		fromQuery,
		isVisible,
		toQuery,
		toValues,
		validate,
		type RawValues
	} from './state';

	function safeCount(f: () => number): number {
		try {
			return f();
		} catch {
			return 0;
		}
	}

	interface Props {
		config: CalculatorConfig;
		/** Build date (YYYY-MM-DD). Used for 'today' defaults until the browser takes over. */
		buildDate: string;
	}
	let { config, buildDate }: Props = $props();

	// The parent re-creates this component per calculator ({#key}), so reading props once is intended.
	const { inputs, idPrefix, initial, metricRows } = untrack(() => {
		const initial = defaultRaw(config.inputs, buildDate);
		return {
			inputs: config.inputs,
			idPrefix: `calc-${config.meta.slug}`,
			initial,
			// Reserve space for the metric rows the default result shows (CLS guard).
			metricRows: safeCount(() => config.calculate(toValues(config.inputs, initial)).secondaryMetrics?.length ?? 0)
		};
	});

	// Server render and first client render must match exactly (no hydration mismatch),
	// so both start from the build date. The real date and URL inputs apply after mount.
	let defaults = $state<RawValues>({ ...initial });
	let raw = $state<RawValues>({ ...initial });
	let ready = $state(false);

	// Currency: universal money tools let people pick one; country tools fix it (see meta.money).
	const moneyMode = untrack(() => config.meta.money);
	const pickCurrency = moneyMode === 'any';
	const startCurrency = untrack(() => (moneyMode && moneyMode !== 'any' ? moneyMode : (config.meta.defaultCurrency ?? 'USD')));
	let currency = $state<string>(startCurrency);
	const symbol = $derived(currencySymbol(currency));
	const CURRENCY_KEY = 'gc-currency';

	function chooseCurrency(code: string) {
		currency = code;
		try {
			localStorage.setItem(CURRENCY_KEY, code);
		} catch {
			/* storage blocked: the choice still works for this page */
		}
	}

	const values = $derived(toValues(inputs, raw));
	const visible = $derived(inputs.filter((i) => isVisible(i, values)));
	const errors = $derived(Object.fromEntries(visible.map((i) => [i.id, validate(i, raw[i.id])])));
	const hasError = $derived(Object.values(errors).some(Boolean));

	let lastGood: CalculationResult | null = null;
	const result = $derived.by((): CalculationResult => {
		if (hasError) {
			return {
				primaryResult: DASH,
				primaryLabel: lastGood?.primaryLabel ?? 'Result',
				summary: 'Check the highlighted field.',
				secondaryMetrics: lastGood?.secondaryMetrics?.map((m) => ({ ...m, value: DASH }))
			};
		}
		// Formatting helpers read the currency at call time, so set it right before calculating.
		setCurrency(currency);
		try {
			const r = config.calculate(values);
			lastGood = r;
			return r;
		} catch {
			return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Something went wrong. Check your inputs.' };
		}
	});


	onMount(() => {
		const today = new Date();
		const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		defaults = defaultRaw(inputs, iso);
		raw = fromQuery(inputs, location.search, defaults);
		if (pickCurrency) {
			const fromUrl = new URLSearchParams(location.search).get('cur');
			let saved: string | null = null;
			try {
				saved = localStorage.getItem(CURRENCY_KEY);
			} catch {
				/* ignore */
			}
			const pick = [fromUrl, saved].find((c) => c && CURRENCIES.some((x) => x.code === c));
			if (pick) currency = pick;
		}
		ready = true;
	});

	// Keep the address bar in sync so any result can be shared (debounced, no history spam).
	let timer: ReturnType<typeof setTimeout> | undefined;
	function fullQuery(): string {
		const q = toQuery(inputs, raw, defaults);
		if (!pickCurrency || currency === startCurrency) return q;
		return `${q}${q ? '&' : '?'}cur=${currency}`;
	}

	$effect(() => {
		const query = fullQuery();
		if (!ready) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (location.search !== query) replaceState(`${location.pathname}${query}`, {});
		}, 300);
		return () => clearTimeout(timer);
	});

	// Phones: while the full result is off-screen, a compact bar shows the answer.
	let resultEl: HTMLElement | undefined = $state();
	let resultVisible = $state(true);
	$effect(() => {
		if (!resultEl) return;
		const io = new IntersectionObserver(([e]) => (resultVisible = e.isIntersecting || e.boundingClientRect.top < 0), {
			threshold: 0.15
		});
		io.observe(resultEl);
		return () => io.disconnect();
	});

	function set(id: string, value: string | boolean) {
		raw[id] = value;
	}

	function reset() {
		raw = { ...defaults };
	}

	function shareUrl(): string {
		return `${location.origin}${location.pathname}${fullQuery()}`;
	}
</script>

<div class="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
	<form
		class="rounded-card bg-surface p-5 sm:p-6"
		aria-label="{config.meta.name} inputs"
		onsubmit={(e) => e.preventDefault()}
		novalidate
	>
		{#if pickCurrency}
			<div class="mb-5 flex items-center justify-between gap-3 border-b border-separator pb-4">
				<label for="{idPrefix}-currency" class="text-subhead font-medium text-label">Currency</label>
				<select
					id="{idPrefix}-currency"
					value={currency}
					onchange={(e) => chooseCurrency(e.currentTarget.value)}
					class="h-10 max-w-[62%] rounded-[10px] border border-border bg-canvas px-3 text-subhead text-label outline-none focus:border-accent"
				>
					{#each CURRENCIES as c (c.code)}
						<option value={c.code}>{c.code} · {c.label}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div class="grid grid-cols-2 gap-5">
			{#each visible as input (input.id)}
				<div
					class={input.type === 'select' ||
					input.type === 'rows' ||
					input.type === 'list' ||
					(input.type === 'text' && input.multiline) ||
					input.type === 'duration'
						? 'col-span-2'
						: input.width === 'half'
							? 'col-span-1'
							: 'col-span-2 sm:col-span-1'}
				>
					<Field
						{input}
						{idPrefix}
						value={raw[input.id]}
						error={errors[input.id] ?? ''}
						currencySymbol={symbol}
						onchange={(v) => set(input.id, v)}
					/>
				</div>
			{/each}
		</div>
	</form>

	<div class="scroll-mt-20 lg:sticky lg:top-20" id="{idPrefix}-result" bind:this={resultEl}>
		<ResultCard
			{result}
			{metricRows}
			{shareUrl}
			title={config.meta.name}
			onreset={reset}
			disclaimer={config.content.disclaimer}
		/>
	</div>
</div>

{#if result.chart}
	<div class="mt-4 rounded-card bg-surface p-5 sm:p-6">
		<LineChart chart={result.chart} />
	</div>
{/if}

{#if result.table}
	<div class="mt-4">
		<DataTable table={result.table} />
	</div>
{/if}

{#if ready && !resultVisible}
	<a
		href="#{idPrefix}-result"
		class="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border px-4 py-2 text-label no-underline shadow-xl lg:hidden"
	>
		<span class="flex min-w-0 flex-col">
			<span class="truncate text-caption text-label-2">{result.primaryLabel}</span>
			<span class="tabular truncate text-title3 font-bold text-accent-text">{result.primaryResult}</span>
		</span>
		<span class="shrink-0 rounded-full bg-accent px-3.5 py-2 text-footnote font-semibold text-white">Details</span>
	</a>
{/if}
