import { CALCULATORS, CATEGORIES } from '#lib/calculators/catalog.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	groups: CATEGORIES.map((c) => ({
		name: c.name,
		slug: c.slug,
		items: CALCULATORS.filter((x) => x.category === c.id).map((x) => ({ slug: x.slug, name: x.name }))
	})).filter((g) => g.items.length)
});
