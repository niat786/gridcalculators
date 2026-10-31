/**
 * The catalog: metadata for every calculator, collected at build time from *.meta.ts files.
 * Import this only from server code (+page.server.ts, +server.ts, param matchers) so it never
 * ships to the browser.
 */
import { CATEGORY_BY_ID, CATEGORIES } from './categories';
import type { CalculatorMeta, CategoryId } from './types';

const modules = import.meta.glob<CalculatorMeta>('./*/*.meta.ts', {
	eager: true,
	import: 'default'
});

export const CALCULATORS: CalculatorMeta[] = Object.values(modules).sort((a, b) =>
	a.name.localeCompare(b.name)
);

const bySlug = new Map(CALCULATORS.map((c) => [c.slug, c]));
if (bySlug.size !== CALCULATORS.length) throw new Error('Duplicate calculator slug in catalog');
for (const c of CALCULATORS) {
	if (!CATEGORY_BY_ID[c.category]) throw new Error(`Unknown category "${c.category}" in ${c.slug}`);
	if (c.metaTitle.length > 60) console.warn(`[seo] metaTitle over 60 chars: ${c.slug}`);
	if (c.metaDescription.length > 160) console.warn(`[seo] metaDescription over 160 chars: ${c.slug}`);
}

export function getCalculator(slug: string): CalculatorMeta | undefined {
	return bySlug.get(slug);
}

export function calculatorsIn(category: CategoryId): CalculatorMeta[] {
	return CALCULATORS.filter((c) => c.category === category);
}

export function popularCalculators(limit = 8): CalculatorMeta[] {
	return CALCULATORS.filter((c) => c.popularRank !== undefined)
		.sort((a, b) => (a.popularRank ?? 0) - (b.popularRank ?? 0))
		.slice(0, limit);
}

/** Same-category calculators first, then popular ones, never the calculator itself. */
export function relatedCalculators(slug: string, limit = 6): CalculatorMeta[] {
	const self = bySlug.get(slug);
	if (!self) return [];
	const picked = new Set<string>([slug]);
	const out: CalculatorMeta[] = [];
	const add = (c: CalculatorMeta | undefined) => {
		if (c && !picked.has(c.slug) && out.length < limit) {
			picked.add(c.slug);
			out.push(c);
		}
	};
	// 1. Hand-picked in the meta. 2. Same country tools. 3. Same category, by shared keywords. 4. Popular.
	for (const s of self.related ?? []) add(bySlug.get(s));
	if (self.region) for (const c of CALCULATORS) if (c.region === self.region) add(c);
	const words = new Set(self.keywords.join(' ').toLowerCase().split(/\W+/).filter((w) => w.length > 3));
	const score = (c: CalculatorMeta) => c.keywords.join(' ').toLowerCase().split(/\W+/).filter((w) => words.has(w)).length;
	const same = calculatorsIn(self.category)
		.filter((c) => !c.region || c.region === self.region)
		.map((c) => ({ c, s: score(c) }))
		.sort((a, b) => b.s - a.s);
	for (const { c } of same) add(c);
	for (const c of popularCalculators(20)) add(c);
	return out;
}

/** A card-sized projection that is safe and small to serialize into page data. */
export type CalculatorCard = Pick<
	CalculatorMeta,
	'slug' | 'name' | 'shortDescription' | 'icon' | 'category' | 'region'
>;

export function toCard(c: CalculatorMeta): CalculatorCard {
	return {
		slug: c.slug,
		name: c.name,
		shortDescription: c.shortDescription,
		icon: c.icon,
		category: c.category,
		...(c.region ? { region: c.region } : {})
	};
}

/** Categories with at least one calculator. Empty ones stay hidden until they have tools. */
export const ACTIVE_CATEGORIES = CATEGORIES.filter((c) => CALCULATORS.some((x) => x.category === c.id));

export { CATEGORIES };

// Guard: every <slug>.meta.ts must sit next to <slug>.calc.ts with the same name.
for (const [path, meta] of Object.entries(modules)) {
	const fileSlug = path.split('/').pop()!.replace('.meta.ts', '');
	if (fileSlug !== meta.slug) throw new Error(`${path}: file name must equal slug "${meta.slug}"`);
}
