<script lang="ts">
	import { randomBetween } from '../../random';
	import CopyButton from '../CopyButton.svelte';
	import Icon from '../Icon.svelte';

	const SIDES = [4, 6, 8, 10, 12, 20, 100];
	const PIPS: Record<number, [number, number][]> = {
		1: [[50, 50]],
		2: [[28, 28], [72, 72]],
		3: [[26, 26], [50, 50], [74, 74]],
		4: [[28, 28], [72, 28], [28, 72], [72, 72]],
		5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
		6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]]
	};

	let count = $state(2);
	let sides = $state(6);
	let custom = $state('6');
	let modifier = $state('0');
	let rolls = $state<number[]>([]);
	let history = $state<string[]>([]);
	let run = $state(0);
	let error = $state('');

	const faces = $derived(sides === 0 ? Number(custom) : sides);
	const mod = $derived(Number(modifier) || 0);
	const total = $derived(rolls.reduce((a, b) => a + b, 0) + mod);
	const notation = $derived(`${count}d${faces}${mod > 0 ? `+${mod}` : mod < 0 ? mod : ''}`);

	function roll() {
		error = '';
		if (!Number.isInteger(faces) || faces < 2 || faces > 1000) return (error = 'Dice need 2 to 1,000 sides.');
		if (!Number.isInteger(mod) || Math.abs(mod) > 1000) return (error = 'Use a whole-number modifier from −1,000 to 1,000.');
		rolls = Array.from({ length: count }, () => randomBetween(1, faces));
		run++;
		history = [`${notation}: ${rolls.join(' + ')}${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''} = ${total}`, ...history].slice(0, 8);
	}

	const field = 'h-12 w-full rounded-control border border-border bg-canvas px-3.5 text-body text-label outline-none focus:border-accent';
	const label = 'mb-2 block text-subhead font-medium text-label';
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6">
	<form class="rounded-card bg-surface p-5 sm:p-6" onsubmit={(e) => (e.preventDefault(), roll())}>
		<fieldset>
			<legend class={label}>Type of dice</legend>
			<div class="grid grid-cols-4 gap-2 sm:grid-cols-8">
				{#each [...SIDES, 0] as s (s)}
					<label
						class="flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-fill text-subhead font-semibold has-checked:bg-accent has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-accent"
					>
						<input type="radio" class="sr-only" name="dice-sides" value={s} bind:group={sides} />{s ? `d${s}` : 'Other'}
					</label>
				{/each}
			</div>
		</fieldset>
		<div class="mt-5 grid grid-cols-2 gap-4">
			{#if sides === 0}
				<div class="col-span-2"><label for="dice-custom" class={label}>Sides</label><input id="dice-custom" class="{field} tabular" inputmode="numeric" bind:value={custom} /></div>
			{/if}
			<div>
				<label for="dice-count" class={label}>Number of dice</label>
				<select id="dice-count" class={field} bind:value={count}>
					{#each Array.from({ length: 20 }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}
				</select>
			</div>
			<div><label for="dice-mod" class={label}>Modifier</label><input id="dice-mod" class="{field} tabular" inputmode="numeric" bind:value={modifier} /></div>
		</div>
		{#if error}<p class="mt-4 text-footnote text-danger" role="alert">{error}</p>{/if}
		<button type="submit" class="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-body font-semibold text-white hover:brightness-110 active:brightness-95">
			<Icon name="reset" size={18} strokeWidth={2} /> Roll {notation}
		</button>
	</form>

	<section aria-labelledby="dice-result" class="rounded-card bg-surface p-5 sm:p-6 lg:sticky lg:top-20">
		<div class="flex items-center justify-between gap-2">
			<h2 id="dice-result" class="text-subhead font-medium text-label-2">Total</h2>
			{#if rolls.length}<CopyButton variant="icon" label="Copy roll" getText={() => history[0]} />{/if}
		</div>
		<div class="mt-1 min-h-14" aria-live="polite">
			{#if rolls.length}
				{#key run}<p class="gc-pop tabular text-[3rem] leading-tight font-bold tracking-tight text-accent-text">{total}</p>{/key}
			{:else}
				<p class="text-body text-label-2">Press Roll.</p>
			{/if}
		</div>
		{#if rolls.length}
			{#key run}
				<ul class="mt-3 flex flex-wrap gap-2" aria-label="Each die">
					{#each rolls as r, i (i)}
						<li class="gc-pop" style="animation-delay: {Math.min(i, 10) * 30}ms">
							{#if faces === 6}
								<svg viewBox="0 0 100 100" class="size-12" role="img" aria-label={String(r)}>
									<rect x="4" y="4" width="92" height="92" rx="20" class="fill-fill stroke-border" stroke-width="2" />
									{#each PIPS[r] as [cx, cy], j (j)}<circle {cx} {cy} r="9" class="fill-label" />{/each}
								</svg>
							{:else}
								<span class="tabular flex size-12 items-center justify-center rounded-xl border border-border bg-fill text-body font-bold">{r}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/key}
		{/if}
		{#if history.length > 1}
			<h3 class="mt-5 text-footnote font-semibold tracking-wide text-label-2 uppercase">Earlier rolls</h3>
			<ol class="mt-1 grid gap-0.5 text-footnote text-label-2">
				{#each history.slice(1) as h, i (i)}<li class="tabular truncate">{h}</li>{/each}
			</ol>
		{/if}
		<p class="mt-4 text-footnote text-label-2">Each die is rolled with your browser’s cryptographic random generator, so every face is equally likely.</p>
	</section>
</div>
