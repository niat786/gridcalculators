<script lang="ts">
	import '../app.css';
	import Footer from '#lib/components/Footer.svelte';
	import Header from '#lib/components/Header.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
	>Skip to content</a
>
<Header active={data.activeCategories} />
<main id="main" tabindex="-1" class="outline-none">
	{@render children()}
</main>
<Footer active={data.activeCategories} />
