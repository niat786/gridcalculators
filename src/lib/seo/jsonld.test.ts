/**
 * Every calculator page must emit valid, consistent JSON-LD (schema.org). This builds the same graph the page
 * builds and checks the parts Google's validators care about.
 */
import { describe, expect, it } from 'vitest';
import type { CalculatorConfig } from '../calculators/types';
import { CATEGORY_BY_ID } from '../calculators/categories';
import { plainText } from '../calculators/richtext';
import { REGIONS } from '../calculators/regions';
import { absoluteUrl } from '../site';
import { calculatorPage, serializeJsonLd } from './jsonld';

const configs = import.meta.glob<CalculatorConfig>('../calculators/*/*.calc.ts', { eager: true, import: 'default' });

type Node = Record<string, any>;

describe.each(Object.values(configs).map((c) => [c.meta.slug, c] as const))('%s JSON-LD', (_slug, config) => {
	const { meta, content } = config;
	const cat = CATEGORY_BY_ID[meta.category];
	const url = absoluteUrl(`/${meta.slug}`);
	const ld = calculatorPage({
		url,
		name: meta.name,
		title: meta.metaTitle,
		description: meta.metaDescription,
		applicationCategory: cat.schemaCategory,
		dateModified: meta.updated,
		keywords: meta.keywords,
		...(meta.region ? { areaServed: { type: meta.region === 'GCC' ? 'Place' : 'Country', name: REGIONS[meta.region].name } } : {}),
		crumbs: [
			{ name: 'Home', path: '/' },
			{ name: cat.name, path: `/${cat.slug}` },
			{ name: meta.name, path: `/${meta.slug}` }
		],
		howToSteps: content.howTo.map(plainText),
		faq: content.faq.map((f) => ({ q: plainText(f.q), a: plainText(f.a) }))
	});
	const nodes = (ld as { '@graph': Node[] })['@graph'];
	const byType = (t: string) => nodes.find((n) => n['@type'] === t)!;

	it('serializes to valid JSON with a schema.org context', () => {
		const json = serializeJsonLd(ld);
		const back = JSON.parse(json);
		expect(back['@context']).toBe('https://schema.org');
		expect(json).not.toMatch(/<\/script/i);
		expect(json).not.toMatch(/\]\(\/|\*\*/); // no leftover link or bold markup
	});

	it('has every node type with its required properties', () => {
		for (const t of ['Organization', 'WebSite', 'WebPage', 'WebApplication', 'BreadcrumbList', 'HowTo', 'FAQPage'])
			expect(byType(t), t).toBeTruthy();
		const app = byType('WebApplication');
		expect(app.name).toBeTruthy();
		expect(app.url).toBe(url);
		expect(app.applicationCategory).toMatch(/Application$/);
		expect(app.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
		expect(app.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(app.aggregateRating).toBeUndefined(); // never invent ratings
		const page = byType('WebPage');
		expect(page.mainEntity['@id']).toBe(app['@id']);
		expect(page.breadcrumb['@id']).toBe(byType('BreadcrumbList')['@id']);
	});

	it('has well-formed breadcrumbs, HowTo steps and FAQ answers', () => {
		const items = byType('BreadcrumbList').itemListElement as Node[];
		expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
		for (const i of items) expect(i.item).toMatch(/^https:\/\//);
		const steps = byType('HowTo').step as Node[];
		expect(steps.length).toBeGreaterThanOrEqual(2);
		for (const s of steps) expect(s.text.trim().length).toBeGreaterThan(5);
		const qs = byType('FAQPage').mainEntity as Node[];
		expect(qs.length).toBeGreaterThanOrEqual(3);
		for (const q of qs) {
			expect(q['@type']).toBe('Question');
			expect(q.name.trim().length).toBeGreaterThan(5);
			expect(q.acceptedAnswer.text.trim().length).toBeGreaterThan(10);
		}
	});
});
