<script lang="ts">
	import { num } from '../calculators/format';

	// A tiny live demo of the "answers as you type" behaviour. Kept independent of the
	// full percentage calculator so the home page loads no calculator chunk.
	const modes = [
		{ id: 'of', label: '% of', pre: 'What is', mid: '% of', post: '?', a: 'Percent', b: 'Number' },
		{ id: 'change', label: '% change', pre: 'From', mid: 'to', post: '', a: 'Old value', b: 'New value' },
		{ id: 'ratio', label: 'X is what %', pre: '', mid: 'is what % of', post: '?', a: 'Part', b: 'Whole' }
	] as const;

	let mode = $state<(typeof modes)[number]['id']>('of');
	let a = $state('20');
	let b = $state('150');
	const m = $derived(modes.find((x) => x.id === mode)!);

	const out = $derived.by(() => {
		const x = Number(a.replace(/,/g, ''));
		const y = Number(b.replace(/,/g, ''));
		if (a.trim() === '' || b.trim() === '' || !Number.isFinite(x) || !Number.isFinite(y))
			return { value: '—', formula: 'Enter two numbers' };
		if (mode === 'of') return { value: num((x / 100) * y, 4), formula: `${num(x, 4)} ÷ 100 × ${num(y, 4)}` };
		if (mode === 'change') {
			if (x === 0) return { value: '—', formula: 'The old value can’t be zero' };
			const c = ((y - x) / Math.abs(x)) * 100;
			return { value: `${c > 0 ? '+' : ''}${num(c, 2)}%`, formula: `(${num(y, 4)} − ${num(x, 4)}) ÷ ${num(Math.abs(x), 4)} × 100` };
		}
		if (y === 0) return { value: '—', formula: 'The whole can’t be zero' };
		return { value: `${num((x / y) * 100, 2)}%`, formula: `${num(x, 4)} ÷ ${num(y, 4)} × 100` };
	});

	const field =
		'tabular h-12 w-24 rounded-xl border border-border bg-canvas px-3 text-right text-title3 font-medium text-label outline-none focus:border-accent';
</script>

<div class="flex flex-col gap-5">
	<fieldset>
		<legend class="sr-only">Percentage problem</legend>
		<div class="flex rounded-[10px] bg-fill p-[3px]">
			{#each modes as opt (opt.id)}
				<label class="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-footnote font-medium has-checked:bg-surface has-checked:font-semibold has-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] has-focus-visible:outline-2 has-focus-visible:outline-accent sm:text-subhead">
					<input type="radio" name="demo-mode" class="sr-only" value={opt.id} bind:group={mode} />
					{opt.label}
				</label>
			{/each}
		</div>
	</fieldset>
	<div class="flex flex-wrap items-center gap-2.5 text-title3 font-medium">
		{#if m.pre}<span>{m.pre}</span>{/if}
		<input class={field} type="text" inputmode="decimal" aria-label={m.a} bind:value={a} />
		<span>{m.mid}</span>
		<input class={field} type="text" inputmode="decimal" aria-label={m.b} bind:value={b} />
		{#if m.post}<span>{m.post}</span>{/if}
	</div>
	<div aria-live="polite" class="flex min-h-24 flex-col justify-center rounded-2xl bg-canvas px-5 py-4">
		<span class="tabular text-[2.5rem] leading-tight font-bold tracking-tight text-accent-text">{out.value}</span>
		<span class="tabular text-subhead text-label-2">{out.formula}</span>
	</div>
</div>
