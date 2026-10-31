import { absoluteUrl, SITE } from '../site';

/**
 * Serialize JSON-LD for a <script type="application/ld+json"> block.
 * Escapes "<", ">" and "&" so content can never close the script tag (XSS-safe).
 */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

export const ORG_ID = `${SITE.origin}/#organization`;
export const WEBSITE_ID = `${SITE.origin}/#website`;

export function organization() {
	return {
		'@type': 'Organization',
		'@id': ORG_ID,
		name: SITE.name,
		url: SITE.origin + '/',
		logo: absoluteUrl('/icon-512.png')
	};
}

export function website() {
	return {
		'@type': 'WebSite',
		'@id': WEBSITE_ID,
		name: SITE.name,
		url: SITE.origin + '/',
		description: SITE.description,
		publisher: { '@id': ORG_ID },
		inLanguage: 'en'
	};
}

export function breadcrumbs(items: { name: string; path: string }[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.name,
			item: absoluteUrl(it.path)
		}))
	};
}

export function faqPage(faq: { q: string; a: string }[]) {
	return {
		'@type': 'FAQPage',
		mainEntity: faq.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	};
}

export function graph(...nodes: object[]) {
	return { '@context': 'https://schema.org', '@graph': nodes };
}

/** HowTo for the "How to use this calculator" steps. */
export function howTo(id: string, name: string, steps: string[]) {
	return {
		'@type': 'HowTo',
		'@id': id,
		name,
		step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text }))
	};
}

export interface CalculatorPageLd {
	url: string;
	name: string;
	title: string;
	description: string;
	applicationCategory: string;
	dateModified: string;
	areaServed?: { type: 'Country' | 'Place'; name: string };
	crumbs: { name: string; path: string }[];
	howToSteps: string[];
	faq: { q: string; a: string }[];
	keywords?: string[];
}

/**
 * Full JSON-LD graph for a calculator page: Organization, WebSite, WebPage, WebApplication,
 * BreadcrumbList, HowTo and FAQPage, linked by @id. All text must already be plain (no markup).
 * No ratings or reviews are ever emitted: we don't collect them, and inventing them breaks Google's rules.
 */
export function calculatorPage(p: CalculatorPageLd) {
	const page = `${p.url}#webpage`;
	const app = `${p.url}#app`;
	const crumbs = `${p.url}#breadcrumb`;
	return graph(
		organization(),
		website(),
		{
			'@type': 'WebPage',
			'@id': page,
			url: p.url,
			name: p.title,
			description: p.description,
			inLanguage: 'en',
			isPartOf: { '@id': WEBSITE_ID },
			breadcrumb: { '@id': crumbs },
			mainEntity: { '@id': app },
			dateModified: p.dateModified,
			publisher: { '@id': ORG_ID }
		},
		{
			'@type': 'WebApplication',
			'@id': app,
			name: p.name,
			url: p.url,
			description: p.description,
			applicationCategory: p.applicationCategory,
			operatingSystem: 'Any',
			browserRequirements: 'Requires JavaScript',
			isAccessibleForFree: true,
			inLanguage: 'en',
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			dateModified: p.dateModified,
			...(p.keywords?.length ? { keywords: p.keywords.join(', ') } : {}),
			...(p.areaServed ? { areaServed: { '@type': p.areaServed.type, name: p.areaServed.name } } : {}),
			publisher: { '@id': ORG_ID }
		},
		{ ...breadcrumbs(p.crumbs), '@id': crumbs },
		howTo(`${p.url}#howto`, `How to use the ${p.name}`, p.howToSteps),
		{ ...faqPage(p.faq), '@id': `${p.url}#faq` }
	);
}
