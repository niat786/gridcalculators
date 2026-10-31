<script lang="ts">
	import Icon from './Icon.svelte';

	let { items }: { items: { name: string; path: string }[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="text-footnote text-label-2">
	<ol class="flex flex-wrap items-center gap-1">
		{#each items as it, i (it.path)}
			<li class="flex items-center gap-1">
				{#if i < items.length - 1}
					<a href={it.path} class="text-label-2 hover:text-accent-text">{it.name}</a>
					<Icon name="chevronRight" size={14} class="text-label-3" />
				{:else}
					<span aria-current="page" class="text-label">{it.name}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
