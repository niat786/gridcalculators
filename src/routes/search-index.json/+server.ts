import { json } from '@sveltejs/kit';
import { CALCULATORS } from '#lib/calculators/catalog.ts';
import { CATEGORY_BY_ID } from '#lib/calculators/categories.ts';
import type { SearchEntry } from '#lib/search.ts';

export const prerender = true;

export function GET() {
	const index: SearchEntry[] = CALCULATORS.map((c) => ({
		n: c.name,
		s: c.slug,
		d: c.shortDescription,
		c: CATEGORY_BY_ID[c.category].name,
		k: c.keywords.join(' ').toLowerCase()
	}));
	return json(index);
}
