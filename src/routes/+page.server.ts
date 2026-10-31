import { ACTIVE_CATEGORIES, CALCULATORS, calculatorsIn, popularCalculators, toCard } from '#lib/calculators/catalog.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	popular: popularCalculators(8).map(toCard),
	total: CALCULATORS.length,
	categories: ACTIVE_CATEGORIES.map((c) => {
		const all = calculatorsIn(c.id);
		return { id: c.id, items: all.slice(0, 5).map(toCard), total: all.length };
	})
});
