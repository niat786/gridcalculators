import { error } from '@sveltejs/kit';
import { ACTIVE_CATEGORIES, calculatorsIn, toCard } from '#lib/calculators/catalog.ts';
import { CATEGORY_BY_SLUG } from '#lib/calculators/categories.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => ACTIVE_CATEGORIES.map((c) => ({ slug: c.slug }));

export const load: PageServerLoad = ({ params }) => {
	const category = CATEGORY_BY_SLUG[params.slug];
	if (!category) error(404, 'Category not found');
	return { categoryId: category.id, items: calculatorsIn(category.id).map(toCard) };
};
