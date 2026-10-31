<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBox from '#lib/components/SearchBox.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let query = $state('');
	let count = $state(-1);

	// The page is prerendered, so ?q= is read in the browser.
	onMount(() => {
		query = new URLSearchParams(location.search).get('q')?.slice(0, 100) ?? '';
	});
</script>

<Seo title="Search calculators" description="Search every GridCalculators calculator by name or topic." path="/search" noindex />

<div class="mx-auto max-w-2xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
	<h1 class="mb-5 text-large font-bold tracking-tight">Search</h1>
	<SearchBox id="page-search" autofocus inline bind:value={query} onresults={(r) => (count = r.length)} />
	{#if query.trim() && count === 0}
		<p class="mt-4 text-label-2">No calculators match “{query}”. Try a simpler word, or browse below.</p>
	{/if}

	{#if !query.trim() || count === 0}
		<div class="mt-10 space-y-8">
			{#each data.groups as g (g.id)}
				<section aria-labelledby="g-{g.id}">
					<h2 id="g-{g.id}" class="mb-2 text-subhead font-semibold text-label-2 uppercase">{g.name}</h2>
					<ul class="overflow-hidden rounded-card bg-surface">
						{#each g.items as c, i (c.slug)}
							<li class={i ? 'border-t border-separator' : ''}>
								<a href="/{c.slug}" class="flex min-h-12 items-center px-4 text-label no-underline hover:bg-fill">{c.name}</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
