/** Site-wide constants. Change the origin here and in vite.config.ts (paths.origin). */
export const SITE = {
	name: 'GridCalculators',
	domain: 'GridCalculators.com',
	origin: 'https://gridcalculators.com',
	tagline: 'Free online calculators for finance, health, math and everyday life.',
	description:
		'Free, fast and private online calculators for money, health, math and everyday life. Every result shows the formula and updates as you type.',
	contactEmail: '[YOUR CONTACT EMAIL]',
	locale: 'en_US'
} as const;

export function absoluteUrl(path: string): string {
	return new URL(path, SITE.origin).href;
}
