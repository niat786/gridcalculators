/** Site-wide constants. Change the origin here and in vite.config.ts (paths.origin). */
export const SITE = {
	name: 'GridCalculators',
	domain: 'GridCalculators.com',
	origin: 'https://gridcalculators.com',
	tagline: 'Free online calculators for finance, health, math and everyday life.',
	description:
		'Free, fast and private online calculators for money, health, math and everyday life. Every result shows the formula and updates as you type.',
	contactEmail: 'contact@gridcalculators.com',
	/**
	 * Who runs the site (the "data controller" under GDPR). Fill these in before launch in Europe:
	 * GDPR Art. 13 requires the controller's identity and contact details. Shown on /privacy and /terms when set.
	 */
	operator: '',
	/** Postal address of the operator (city and country at minimum). */
	postalAddress: '',
	locale: 'en_US'
} as const;

export function absoluteUrl(path: string): string {
	return new URL(path, SITE.origin).href;
}
