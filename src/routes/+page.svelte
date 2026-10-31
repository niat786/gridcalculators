<script lang="ts">
	import { CATEGORY_BY_ID } from '#lib/calculators/categories.ts';
	import CalculatorTile from '#lib/components/CalculatorTile.svelte';
	import CategoryCard from '#lib/components/CategoryCard.svelte';
	import AdSlot from '#lib/components/AdSlot.svelte';
	import KeypadCalculator from '#lib/components/keypad/KeypadCalculator.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { IconName } from '#lib/icons.ts';
	import SearchBox from '#lib/components/SearchBox.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { graph, organization, website } from '#lib/seo/jsonld.ts';
	import { SITE } from '#lib/site.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const quickLinks = $derived(data.popular.filter((c) => c.slug !== 'basic-calculator').slice(0, 6));
</script>

<Seo
	title="GridCalculators — Free Online Calculators"
	brand={false}
	description={SITE.description}
	path="/"
	jsonLd={graph(organization(), website())}
/>

<section class="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-10 pb-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16 lg:pt-20 lg:pb-16">
	<div class="text-center lg:text-left">
		<h1 class="text-[2.5rem] leading-[1.06] font-bold tracking-[-0.025em] text-balance sm:text-[3.5rem] lg:text-[4rem]">
			The calculator for everything.
		</h1>
		<p class="mx-auto mt-4 max-w-xl text-body text-label-2 sm:mt-5 sm:text-[1.3125rem] sm:leading-snug lg:mx-0">
			Free calculators for money, health, math and everyday life. Fast, private, and nothing to install.
		</p>
		<div class="mx-auto mt-8 max-w-xl text-left lg:mx-0">
			<SearchBox id="home-search" size="hero" />
		</div>
		<ul class="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 text-subhead sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 lg:justify-start">
			{#each quickLinks as c (c.slug)}
				<li class="shrink-0">
					<a href="/{c.slug}" class="block rounded-full border border-border bg-surface px-4 py-2.5 text-label no-underline hover:bg-fill">
						{c.name.replace(/ Calculator$/, '')}
					</a>
				</li>
			{/each}
		</ul>
	</div>
	<div class="mx-auto w-full max-w-md lg:max-w-none">
		<h2 class="sr-only">Online calculator</h2>
		<KeypadCalculator mode="basic" label="Online calculator" />
	</div>
</section>

<AdSlot placement="top" size="banner" class="mx-auto mb-12 px-4 sm:mb-16" />

<section aria-labelledby="popular-h" class="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
	<div class="mb-4 flex items-baseline justify-between gap-4 sm:mb-5">
		<h2 id="popular-h" class="text-title2 font-bold tracking-tight sm:text-title1">Popular right now</h2>
		<a href="/sitemap" class="text-subhead sm:text-body">See all ›</a>
	</div>
	<ul class="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
		{#each data.popular as c (c.slug)}
			<li><CalculatorTile calc={c} /></li>
		{/each}
	</ul>
</section>

<section aria-labelledby="cat-h" class="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
	<h2 id="cat-h" class="mb-4 text-title2 font-bold tracking-tight sm:mb-5 sm:text-title1">Browse by category</h2>
	<div class="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
		{#each data.categories as c (c.id)}
			<CategoryCard category={CATEGORY_BY_ID[c.id]} items={c.items} total={c.total} />
		{/each}
		<div class="flex flex-col justify-center gap-3 rounded-card bg-fill p-6">
			<h3 class="text-title3 font-semibold">Can’t find a calculator?</h3>
			<p class="text-subhead text-label-2">Tell us what you need to work out. We add new calculators every week.</p>
			<a href="/contact" class="self-start rounded-full bg-accent px-5 py-3 text-subhead font-semibold text-white no-underline">Request a calculator</a>
		</div>
	</div>
</section>

<section aria-label="Why GridCalculators" class="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
	<div class="grid gap-8 border-t border-separator pt-10 sm:grid-cols-3 sm:gap-10 sm:pt-12">
		{#each [
			{ icon: 'lock', t: 'Private by design', d: 'Every calculation runs in your browser. Your numbers never leave your device.' },
			{ icon: 'link', t: 'Share the exact result', d: 'Your inputs live in the link. Send it and others see the same numbers.' },
			{ icon: 'sigma', t: 'The math, explained', d: 'Each calculator shows its formula and a worked example, step by step.' }
		] as f (f.t)}
			<div class="flex gap-4 sm:flex-col sm:gap-3">
				<Icon name={f.icon as IconName} size={24} class="shrink-0 text-label" />
				<div>
					<h3 class="font-semibold">{f.t}</h3>
					<p class="mt-1 text-subhead text-label-2">{f.d}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
