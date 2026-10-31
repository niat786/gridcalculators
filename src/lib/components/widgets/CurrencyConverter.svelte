<script lang="ts">
	import { onMount } from 'svelte';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';

	/**
	 * Live exchange rates, fetched in the browser only (nothing prerendered, no cookies, no key).
	 * Primary: ExchangeRate-API open access (160+ currencies, daily, attribution required).
	 * Fallback: Frankfurter (European Central Bank reference rates, ~30 currencies).
	 * Rates are cached for the session for an hour so each page view costs at most one request.
	 */
	interface Rates {
		base: string;
		rates: Record<string, number>;
		date: string;
		source: 'erapi' | 'ecb';
	}

	const POPULAR = ['USD', 'EUR', 'GBP', 'INR', 'PKR', 'CAD', 'AUD', 'AED', 'SAR', 'JPY', 'CNY', 'SGD', 'CHF', 'BDT', 'NGN', 'MXN'];
	const CACHE_KEY = 'gc-fx-v1';
	const MAX_AGE = 60 * 60 * 1000;

	let amount = $state('100');
	let from = $state('USD');
	let to = $state('EUR');
	let data = $state<Rates | null>(null);
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let run = $state(0);
	// Optional: the person's own rate (e.g. from their bank or exchange shop) and a fee.
	let own = $state(false);
	let ownRate = $state('');
	let fee = $state('');

	let names: Intl.DisplayNames | null = null;
	try {
		names = new Intl.DisplayNames(['en'], { type: 'currency' });
	} catch {
		names = null;
	}
	const nameOf = (c: string) => {
		try {
			return names?.of(c) ?? c;
		} catch {
			return c;
		}
	};

	async function fromErApi(): Promise<Rates> {
		const res = await fetch('https://open.er-api.com/v6/latest/USD');
		const j = await res.json();
		if (j?.result !== 'success' || typeof j.rates !== 'object') throw new Error('bad response');
		const date = new Date(Number(j.time_last_update_unix) * 1000).toISOString().slice(0, 10);
		return { base: 'USD', rates: j.rates, date, source: 'erapi' };
	}
	async function fromEcb(): Promise<Rates> {
		const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD');
		const j = await res.json();
		if (typeof j?.rates !== 'object') throw new Error('bad response');
		return { base: 'USD', rates: { ...j.rates, USD: 1 }, date: String(j.date), source: 'ecb' };
	}

	function valid(r: unknown): r is Rates {
		const x = r as Rates;
		return !!x && typeof x.rates === 'object' && Object.values(x.rates).every((n) => typeof n === 'number' && n > 0);
	}

	async function load() {
		status = 'loading';
		try {
			const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
			if (cached && Date.now() - cached.at < MAX_AGE && valid(cached.data)) {
				data = cached.data;
				status = 'ready';
				return;
			}
		} catch {
			/* storage blocked: just fetch */
		}
		for (const get of [fromErApi, fromEcb]) {
			try {
				const r = await get();
				if (!valid(r)) continue;
				data = r;
				status = 'ready';
				try {
					sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: r }));
				} catch {
					/* ignore */
				}
				return;
			} catch {
				/* try the next source */
			}
		}
		status = 'error';
	}

	onMount(() => {
		const q = new URLSearchParams(location.search);
		const f = q.get('from')?.toUpperCase();
		const t = q.get('to')?.toUpperCase();
		const a = q.get('amount');
		if (f && /^[A-Z]{3}$/.test(f)) from = f;
		if (t && /^[A-Z]{3}$/.test(t)) to = t;
		if (a && Number.isFinite(Number(a))) amount = a;
		const r = Number(q.get('rate'));
		if (r > 0 && Number.isFinite(r)) {
			own = true;
			ownRate = String(r);
		}
		const fe = Number(q.get('fee'));
		if (fe > 0 && fe < 100) fee = String(fe);
		load();
	});

	const codes = $derived.by(() => {
		const all = data ? Object.keys(data.rates) : POPULAR;
		const rest = all.filter((c) => !POPULAR.includes(c)).sort();
		return [...POPULAR.filter((c) => all.includes(c)), ...rest];
	});
	const value = $derived(Number(String(amount).replace(/,/g, '')));
	/** Mid-market rate from the feed. */
	const rate = $derived(data && data.rates[from] && data.rates[to] ? data.rates[to] / data.rates[from] : NaN);
	const ownValue = $derived(Number(String(ownRate).replace(/,/g, '')));
	const ownValid = $derived(own && ownValue > 0 && Number.isFinite(ownValue));
	const feeValue = $derived(fee.trim() === '' ? 0 : Number(fee));
	const feeValid = $derived(Number.isFinite(feeValue) && feeValue >= 0 && feeValue < 100);
	/** The rate actually used: the person's own rate when given, otherwise mid-market. */
	const used = $derived(ownValid ? ownValue : rate);
	const gross = $derived(Number.isFinite(value) && Number.isFinite(used) ? value * used : NaN);
	const feeAmount = $derived(feeValid ? (gross * feeValue) / 100 : NaN);
	const result = $derived(feeValid ? gross - feeAmount : NaN);
	/** How far the person's rate (after fee) is from mid-market, in %. Negative = they get less. */
	const vsMid = $derived(Number.isFinite(rate) && Number.isFinite(result) && value > 0 ? ((result / value) / rate - 1) * 100 : NaN);
	const missing = $derived(status === 'ready' && !Number.isFinite(rate) && !ownValid);
	const showResult = $derived(Number.isFinite(result) && (ownValid || status === 'ready'));

	function fmt(n: number, code: string, max = 2): string {
		try {
			return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: max }).format(n);
		} catch {
			return `${n.toLocaleString('en-US', { maximumFractionDigits: max })} ${code}`;
		}
	}
	const rateText = (r: number) => r.toLocaleString('en-US', { maximumSignificantDigits: 6 });

	const sig = (r: number) => String(Number(r.toPrecision(6)));

	function swap() {
		[from, to] = [to, from];
		if (ownValid) ownRate = sig(1 / ownValue);
		run++;
	}

	/** A new pair needs a new rate: start the own-rate field from the mid-market rate. */
	function pairChanged() {
		if (own) ownRate = Number.isFinite(rate) ? sig(rate) : '';
	}

	function toggleOwn(on: boolean) {
		own = on;
		if (on && !(ownValue > 0) && Number.isFinite(rate)) ownRate = sig(rate);
	}

	// Keep the URL shareable.
	$effect(() => {
		const extra = `${ownValid ? `&rate=${ownValue}` : ''}${feeValid && feeValue > 0 ? `&fee=${feeValue}` : ''}`;
		const q = `?amount=${encodeURIComponent(amount)}&from=${from}&to=${to}${extra}`;
		if (status === 'loading') return;
		const t = setTimeout(() => {
			if (location.search !== q) history.replaceState(history.state, '', `${location.pathname}${q}`);
		}, 300);
		return () => clearTimeout(t);
	});

	const others = $derived(POPULAR.filter((c) => c !== from && c !== to && data?.rates[c]).slice(0, 8));
	const field = 'h-12 w-full rounded-control border border-border bg-canvas px-3.5 text-body text-label outline-none focus:border-accent';
	const label = 'mb-2 block text-subhead font-medium text-label';
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
	<form class="rounded-card bg-surface p-5 sm:p-6" onsubmit={(e) => e.preventDefault()}>
		<label for="fx-amount" class={label}>Amount</label>
		<input id="fx-amount" class="{field} tabular" inputmode="decimal" autocomplete="off" bind:value={amount} />

		<div class="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
			<div>
				<label for="fx-from" class={label}>From</label>
				<select id="fx-from" class={field} bind:value={from} onchange={pairChanged}>
					{#each codes as c (c)}<option value={c}>{c} · {nameOf(c)}</option>{/each}
				</select>
			</div>
			<button
				type="button"
				onclick={swap}
				aria-label="Swap currencies"
				class="mb-0.5 flex size-11 items-center justify-center rounded-full bg-fill text-label hover:bg-fill-strong"
			>
				<Icon name="arrowLeftRight" size={18} strokeWidth={2} />
			</button>
			<div>
				<label for="fx-to" class={label}>To</label>
				<select id="fx-to" class={field} bind:value={to} onchange={pairChanged}>
					{#each codes as c (c)}<option value={c}>{c} · {nameOf(c)}</option>{/each}
				</select>
			</div>
		</div>
		{#if amount !== '' && !Number.isFinite(value)}
			<p class="mt-3 text-footnote text-danger" role="alert">Enter a number.</p>
		{/if}

		<div class="mt-6 border-t border-separator pt-5">
			<label class="flex min-h-11 items-center justify-between gap-3 text-body">
				<span>
					<span class="block font-medium">Use my own rate</span>
					<span class="block text-footnote text-label-2">The rate your bank or exchange shop offers</span>
				</span>
				<input type="checkbox" role="switch" class="h-6 w-11 shrink-0 accent-accent" checked={own} onchange={(e) => toggleOwn(e.currentTarget.checked)} />
			</label>
			{#if own}
				<label for="fx-own" class="{label} mt-4">Exchange rate</label>
				<div class="flex items-center gap-2">
					<span class="shrink-0 text-subhead text-label-2">1 {from} =</span>
					<input id="fx-own" class="{field} tabular" inputmode="decimal" autocomplete="off" bind:value={ownRate} aria-describedby="fx-own-help" />
					<span class="shrink-0 text-subhead text-label-2">{to}</span>
				</div>
				<p id="fx-own-help" class="mt-1.5 text-footnote {ownRate !== '' && !ownValid ? 'text-danger' : 'text-label-2'}">
					{ownRate !== '' && !ownValid ? 'Enter a rate above zero.' : Number.isFinite(rate) ? `Mid-market today: ${rateText(rate)} ${to}.` : 'Enter the rate you were quoted.'}
				</p>
			{/if}
			<label for="fx-fee" class="{label} mt-4">Fee or margin <span class="font-normal text-label-2">(optional)</span></label>
			<div class="flex items-center gap-2">
				<input id="fx-fee" class="{field} tabular max-w-32" inputmode="decimal" autocomplete="off" placeholder="0" bind:value={fee} />
				<span class="text-subhead text-label-2">% of the converted amount</span>
			</div>
			{#if !feeValid}<p class="mt-1.5 text-footnote text-danger" role="alert">Enter a fee from 0 to 99%.</p>{/if}
		</div>
	</form>

	<section aria-labelledby="fx-result" class="rounded-card bg-surface p-5 sm:p-6 lg:sticky lg:top-20">
		<div class="flex items-center justify-between gap-2">
			<h2 id="fx-result" class="text-subhead font-medium text-label-2">{fmt(Number.isFinite(value) ? value : 0, from)} is</h2>
			{#if Number.isFinite(result)}
				<CopyButton variant="icon" label="Copy result" getText={() => fmt(result, to)} />
			{/if}
		</div>
		<div class="mt-1 min-h-14" aria-live="polite">
			{#if showResult}
				{#key run}<p class="gc-pop tabular text-[2.5rem] leading-tight font-bold tracking-tight break-all text-accent-text">{fmt(result, to)}</p>{/key}
			{:else if status === 'loading'}
				<p class="h-12 w-48 animate-pulse rounded-lg bg-fill"></p>
			{:else if status === 'error'}
				<p class="text-body text-label-2">Live rates couldn’t load. <button class="text-accent-text underline" onclick={load}>Try again</button>, or switch on “Use my own rate” and enter a rate.</p>
			{:else if missing}
				<p class="text-body text-label-2">No rate is available for this pair right now.</p>
			{:else}
				{#key run}<p class="gc-pop tabular text-[2.5rem] leading-tight font-bold tracking-tight break-all text-accent-text">{fmt(result, to)}</p>{/key}
			{/if}
		</div>
		<dl class="mt-3 grid gap-1 text-subhead">
			<div class="flex justify-between gap-3">
				<dt class="text-label-2">1 {from} ({ownValid ? 'your rate' : 'mid-market'})</dt>
				<dd class="tabular font-medium">{Number.isFinite(used) ? `${rateText(used)} ${to}` : '—'}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt class="text-label-2">1 {to}</dt>
				<dd class="tabular font-medium">{Number.isFinite(used) ? `${rateText(1 / used)} ${from}` : '—'}</dd>
			</div>
			{#if feeValid && feeValue > 0 && Number.isFinite(feeAmount)}
				<div class="flex justify-between gap-3">
					<dt class="text-label-2">Fee ({feeValue}%)</dt>
					<dd class="tabular font-medium">−{fmt(feeAmount, to)}</dd>
				</div>
			{/if}
			{#if (ownValid || (feeValid && feeValue > 0)) && Number.isFinite(rate) && Number.isFinite(vsMid)}
				<div class="flex justify-between gap-3">
					<dt class="text-label-2">Compared with mid-market</dt>
					<dd class="tabular text-right font-medium {vsMid < -0.005 ? 'text-danger' : ''}">
						{Math.abs(vsMid) < 0.005 ? 'Same' : `${vsMid > 0 ? '+' : '−'}${Math.abs(vsMid).toFixed(2)}% (${vsMid > 0 ? '+' : '−'}${fmt(Math.abs(value * rate - result), to)})`}
					</dd>
				</div>
			{/if}
		</dl>
		{#if status === 'ready' && others.length && Number.isFinite(value)}
			<h3 class="mt-5 text-footnote font-semibold tracking-wide text-label-2 uppercase">In other currencies (mid-market)</h3>
			<ul class="mt-2 grid gap-1 text-subhead">
				{#each others as c (c)}
					<li class="flex justify-between gap-3 border-b border-separator py-1.5 last:border-0">
						<span class="text-label-2">{c}</span><span class="tabular">{fmt((value * data!.rates[c]) / data!.rates[from], c)}</span>
					</li>
				{/each}
			</ul>
		{/if}
		<p class="mt-4 min-h-9 text-footnote text-label-2">
			{#if status === 'ready' && data}
				Mid-market rates updated {data.date}.
				{#if data.source === 'erapi'}<a href="https://www.exchangerate-api.com" rel="noopener" target="_blank">Rates by Exchange Rate API</a>.{:else}Source: European Central Bank via Frankfurter.{/if}
				Banks and card providers add their own margin.
			{:else}
				Loading today’s rates…
			{/if}
		</p>
	</section>
</div>
