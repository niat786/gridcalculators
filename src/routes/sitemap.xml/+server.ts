import { CALCULATORS, calculatorsIn } from '#lib/calculators/catalog.ts';
import { CATEGORIES } from '#lib/calculators/categories.ts';
import { absoluteUrl } from '#lib/site.ts';

export const prerender = true;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function GET() {
	const latest = CALCULATORS.map((c) => c.updated).sort().at(-1);
	const urls: { loc: string; lastmod?: string }[] = [
		{ loc: absoluteUrl('/'), lastmod: latest },
		...CATEGORIES.filter((c) => calculatorsIn(c.id).length).map((c) => ({
			loc: absoluteUrl(`/${c.slug}`),
			lastmod: calculatorsIn(c.id).map((x) => x.updated).sort().at(-1)
		})),
		...CALCULATORS.map((c) => ({ loc: absoluteUrl(`/${c.slug}`), lastmod: c.updated })),
		...['/about', '/contact', '/privacy', '/terms', '/sitemap'].map((p) => ({ loc: absoluteUrl(p) }))
	];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		urls
			.map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
			.join('\n') +
		'\n</urlset>\n';
	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
