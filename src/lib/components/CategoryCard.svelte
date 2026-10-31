<script lang="ts">
	import type { CalculatorCard } from '../calculators/catalog';
	import type { Category } from '../calculators/categories';
	import { TONE_TILE } from '../tones';
	import Icon from './Icon.svelte';

	let { category, items, total }: { category: Category; items: CalculatorCard[]; total: number } =
		$props();
</script>

<section aria-labelledby="cat-{category.id}" class="flex flex-col gap-4 rounded-card bg-surface p-5 sm:p-6">
	<div class="flex items-center gap-3.5">
		<span class="flex size-11 shrink-0 items-center justify-center rounded-xl {TONE_TILE[category.id]}">
			<Icon name={category.icon} size={22} />
		</span>
		<div>
			<h3 id="cat-{category.id}" class="text-title3 font-semibold">
				<a href="/{category.slug}" class="text-label no-underline hover:underline">{category.name}</a>
			</h3>
			<p class="text-subhead text-label-2">{category.tagline}</p>
		</div>
	</div>
	{#if items.length}
		<ul>
			{#each items as c (c.slug)}
				<li class="border-t border-separator">
					<a href="/{c.slug}" class="flex min-h-11 items-center justify-between py-2 text-label no-underline hover:text-accent-text">
						{c.name}
						<Icon name="chevronRight" size={16} class="text-label-3" />
					</a>
				</li>
			{/each}
		</ul>
		<a href="/{category.slug}" class="mt-auto text-subhead font-medium">
			{total > items.length ? `All ${total} ${category.name.toLowerCase()} calculators` : `Browse ${category.name.toLowerCase()}`} ›
		</a>
	{:else}
		<p class="border-t border-separator pt-3 text-subhead text-label-2">New tools coming soon.</p>
	{/if}
</section>
