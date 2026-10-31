<script lang="ts">
	import { parseRich } from '../calculators/richtext';

	let { text }: { text: string } = $props();
	const parts = $derived(parseRich(text));
</script>

{#each parts as p, i (i)}{#if p.t === 'link'}<a href={p.href}>{p.v}</a>{:else if p.t === 'bold'}<strong class="font-semibold text-label">{p.v}</strong>{:else}{p.v}{/if}{/each}
