import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './shoe-size-conversion.meta';

type Row = { us: number; uk: number; eu: string; cm: number };

/** Common retail chart (Brannock-based). Brands differ by up to half a size. */
export const CHART: Record<'men' | 'women', Row[]> = {
	men: [
		{ us: 6, uk: 5.5, eu: '39', cm: 24 },
		{ us: 6.5, uk: 6, eu: '39', cm: 24.5 },
		{ us: 7, uk: 6.5, eu: '40', cm: 25 },
		{ us: 7.5, uk: 7, eu: '40–41', cm: 25.5 },
		{ us: 8, uk: 7.5, eu: '41', cm: 26 },
		{ us: 8.5, uk: 8, eu: '41–42', cm: 26.5 },
		{ us: 9, uk: 8.5, eu: '42', cm: 27 },
		{ us: 9.5, uk: 9, eu: '42–43', cm: 27.5 },
		{ us: 10, uk: 9.5, eu: '43', cm: 28 },
		{ us: 10.5, uk: 10, eu: '43–44', cm: 28.5 },
		{ us: 11, uk: 10.5, eu: '44', cm: 29 },
		{ us: 11.5, uk: 11, eu: '44–45', cm: 29.5 },
		{ us: 12, uk: 11.5, eu: '45', cm: 30 },
		{ us: 13, uk: 12.5, eu: '46', cm: 31 },
		{ us: 14, uk: 13.5, eu: '47', cm: 32 },
		{ us: 15, uk: 14.5, eu: '48', cm: 33 }
	],
	women: [
		{ us: 4, uk: 2, eu: '35', cm: 21 },
		{ us: 4.5, uk: 2.5, eu: '35', cm: 21.5 },
		{ us: 5, uk: 3, eu: '35–36', cm: 22 },
		{ us: 5.5, uk: 3.5, eu: '36', cm: 22.5 },
		{ us: 6, uk: 4, eu: '36–37', cm: 23 },
		{ us: 6.5, uk: 4.5, eu: '37', cm: 23.5 },
		{ us: 7, uk: 5, eu: '37–38', cm: 24 },
		{ us: 7.5, uk: 5.5, eu: '38', cm: 24.5 },
		{ us: 8, uk: 6, eu: '38–39', cm: 25 },
		{ us: 8.5, uk: 6.5, eu: '39', cm: 25.5 },
		{ us: 9, uk: 7, eu: '39–40', cm: 26 },
		{ us: 9.5, uk: 7.5, eu: '40', cm: 26.5 },
		{ us: 10, uk: 8, eu: '40–41', cm: 27 },
		{ us: 10.5, uk: 8.5, eu: '41', cm: 27.5 },
		{ us: 11, uk: 9, eu: '41–42', cm: 28 },
		{ us: 12, uk: 10, eu: '42–43', cm: 29 }
	]
};

const euValue = (eu: string) => {
	const parts = eu.split('–').map(Number);
	return parts.reduce((a, b) => a + b, 0) / parts.length;
};

/** The chart row closest to the entered size in the chosen system. */
export function findRow(who: 'men' | 'women', system: string, size: number): Row | undefined {
	const rows = CHART[who];
	const key = (r: Row) => (system === 'us' ? r.us : system === 'uk' ? r.uk : system === 'eu' ? euValue(r.eu) : r.cm);
	let best: Row | undefined;
	let gap = Infinity;
	for (const r of rows) {
		const d = Math.abs(key(r) - size);
		if (d < gap - 1e-9) {
			gap = d;
			best = r;
		}
	}
	// Outside the chart by more than a size: don't guess.
	const tolerance = system === 'cm' ? 1 : 1;
	return gap <= tolerance ? best : undefined;
}

const fmt = (n: number) => num(n, 1);
const sys = (s: string) => (v: InputValues) => v.system === s;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'who',
			label: 'Shoes for',
			type: 'select',
			display: 'segmented',
			default: 'men',
			options: [
				{ label: 'Men', value: 'men' },
				{ label: 'Women', value: 'women' }
			]
		},
		{
			id: 'system',
			label: 'Size system you know',
			type: 'select',
			display: 'segmented',
			default: 'us',
			options: [
				{ label: 'US', value: 'us' },
				{ label: 'UK', value: 'uk' },
				{ label: 'EU', value: 'eu' },
				{ label: 'cm', value: 'cm' }
			]
		},
		{ id: 'us', label: 'US size', type: 'number', default: 9, min: 1, max: 20, step: 0.5, visibleWhen: sys('us') },
		{ id: 'uk', label: 'UK size', type: 'number', default: 8.5, min: 1, max: 20, step: 0.5, visibleWhen: sys('uk') },
		{ id: 'eu', label: 'EU size', type: 'number', default: 42, min: 30, max: 52, step: 0.5, visibleWhen: sys('eu') },
		{ id: 'cm', label: 'Foot length', type: 'number', default: 27, min: 18, max: 36, step: 0.1, suffix: 'cm', visibleWhen: sys('cm'), help: 'Heel to longest toe' }
	],
	calculate(v): CalculationResult {
		const who = v.who === 'women' ? 'women' : 'men';
		const system = String(v.system);
		const size = Number(v[system]);
		if (!Number.isFinite(size)) return { primaryResult: DASH, primaryLabel: 'Converted sizes', summary: 'Enter a size.' };
		const row = findRow(who, system, size);
		if (!row) return { primaryResult: DASH, primaryLabel: 'Converted sizes', summary: `That size is outside our ${who === 'men' ? 'men’s' : 'women’s'} chart. Try the other chart, or check the brand’s own sizes.` };
		const primary = system === 'eu' ? `US ${fmt(row.us)}` : `EU ${row.eu}`;
		return {
			primaryResult: primary,
			primaryLabel: `${who === 'men' ? 'Men’s' : 'Women’s'} size`,
			summary: `US ${fmt(row.us)} · UK ${fmt(row.uk)} · EU ${row.eu} · foot length about ${fmt(row.cm)} cm.`,
			secondaryMetrics: [
				{ label: 'US', value: fmt(row.us) },
				{ label: 'UK', value: fmt(row.uk) },
				{ label: 'EU', value: row.eu },
				{ label: 'Foot length', value: `${fmt(row.cm)} cm (${num(row.cm / 2.54, 2)} in)` }
			],
			table: {
				title: `Full ${who === 'men' ? 'men’s' : 'women’s'} size chart`,
				collapsed: true,
				columns: [
					{ key: 'us', label: 'US' },
					{ key: 'uk', label: 'UK' },
					{ key: 'eu', label: 'EU' },
					{ key: 'cm', label: 'Foot (cm)', align: 'end' }
				],
				rows: CHART[who].map((r) => ({ us: fmt(r.us), uk: fmt(r.uk), eu: r.eu, cm: fmt(r.cm) }))
			}
		};
	},
	content: {
		intro:
			'Convert shoe sizes between the US, UK and European systems, or find your size from your foot length. Separate charts cover men’s and women’s shoes, so you can compare sizes across brands and countries.',
		howTo: [
			'Choose men’s or women’s shoes.',
			'Pick the size system you already know, then enter your size or your foot length in centimetres.',
			'Read the matching US, UK, EU and centimetre sizes in the result.',
			'Open the full chart to compare nearby sizes, and check the brand’s own size guide before you buy.'
		],
		about: [
			{
				heading: 'Why shoe sizes differ between countries',
				paragraphs: [
					'There is no single world standard for shoe sizes. Each system starts from a different measure. US and UK sizes are based on the barleycorn, which is one third of an inch. EU sizes use the Paris point, which is two thirds of a centimetre.',
					'Because of this, the same foot can have different numbers in different systems. The sizes also vary by brand, since each maker designs its own shoe shape, or last. A conversion chart is a guide, not a promise.'
				]
			},
			{
				heading: 'How to read the conversion chart',
				paragraphs: [
					'The chart links each size in one system to the same foot length in the others. For example, a men’s US 9 is a UK 8.5, an EU 42 and a foot length of about 27 cm. Where an EU size is shown as a range, such as 40–41, the foot may fit either size.',
					'Men’s and women’s charts differ. A women’s shoe is usually labelled about one size higher than a men’s shoe for the same foot length. Always use the chart for the right type of shoe.'
				],
				table: {
					caption: 'Sample men’s sizes from the chart',
					columns: ['US', 'UK', 'EU', 'Foot length'],
					rows: [
						['8', '7.5', '41', 'about 26 cm'],
						['9', '8.5', '42', 'about 27 cm'],
						['10', '9.5', '43', 'about 28 cm'],
						['11', '10.5', '44', 'about 29 cm']
					]
				}
			},
			{
				heading: 'How to measure your foot',
				paragraphs: [
					'Measure in the afternoon or evening, when your feet are a little larger. Stand with your weight on both feet, with a sheet of paper against a wall. Mark the back of your heel and the tip of your longest toe, then measure the distance in centimetres.',
					'Most people have one foot slightly larger than the other. Use the longer foot when you choose a size. In a shop, a Brannock device can measure your foot in just a few seconds. You can find more tools like this on the [everyday calculators](/everyday-calculators) page.'
				]
			},
			{
				heading: 'Length is not the whole fit',
				paragraphs: [
					'Foot length tells you the size, but width and shape matter too. Many brands offer narrow, standard and wide widths. If the shoe pinches across the ball of the foot, a wider width may fit better, even at the same length.',
					'Try shoes on at the end of the day, with the socks you will wear. Leave about a thumb’s width between your longest toe and the tip of the shoe.'
				]
			},
			{
				heading: 'Sizes in centimetres',
				paragraphs: [
					'Some brands and countries, including Japan, label shoes by foot length in centimetres. In that case, the size is the foot length, so a 27.0 cm shoe is made for a foot of that length. This is often the simplest system to use.',
					'For a quick length conversion, the [unit converter](/unit-converter) changes centimetres to inches. If you are choosing clothes as well, the [bra size calculator](/bra-size-calculator) follows a similar idea of matching a measurement to a size chart.'
				]
			}
		],
		formulas: [
			{
				title: 'Rules of thumb',
				expression: 'Men: UK ≈ US − 0.5\nWomen: UK ≈ US − 2',
				variables: [{ symbol: '≈', meaning: 'roughly the same, for a typical brand. Always check the chart for your size' }]
			}
		],
		example: {
			title: 'A men’s US 9',
			steps: ['Men’s UK is about half a size smaller: UK 8.5', 'Look up EU in the chart: 42', 'Foot length for US 9 is about 27 cm'],
			result: 'US 9 men’s ≈ UK 8.5 ≈ EU 42.'
		},
		faq: [
			{
				q: 'Why does my size differ between brands?',
				a: 'There is no single worldwide standard: each brand uses its own lasts and sizing. Treat any chart as a starting point and check the brand’s own size guide.'
			},
			{
				q: 'How do I measure my foot length?',
				a: 'Stand on a sheet of paper with your heel against a wall, mark the tip of your longest toe, and measure from the wall to the mark. Measure both feet in the evening and use the longer one.'
			},
			{
				q: 'How do men’s and women’s sizes compare?',
				a: 'For the same foot length, a women’s shoe is usually labelled about one size higher than a men’s. Use the women’s chart for women’s shoes, so you do not add the difference twice.'
			},
			{
				q: 'What should I do if I am between two sizes?',
				a: 'Many people choose the larger size, then check that the heel stays in place and the toes have room. If the two sizes are close, try both and walk around the shop.'
			},
			{
				q: 'Do my feet change size over time?',
				a: 'Yes. Feet can lengthen or widen with age, pregnancy and weight changes, so measure again every few years rather than relying on an old size.'
			}
		]
	}
});
