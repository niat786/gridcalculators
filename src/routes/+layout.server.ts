import { ACTIVE_CATEGORIES } from '#lib/calculators/catalog.ts';
import type { LayoutServerLoad } from './$types';

// Only categories that have calculators appear in the header and footer.
export const load: LayoutServerLoad = () => ({
	activeCategories: ACTIVE_CATEGORIES.map((c) => c.id)
});
