<script lang="ts">
	import { absoluteUrl, SITE } from '../site';
	import { serializeJsonLd } from '../seo/jsonld';

	interface Props {
		title: string;
		description: string;
		/** Path without query string, e.g. "/bmi-calculator". Canonical never carries inputs. */
		path: string;
		/** Append " | GridCalculators" to the title (default true). */
		brand?: boolean;
		jsonLd?: object;
		noindex?: boolean;
		ogType?: 'website' | 'article';
	}
	let { title, description, path, brand = true, jsonLd, noindex = false, ogType = 'website' }: Props =
		$props();

	const fullTitle = $derived(brand ? `${title} | ${SITE.name}` : title);
	const url = $derived(absoluteUrl(path));
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}<meta name="robots" content="noindex, follow" />{/if}
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:locale" content={SITE.locale} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={absoluteUrl('/og-default.png')} />
	<meta name="twitter:card" content="summary_large_image" />
	{#if jsonLd}
		{@html `<script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`}
	{/if}
</svelte:head>
