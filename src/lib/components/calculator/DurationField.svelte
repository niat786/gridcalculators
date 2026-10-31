<script lang="ts">
	import type { DurationInput } from '../../calculators/types';
	import { splitDuration } from './state';

	interface Props {
		input: DurationInput;
		value: string;
		error: string;
		onchange: (value: string) => void;
		id: string;
	}
	let { input, value, error, onchange, id }: Props = $props();

	const NAMES = { d: 'Days', h: 'Hours', m: 'Minutes', s: 'Seconds' } as const;
	const SHORT = { d: 'd', h: 'h', m: 'm', s: 's' } as const;

	const negative = $derived(value.startsWith('-'));
	const parts = $derived(splitDuration(input, negative ? value.slice(1) : value));

	function setPart(i: number, v: string) {
		const next = [...parts];
		next[i] = v.replace(/[^\d.]/g, '');
		onchange(`${negative ? '-' : ''}${next.join(':')}`);
	}
	function setSign(neg: boolean) {
		const body = negative ? value.slice(1) : value;
		onchange(neg ? `-${body}` : body);
	}
</script>

<fieldset class="min-w-0" aria-describedby={error ? `${id}-error` : input.help ? `${id}-help` : undefined}>
	<legend class="mb-2 text-subhead font-medium text-label">{input.label}</legend>
	<div class="flex gap-2">
		{#if input.allowNegative}
			<div class="flex shrink-0 rounded-[10px] bg-fill p-[3px]" role="group" aria-label="Add or subtract">
				<button type="button" aria-pressed={!negative} onclick={() => setSign(false)} class="min-h-10 w-10 rounded-lg text-title3 font-semibold {negative ? '' : 'bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]'}">+</button>
				<button type="button" aria-pressed={negative} onclick={() => setSign(true)} class="min-h-10 w-10 rounded-lg text-title3 font-semibold {negative ? 'bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : ''}">−</button>
			</div>
		{/if}
		{#each input.units as u, i (u)}
			<label class="flex h-12 min-w-0 flex-1 items-center rounded-control border bg-canvas focus-within:border-accent {error ? 'border-danger' : 'border-border'}">
				<span class="sr-only">{NAMES[u]}</span>
				<input
					id={i === 0 ? id : `${id}-${u}`}
					type="text"
					inputmode="numeric"
					autocomplete="off"
					value={parts[i]}
					oninput={(e) => setPart(i, e.currentTarget.value)}
					onfocus={(e) => e.currentTarget.select()}
					class="tabular h-full w-full min-w-0 bg-transparent pl-2 text-right text-body text-label outline-none"
				/>
				<span class="pr-2.5 pl-1 text-subhead text-label-2" aria-hidden="true">{SHORT[u]}</span>
			</label>
		{/each}
	</div>
	{#if error}
		<p id="{id}-error" class="mt-1.5 text-footnote text-danger">{error}</p>
	{:else if input.help}
		<p id="{id}-help" class="mt-1.5 text-footnote text-label-2">{input.help}</p>
	{/if}
</fieldset>
