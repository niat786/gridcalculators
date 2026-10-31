<script lang="ts">
	import { CATEGORIES as ALL } from '../calculators/categories';
	import type { CategoryId } from '../calculators/types';
	import { SITE } from '../site';
	import Logo from './Logo.svelte';

	let { active }: { active: CategoryId[] } = $props();
	const CATEGORIES = $derived(ALL.filter((c) => active.includes(c.id)));
	const year = new Date().getFullYear();
</script>

<footer class="bg-fill pb-[env(safe-area-inset-bottom)] text-footnote text-label-2">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 pt-12 pb-8 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
		<div>
			<p class="flex items-center gap-2 text-subhead font-semibold text-label">
				<Logo size={20} /> GridCalculators
			</p>
			<p class="mt-3 max-w-xs">{SITE.tagline}</p>
		</div>
		<nav aria-label="Categories" class="flex flex-col">
			<h2 class="mb-1 font-semibold text-label">Categories</h2>
			{#each CATEGORIES as c (c.id)}
				<a href="/{c.slug}" class="py-1.5 text-link">{c.name}</a>
			{/each}
		</nav>
		<nav aria-label="Company" class="flex flex-col">
			<h2 class="mb-1 font-semibold text-label">GridCalculators</h2>
			<a href="/about" class="py-1.5 text-link">About</a>
			<a href="/contact" class="py-1.5 text-link">Contact</a>
			<a href="/privacy" class="py-1.5 text-link">Privacy Policy</a>
			<a href="/terms" class="py-1.5 text-link">Terms of Use</a>
			<a href="/sitemap" class="py-1.5 text-link">All calculators</a>
		</nav>
	</div>
	<div class="mx-auto max-w-6xl border-t border-separator px-4 pt-4 pb-8 sm:px-6">
		© {year} {SITE.domain}. Results are estimates for information only and are not financial, medical or legal advice.
	</div>
</footer>
