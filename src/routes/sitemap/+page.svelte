<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title="All calculators" description="Every calculator on GridCalculators, grouped by category." path="/sitemap" />

<div class="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
	<h1 class="text-large font-bold tracking-tight">All calculators</h1>
	<div class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.groups as g (g.slug)}
			<section>
				<h2 class="mb-2 text-title3 font-semibold"><a href="/{g.slug}" class="text-label">{g.name}</a></h2>
				<ul class="space-y-1">
					{#each g.items as c (c.slug)}
						<li><a href="/{c.slug}" class="inline-block py-1">{c.name}</a></li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</div>
