<script lang="ts">
	import { CATEGORY_BY_ID } from '#lib/calculators/categories.ts';
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import CalculatorTile from '#lib/components/CalculatorTile.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { breadcrumbs, graph } from '#lib/seo/jsonld.ts';
	import { absoluteUrl } from '#lib/site.ts';
	import { TONE_TILE } from '#lib/tones.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const cat = $derived(CATEGORY_BY_ID[data.categoryId]);
	const path = $derived(`/${cat.slug}`);
	const crumbs = $derived([
		{ name: 'Home', path: '/' },
		{ name: `${cat.name} calculators`, path }
	]);
	const jsonLd = $derived(
		graph(
			{
				'@type': 'CollectionPage',
				name: cat.metaTitle,
				url: absoluteUrl(path),
				description: cat.metaDescription,
				mainEntity: {
					'@type': 'ItemList',
					itemListElement: data.items.map((c, i) => ({
						'@type': 'ListItem',
						position: i + 1,
						url: absoluteUrl(`/${c.slug}`),
						name: c.name
					}))
				}
			},
			breadcrumbs(crumbs)
		)
	);
</script>

<Seo title={cat.metaTitle} description={cat.metaDescription} {path} {jsonLd} noindex={data.items.length === 0} />

<div class="mx-auto max-w-6xl px-4 pt-5 pb-20 sm:px-6 sm:pt-8">
	<Breadcrumbs items={crumbs} />
	<header class="mt-5 mb-8 flex max-w-3xl items-start gap-4">
		<span class="flex size-14 shrink-0 items-center justify-center rounded-2xl {TONE_TILE[cat.id]}">
			<Icon name={cat.icon} size={28} />
		</span>
		<div>
			<h1 class="text-large font-bold tracking-tight">{cat.name} calculators</h1>
			<p class="mt-2 text-label-2">{cat.intro}</p>
		</div>
	</header>

	{#if data.items.length}
		<ul class="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
			{#each data.items as c (c.slug)}
				<li><CalculatorTile calc={c} /></li>
			{/each}
		</ul>
	{:else}
		<p class="rounded-card bg-surface p-6 text-label-2">
			We’re building these tools now. Meanwhile, <a href="/search">search all calculators</a>.
		</p>
	{/if}
</div>
