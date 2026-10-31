import { CALCULATORS, CATEGORIES, toCard } from '#lib/calculators/catalog.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	groups: CATEGORIES.map((c) => ({
		id: c.id,
		name: c.name,
		slug: c.slug,
		items: CALCULATORS.filter((x) => x.category === c.id).map(toCard)
	})).filter((g) => g.items.length)
});
