<script lang="ts">
	import AdSlot from '#lib/components/AdSlot.svelte';
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import CalculatorTile from '#lib/components/CalculatorTile.svelte';
	import CalculatorView from '#lib/components/calculator/CalculatorView.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import { calculatorPage } from '#lib/seo/jsonld.ts';
	import { plainText } from '#lib/calculators/richtext.ts';
	import { absoluteUrl } from '#lib/site.ts';
	import { REGIONS } from '#lib/calculators/regions.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();


	const meta = $derived(data.config.meta);
	const content = $derived(data.config.content);
	const path = $derived(`/${meta.slug}`);
	const crumbs = $derived([
		{ name: 'Home', path: '/' },
		{ name: data.category.name, path: `/${data.category.slug}` },
		{ name: meta.name, path }
	]);
	const updated = $derived(
		new Date(`${meta.updated}T00:00:00Z`).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		})
	);

	const jsonLd = $derived(
		calculatorPage({
			url: absoluteUrl(path),
			name: meta.name,
			title: meta.metaTitle,
			description: meta.metaDescription,
			applicationCategory: data.category.schemaCategory,
			dateModified: meta.updated,
			keywords: meta.keywords,
			...(meta.region ? { areaServed: { type: meta.region === 'GCC' ? 'Place' : 'Country', name: REGIONS[meta.region].name } } : {}),
			crumbs,
			howToSteps: content.howTo.map(plainText),
			faq: content.faq.map((f) => ({ q: plainText(f.q), a: plainText(f.a) }))
		})
	);
</script>

<Seo title={meta.metaTitle} description={meta.metaDescription} {path} {jsonLd} />

<div class="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6 sm:pt-8">
	<Breadcrumbs items={crumbs} />

	<header class="mt-4 mb-6 max-w-3xl sm:mb-8">
		<h1 class="text-large font-bold tracking-tight sm:text-[2.75rem] sm:leading-tight">{meta.name}</h1>
		<p class="mt-2 text-label-2 sm:text-[1.1875rem] sm:leading-relaxed">{content.intro}</p>
		{#if meta.region}
			<div class="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
				<span class="mt-0.5 shrink-0 rounded-md bg-accent/12 px-2 py-0.5 text-caption font-bold tracking-wide text-accent-text">{meta.region}</span>
				<p class="text-subhead text-label">
					<strong class="font-semibold">For {REGIONS[meta.region].the} only.</strong>
					{meta.regionNote ?? `It uses ${REGIONS[meta.region].the} rules, so results won’t apply in other countries.`}
				</p>
			</div>
		{/if}
	</header>

	{#key meta.slug}
		{#if data.widget && data.config.widget}
			<div class="mx-auto max-w-3xl">
				<data.widget {...data.config.widget.props} label={meta.name} />
			</div>
		{:else}
			<CalculatorView config={data.config} buildDate={data.buildDate} />
		{/if}
	{/key}

	<AdSlot placement="top" size="banner" class="my-10" />

	<div class="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
		<article class="max-w-3xl min-w-0 space-y-12">
			<section aria-labelledby="howto-h">
				<h2 id="howto-h" class="text-title2 font-bold tracking-tight">How to use this calculator</h2>
				<ol class="mt-4 space-y-3">
					{#each content.howTo as step, i (i)}
						<li class="flex gap-3">
							<span class="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold">{i + 1}</span>
							<span class="pt-0.5"><RichText text={step} /></span>
						</li>
					{/each}
				</ol>
			</section>

			{#each content.about ?? [] as sec, si (si)}
				<section aria-labelledby="about-{si}" class="prose-section">
					<h2 id="about-{si}" class="text-title2 font-bold tracking-tight">{sec.heading}</h2>
					<div class="mt-4 space-y-4 leading-relaxed">
						{#each sec.paragraphs as para, pi (pi)}<p><RichText text={para} /></p>{/each}
					</div>
					{#if sec.list?.length}
						<ul class="mt-4 list-disc space-y-2 pl-6 marker:text-label-3">
							{#each sec.list as item, li (li)}<li><RichText text={item} /></li>{/each}
						</ul>
					{/if}
					{#if sec.table}
						<div class="mt-5 overflow-x-auto rounded-card bg-surface">
							<table class="w-full text-left text-subhead">
								{#if sec.table.caption}<caption class="px-4 pt-3 text-left text-footnote text-label-2">{sec.table.caption}</caption>{/if}
								<thead>
									<tr class="border-b border-separator">
										{#each sec.table.columns as c, ci (ci)}<th scope="col" class="px-4 py-3 font-semibold">{c}</th>{/each}
									</tr>
								</thead>
								<tbody>
									{#each sec.table.rows as row, ri (ri)}
										<tr class="border-b border-separator last:border-b-0">
											{#each row as cell, ci (ci)}<td class="tabular px-4 py-2.5 {ci ? 'text-label-2' : ''}"><RichText text={cell} /></td>{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			{/each}

			<section aria-labelledby="formula-h">
				<h2 id="formula-h" class="text-title2 font-bold tracking-tight">The formula</h2>
				<div class="mt-4 space-y-4">
					{#each content.formulas as f, i (i)}
						<div class="rounded-card bg-surface p-5">
							{#if f.title}<h3 class="mb-2 text-subhead font-semibold text-label-2">{f.title}</h3>{/if}
							<p class="overflow-x-auto font-mono text-callout leading-relaxed whitespace-pre-line text-label">{f.expression}</p>
							{#if f.variables.length}
								<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-separator pt-4 text-subhead">
									{#each f.variables as v (v.symbol)}
										<dt class="font-mono font-semibold">{v.symbol}</dt>
										<dd class="text-label-2">{v.meaning}</dd>
									{/each}
								</dl>
							{/if}
						</div>
					{/each}
				</div>
			</section>

			<section aria-labelledby="example-h">
				<h2 id="example-h" class="text-title2 font-bold tracking-tight">Worked example</h2>
				<p class="mt-2 text-label-2">{content.example.title}</p>
				<ol class="mt-4 space-y-2 rounded-card bg-surface p-5">
					{#each content.example.steps as s, i (i)}
						<li class="tabular flex gap-3 border-b border-separator pb-2 last:border-b-0 last:pb-0">
							<span class="text-label-2">{i + 1}.</span><span class="min-w-0 [overflow-wrap:anywhere]">{s}</span>
						</li>
					{/each}
				</ol>
				<p class="mt-4 flex gap-2 font-semibold">
					<Icon name="check" size={20} strokeWidth={2.2} class="mt-0.5 shrink-0 text-accent-text" />{content.example.result}
				</p>
			</section>

			<AdSlot placement="inContent" size="rectangle" class="lg:hidden" />

			<section aria-labelledby="faq-h">
				<h2 id="faq-h" class="text-title2 font-bold tracking-tight">Frequently asked questions</h2>
				<div class="mt-4 overflow-hidden rounded-card bg-surface">
					{#each content.faq as f, i (i)}
						<details class="group {i > 0 ? 'border-t border-separator' : ''}">
							<summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
								<h3>{f.q}</h3>
								<span class="shrink-0 text-label-2 transition-transform group-open:rotate-180"><Icon name="chevronDown" size={20} /></span>
							</summary>
							<p class="px-5 pb-5 text-label-2"><RichText text={f.a} /></p>
						</details>
					{/each}
				</div>
			</section>

			{#if content.sources?.length}
				<section aria-labelledby="sources-h">
					<h2 id="sources-h" class="text-title3 font-semibold">Sources</h2>
					<ul class="mt-3 space-y-2 text-subhead">
						{#each content.sources as s, si (si)}
							<li><a href={s.url} rel="noopener noreferrer nofollow" target="_blank">{s.title}</a></li>
						{/each}
					</ul>
				</section>
			{/if}

			<p class="text-footnote text-label-2">
				Last reviewed <time datetime={meta.updated}>{updated}</time> by the GridCalculators team.
			</p>
		</article>

		<aside class="hidden lg:block" aria-label="Sidebar">
			<div class="sticky top-20">
				<AdSlot placement="sidebar" size="tower" />
			</div>
		</aside>
	</div>

	{#if data.related.length}
		<section aria-labelledby="related-h" class="mt-16">
			<h2 id="related-h" class="mb-4 text-title2 font-bold tracking-tight">Related calculators</h2>
			<ul class="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
				{#each data.related as c (c.slug)}
					<li><CalculatorTile calc={c} /></li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
