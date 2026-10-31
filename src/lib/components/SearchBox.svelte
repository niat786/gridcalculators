<script lang="ts">
	import { goto } from '$app/navigation';
	import { loadIndex, search, type SearchEntry } from '../search';
	import Icon from './Icon.svelte';

	interface Props {
		id: string;
		/** 'hero' is the large home-page field. */
		size?: 'hero' | 'regular';
		autofocus?: boolean;
		value?: string;
		/** Show results inline below the field (search page) instead of a floating list. */
		inline?: boolean;
		onresults?: (results: SearchEntry[], query: string) => void;
	}
	let { id, size = 'regular', autofocus = false, value = $bindable(''), inline = false, onresults }: Props =
		$props();

	let index: SearchEntry[] = $state([]);
	let open = $state(false);
	let active = $state(-1);
	const results = $derived(search(index, value));
	const listId = $derived(`${id}-results`);

	$effect(() => {
		onresults?.(results, value);
	});

	async function prime() {
		if (index.length === 0) index = await loadIndex();
	}

	function onkeydown(e: KeyboardEvent) {
		if (!results.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			active = (active + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = active <= 0 ? results.length - 1 : active - 1;
		} else if (e.key === 'Escape') {
			open = false;
			active = -1;
		}
	}

	function onsubmit(e: SubmitEvent) {
		const pick = results[active] ?? results[0];
		if (pick) {
			e.preventDefault();
			goto(`/${pick.s}`);
		}
		// No match: the form falls through to /search?q=… (also the no-JS path).
	}

	$effect(() => {
		if (autofocus) prime();
	});
</script>

<form role="search" action="/search" method="get" class="relative" {onsubmit}>
	<label for={id} class="sr-only">Search calculators</label>
	<span
		class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-label-2 {size === 'hero'
			? 'left-5'
			: 'left-4'}"
	>
		<Icon name="search" size={size === 'hero' ? 20 : 18} strokeWidth={2} />
	</span>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		{id}
		name="q"
		type="search"
		role="combobox"
		autocomplete="off"
		spellcheck="false"
		enterkeyhint="search"
		aria-expanded={(inline || open) && results.length > 0}
		aria-controls={listId}
		aria-autocomplete="list"
		aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
		placeholder={size === 'hero' ? 'Try “mortgage” or “BMI”' : 'Search calculators'}
		{autofocus}
		bind:value
		onfocus={() => {
			prime();
			open = true;
		}}
		onblur={() => setTimeout(() => (open = false), 150)}
		oninput={() => {
			open = true;
			active = -1;
		}}
		{onkeydown}
		class="w-full appearance-none border border-border bg-surface text-label shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.06)] outline-none placeholder:text-label-2 focus-visible:border-accent {size ===
		'hero'
			? 'h-14 rounded-2xl pr-5 pl-13 text-body'
			: 'h-12 rounded-xl pr-4 pl-11 text-body'}"
	/>
	{#if (inline || open) && results.length > 0}
		<ul
			id={listId}
			role="listbox"
			aria-label="Matching calculators"
			class="{inline
				? 'mt-3'
				: 'absolute inset-x-0 top-full z-30 mt-2 shadow-xl'} overflow-hidden rounded-2xl border border-border bg-surface text-left"
		>
			{#each results as r, i (r.s)}
				<li id="{listId}-{i}" role="option" aria-selected={i === active}>
					<a
						href="/{r.s}"
						class="flex min-h-13 flex-col justify-center px-4 py-2 text-label no-underline hover:bg-fill {i ===
						active
							? 'bg-fill'
							: ''} {i > 0 ? 'border-t border-separator' : ''}"
					>
						<span class="font-semibold">{r.n}</span>
						<span class="text-footnote text-label-2">{r.c} · {r.d}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</form>
