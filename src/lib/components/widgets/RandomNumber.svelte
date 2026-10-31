<script lang="ts">
	import { randomBetween, shuffle } from '../../random';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';

	let mode = $state<'numbers' | 'list'>('numbers');
	let min = $state('1');
	let max = $state('100');
	let count = $state('1');
	let unique = $state(true);
	let sorted = $state(false);
	let list = $state('Alice\nBen\nChloe\nDavid');
	let picks = $state('1');
	let results = $state<string[]>([]);
	let error = $state('');
	let run = $state(0);

	function generate() {
		error = '';
		if (mode === 'list') {
			const items = list.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
			const k = Number(picks);
			if (items.length < 1) return (error = 'Add at least one item.');
			if (!Number.isInteger(k) || k < 1 || k > items.length) return (error = `Pick between 1 and ${items.length}.`);
			results = shuffle(items).slice(0, k);
		} else {
			const lo = Number(min);
			const hi = Number(max);
			const n = Number(count);
			if (![lo, hi, n].every(Number.isInteger)) return (error = 'Use whole numbers.');
			if (hi < lo) return (error = 'The maximum must be at least the minimum.');
			if (hi - lo > 2 ** 32 - 1) return (error = 'The range is too large.');
			if (n < 1 || n > 1000) return (error = 'Generate between 1 and 1,000 numbers.');
			if (unique && n > hi - lo + 1) return (error = `Only ${hi - lo + 1} different numbers exist in that range.`);
			const out: number[] = [];
			const seen = new Set<number>();
			while (out.length < n) {
				const x = randomBetween(lo, hi);
				if (unique) {
					if (seen.has(x)) continue;
					seen.add(x);
				}
				out.push(x);
			}
			if (sorted) out.sort((a, b) => a - b);
			results = out.map((x) => x.toLocaleString('en-US'));
		}
		run++;
	}

	const field = 'h-12 w-full rounded-control border border-border bg-canvas px-3.5 text-body text-label outline-none focus:border-accent';
	const label = 'mb-2 block text-subhead font-medium text-label';
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
	<form class="rounded-card bg-surface p-5 sm:p-6" onsubmit={(e) => (e.preventDefault(), generate())}>
		<fieldset class="mb-5">
			<legend class="sr-only">Mode</legend>
			<div class="flex rounded-[10px] bg-fill p-[3px]">
				{#each [['numbers', 'Random numbers'], ['list', 'Pick from a list']] as [m, l] (m)}
					<label class="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg text-subhead font-medium has-checked:bg-surface has-checked:font-semibold has-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] has-focus-visible:outline-2 has-focus-visible:outline-accent">
						<input type="radio" class="sr-only" name="rng-mode" value={m} bind:group={mode} />{l}
					</label>
				{/each}
			</div>
		</fieldset>

		{#if mode === 'numbers'}
			<div class="grid grid-cols-2 gap-4">
				<div><label for="rng-min" class={label}>Minimum</label><input id="rng-min" class="{field} tabular" inputmode="numeric" bind:value={min} /></div>
				<div><label for="rng-max" class={label}>Maximum</label><input id="rng-max" class="{field} tabular" inputmode="numeric" bind:value={max} /></div>
				<div class="col-span-2 sm:col-span-1"><label for="rng-count" class={label}>How many</label><input id="rng-count" class="{field} tabular" inputmode="numeric" bind:value={count} /></div>
				<div class="col-span-2 flex flex-col justify-end gap-2 sm:col-span-1">
					<label class="flex min-h-11 items-center gap-3 text-body"><input type="checkbox" class="size-5 accent-accent" bind:checked={unique} /> No repeats</label>
					<label class="flex min-h-11 items-center gap-3 text-body"><input type="checkbox" class="size-5 accent-accent" bind:checked={sorted} /> Sort the results</label>
				</div>
			</div>
		{:else}
			<label for="rng-list" class={label}>Items (one per line, or separated by commas)</label>
			<textarea id="rng-list" rows="5" class="block w-full resize-y rounded-control border border-border bg-canvas px-3.5 py-3 text-body outline-none focus:border-accent" bind:value={list}></textarea>
			<label for="rng-picks" class="{label} mt-4">How many to pick</label>
			<input id="rng-picks" class="{field} tabular max-w-40" inputmode="numeric" bind:value={picks} />
		{/if}

		{#if error}<p class="mt-4 text-footnote text-danger" role="alert">{error}</p>{/if}

		<button type="submit" class="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-body font-semibold text-white hover:brightness-110 active:brightness-95">
			<Icon name="reset" size={18} strokeWidth={2} /> Generate
		</button>
	</form>

	<section aria-labelledby="rng-result" class="rounded-card bg-surface p-5 sm:p-6 lg:sticky lg:top-20">
		<div class="flex items-center justify-between gap-2">
			<h2 id="rng-result" class="text-subhead font-medium text-label-2">{mode === 'list' ? 'Picked' : results.length > 1 ? 'Your numbers' : 'Your number'}</h2>
			{#if results.length}
				<CopyButton variant="icon" label="Copy results" getText={() => results.join(', ')} />
			{/if}
		</div>
		<div class="mt-2 min-h-24" aria-live="polite">
			{#if results.length === 0}
				<p class="text-body text-label-2">Press Generate.</p>
			{:else if results.length === 1}
				{#key run}<p class="gc-pop tabular text-[3rem] leading-tight font-bold tracking-tight break-all text-accent-text">{results[0]}</p>{/key}
			{:else}
				{#key run}
					<ul class="flex max-h-80 flex-wrap gap-2 overflow-auto">
						{#each results as r, i (i)}<li class="gc-pop tabular rounded-xl bg-fill px-3 py-1.5 text-body font-semibold">{r}</li>{/each}
					</ul>
				{/key}
			{/if}
		</div>
		<p class="mt-4 text-footnote text-label-2">Uses your browser’s cryptographic random generator. Nothing is sent anywhere.</p>
	</section>
</div>
