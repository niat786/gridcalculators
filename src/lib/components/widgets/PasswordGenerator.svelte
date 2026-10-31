<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { randomInt, shuffle } from '../../random';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';

	const SETS = {
		upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		lower: 'abcdefghijklmnopqrstuvwxyz',
		digits: '0123456789',
		symbols: '!@#$%^&*()-_=+[]{};:,.?/~'
	} as const;
	const AMBIGUOUS = /[Il1O0o]/g;

	let length = $state(16);
	let use = $state({ upper: true, lower: true, digits: true, symbols: true });
	let avoidAmbiguous = $state(false);
	let password = $state('');
	let run = $state(0);

	const pools = $derived(
		(Object.keys(SETS) as (keyof typeof SETS)[])
			.filter((k) => use[k])
			.map((k) => (avoidAmbiguous ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]))
	);
	const poolSize = $derived(pools.reduce((n, p) => n + p.length, 0));
	const bits = $derived(poolSize > 1 ? Math.floor(length * Math.log2(poolSize)) : 0);
	const strength = $derived(
		bits >= 100 ? { label: 'Very strong', w: 100 } : bits >= 75 ? { label: 'Strong', w: 78 } : bits >= 50 ? { label: 'Fair', w: 52 } : { label: 'Weak', w: 26 }
	);

	/** At least one character from every chosen set, then the rest from the whole pool, shuffled. */
	function generate() {
		if (poolSize === 0) {
			password = '';
			return;
		}
		const all = pools.join('');
		const chars = pools.map((p) => p[randomInt(p.length)]);
		while (chars.length < length) chars.push(all[randomInt(all.length)]);
		password = shuffle(chars).join('');
		run++;
	}

	// Generate in the browser only (never prerendered into HTML, never put in the URL).
	onMount(generate);
	// Regenerate when a setting changes. Only the settings are tracked; the generator's own
	// state is read untracked so this can't re-trigger itself.
	$effect(() => {
		const settings = [length, use.upper, use.lower, use.digits, use.symbols, avoidAmbiguous];
		void settings;
		untrack(() => {
			if (run > 0) generate();
		});
	});
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
	<section aria-labelledby="pw-label" class="rounded-card bg-surface p-5 sm:p-6 lg:order-2">
		<div class="flex items-center justify-between gap-2">
			<h2 id="pw-label" class="text-subhead font-medium text-label-2">Your password</h2>
			<button type="button" onclick={generate} class="flex min-h-10 items-center gap-1.5 rounded-full bg-fill px-3.5 text-footnote font-semibold hover:bg-fill-strong">
				<Icon name="reset" size={16} strokeWidth={2} /> New
			</button>
		</div>
		<div class="mt-3 flex min-h-20 items-center rounded-2xl bg-canvas px-4 py-3">
			{#key run}
				<p class="gc-pop min-w-0 font-mono text-title3 leading-snug font-semibold break-all text-label" aria-live="polite">{password || ' '}</p>
			{/key}
		</div>
		<div class="mt-4" aria-hidden="true">
			<div class="h-2 overflow-hidden rounded-full bg-fill">
				<div class="h-full rounded-full bg-accent transition-[width] duration-300" style="width:{strength.w}%"></div>
			</div>
		</div>
		<p class="mt-2 flex justify-between text-footnote">
			<span class="font-semibold">{strength.label}</span><span class="tabular text-label-2">{bits} bits of entropy</span>
		</p>
		<CopyButton variant="primary" label="Copy password" getText={() => password} class="mt-5 w-full" />
	</section>

	<form class="rounded-card bg-surface p-5 sm:p-6 lg:order-1" onsubmit={(e) => (e.preventDefault(), generate())}>
		<label for="pw-len" class="mb-2 flex justify-between text-subhead font-medium">Length <span class="tabular font-semibold">{length}</span></label>
		<input id="pw-len" type="range" min="8" max="64" step="1" bind:value={length} class="h-11 w-full accent-accent" />
		<fieldset class="mt-4">
			<legend class="mb-1 text-subhead font-medium">Include</legend>
			{#each [['upper', 'Uppercase (A–Z)'], ['lower', 'Lowercase (a–z)'], ['digits', 'Numbers (0–9)'], ['symbols', 'Symbols (!@#…)']] as [k, l] (k)}
				<label class="flex min-h-11 items-center justify-between gap-3 border-b border-separator text-body last:border-b-0">
					{l}<input type="checkbox" role="switch" class="h-6 w-11 accent-accent" bind:checked={use[k as keyof typeof use]} />
				</label>
			{/each}
		</fieldset>
		<label class="mt-2 flex min-h-11 items-center justify-between gap-3 text-body">
			Avoid look-alikes (I, l, 1, O, 0, o)<input type="checkbox" role="switch" class="h-6 w-11 accent-accent" bind:checked={avoidAmbiguous} />
		</label>
		{#if poolSize === 0}<p class="mt-3 text-footnote text-danger" role="alert">Choose at least one character type.</p>{/if}
	</form>
</div>
