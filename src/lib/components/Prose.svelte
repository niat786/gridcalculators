<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, updated, children }: { title: string; updated?: string; children: Snippet } = $props();
</script>

<article
	class="mx-auto max-w-2xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-title2 [&_h2]:font-bold [&_h2]:tracking-tight [&_li]:mt-2 [&_p]:mt-4 [&_p]:text-label [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-fill [&_code]:px-1 [&_code]:text-footnote [&_a]:underline-offset-2"
>
	<h1 class="text-large font-bold tracking-tight">{title}</h1>
	{#if updated}<p class="text-footnote !text-label-2">Last updated {updated}</p>{/if}
	{@render children()}
</article>
