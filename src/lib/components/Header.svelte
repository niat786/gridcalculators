<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { CATEGORIES as ALL } from '../calculators/categories';
	import type { CategoryId } from '../calculators/types';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';
	import { TONE_TILE } from '../tones';

	let { active }: { active: CategoryId[] } = $props();
	const CATEGORIES = $derived(ALL.filter((c) => active.includes(c.id)));

	let menu: HTMLDetailsElement | undefined = $state();
	// The menu is a native <details>, so it works before (or without) JavaScript.
	afterNavigate(() => {
		if (menu) menu.open = false;
	});
</script>

<header class="glass sticky top-0 z-40 border-b border-separator pt-[env(safe-area-inset-top)]">
	<nav aria-label="Main" class="mx-auto flex h-13 max-w-6xl items-center gap-2 pr-2 pl-4 sm:px-6">
		<a href="/" class="flex min-h-11 items-center gap-2.5 text-body font-semibold tracking-tight text-label no-underline">
			<Logo />
			<span>GridCalculators</span>
		</a>

		<ul class="ml-4 hidden flex-1 items-center gap-1 text-subhead lg:flex">
			{#each CATEGORIES as c (c.id)}
				<li>
					<a href="/{c.slug}" class="rounded-lg px-2.5 py-2 text-label hover:bg-fill">{c.name}</a>
				</li>
			{/each}
		</ul>

		<div class="ml-auto flex items-center">
			<a
				href="/search"
				aria-label="Search calculators"
				class="flex size-11 items-center justify-center rounded-full text-label hover:bg-fill"
			>
				<Icon name="search" size={20} strokeWidth={2} />
			</a>
			<details bind:this={menu} class="group lg:hidden">
				<summary
					aria-label="Categories menu"
					class="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-label hover:bg-fill [&::-webkit-details-marker]:hidden"
				>
					<span class="group-open:hidden"><Icon name="menu" size={20} strokeWidth={2} /></span>
					<span class="hidden group-open:inline"><Icon name="close" size={20} strokeWidth={2} /></span>
				</summary>
				<div class="absolute inset-x-0 top-full border-b border-separator bg-canvas px-4 pt-2 pb-4 shadow-lg">
					<ul class="overflow-hidden rounded-card bg-surface">
						{#each CATEGORIES as c, i (c.id)}
							<li>
								<a href="/{c.slug}" class="flex min-h-13 items-center gap-3 pl-4 text-label no-underline">
									<span class="flex size-8 shrink-0 items-center justify-center rounded-lg {TONE_TILE[c.id]}">
										<Icon name={c.icon} size={18} />
									</span>
									<span class="flex min-h-13 flex-1 items-center justify-between pr-4 {i < CATEGORIES.length - 1 ? 'border-b border-separator' : ''}">
										{c.name}
										<Icon name="chevronRight" size={16} class="text-label-3" />
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</details>
		</div>
	</nav>
</header>
