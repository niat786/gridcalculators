import { error } from '@sveltejs/kit';
import { CALCULATORS, getCalculator, relatedCalculators, toCard } from '#lib/calculators/catalog.ts';
import { CATEGORY_BY_ID } from '#lib/calculators/categories.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => CALCULATORS.map((c) => ({ slug: c.slug }));

const buildDate = new Date().toISOString().slice(0, 10);

export const load: PageServerLoad = ({ params }) => {
	const meta = getCalculator(params.slug);
	if (!meta) error(404, 'Calculator not found');
	const cat = CATEGORY_BY_ID[meta.category];
	return {
		buildDate,
		category: { id: cat.id, name: cat.name, slug: cat.slug, schemaCategory: cat.schemaCategory },
		related: relatedCalculators(meta.slug, 6).map(toCard)
	};
};
