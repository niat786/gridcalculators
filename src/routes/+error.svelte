<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Something went wrong'} | GridCalculators</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-xl px-4 py-24 text-center">
	<p class="text-subhead font-semibold text-label-2">Error {page.status}</p>
	<h1 class="mt-2 text-title1 font-bold tracking-tight">
		{page.status === 404 ? 'We couldn’t find that page.' : 'Something went wrong.'}
	</h1>
	<p class="mt-3 text-label-2">Try searching for the calculator you need.</p>
	<p class="mt-8 flex flex-wrap justify-center gap-3">
		<a href="/search" class="rounded-full bg-accent px-5 py-3 font-semibold text-white no-underline">Search calculators</a>
		<a href="/" class="rounded-full bg-fill px-5 py-3 font-semibold text-label no-underline">Go home</a>
	</p>
</section>
