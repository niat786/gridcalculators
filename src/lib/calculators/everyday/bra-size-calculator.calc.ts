import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './bra-size-calculator.meta';

const imperial = (v: InputValues) => v.units === 'imperial';
const metric = (v: InputValues) => v.units === 'metric';

/** Cup letters for the US system, index = bust minus band in whole inches. */
const US_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD/F', 'G', 'H', 'I', 'J'];
/** Cup letters for the UK and Australian systems. */
const UK_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG'];
/** Cup letters for the EU and French/Spanish systems, per 2 cm of bust minus underbust. */
const EU_CUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const SYSTEM_NAME: Record<string, string> = {
	US: 'US',
	UK: 'UK',
	EU: 'EU',
	FR: 'French and Spanish (FR/ES)',
	AU: 'Australian (AU)'
};

/** Round up to the next even number if the value is odd. */
const evenUp = (n: number) => (n % 2 === 0 ? n : n + 1);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imperial',
			options: [
				{ label: 'Inches', value: 'imperial' },
				{ label: 'Centimetres', value: 'metric' }
			]
		},
		{
			id: 'system',
			label: 'Size system',
			type: 'select',
			display: 'menu',
			default: 'US',
			options: [
				{ label: 'US sizes', value: 'US' },
				{ label: 'UK sizes', value: 'UK' },
				{ label: 'EU sizes', value: 'EU' },
				{ label: 'France and Spain (FR/ES)', value: 'FR' },
				{ label: 'Australia (AU)', value: 'AU' }
			]
		},
		{ id: 'underIn', label: 'Underbust', type: 'number', default: 32, min: 20, max: 60, step: 0.5, suffix: 'in', help: 'Snug around the ribcage, just under the bust.', visibleWhen: imperial },
		{ id: 'bustIn', label: 'Bust', type: 'number', default: 37, min: 25, max: 70, step: 0.5, suffix: 'in', help: 'Around the fullest part of the bust.', visibleWhen: imperial },
		{ id: 'underCm', label: 'Underbust', type: 'number', default: 81, min: 50, max: 150, step: 0.5, suffix: 'cm', help: 'Snug around the ribcage, just under the bust.', visibleWhen: metric },
		{ id: 'bustCm', label: 'Bust', type: 'number', default: 94, min: 60, max: 180, step: 0.5, suffix: 'cm', help: 'Around the fullest part of the bust.', visibleWhen: metric }
	],
	calculate(v): CalculationResult {
		const system = String(v.system);
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Your size',
			summary
		});

		// Keep both unit systems so every size rule works from the right one.
		const underIn = imperial(v) ? Number(v.underIn) : Number(v.underCm) / 2.54;
		const bustIn = imperial(v) ? Number(v.bustIn) : Number(v.bustCm) / 2.54;
		const underCm = imperial(v) ? Number(v.underIn) * 2.54 : Number(v.underCm);
		const bustCm = imperial(v) ? Number(v.bustIn) * 2.54 : Number(v.bustCm);
		if (!(underIn > 0) || !(bustIn > 0)) return fail('Enter your underbust and bust measurements.');
		if (bustIn <= underIn) return fail('The bust should be larger than the underbust. Check both measurements.');

		const outOfChart = 'Your measurements fall outside this size chart. A professional fitter can help.';
		const inchSystem = system === 'US' || system === 'UK' || system === 'AU';

		if (inchSystem) {
			const band = evenUp(Math.round(underIn));
			const idx = Math.round(bustIn - band);
			const cups = system === 'US' ? US_CUPS : UK_CUPS;
			const letter = cups[idx];
			if (idx < 0 || letter === undefined) return fail(outOfChart);
			const shownBand = system === 'AU' ? band - 22 : band;
			if (shownBand <= 0) return fail(outOfChart);

			const sisterSmaller = idx + 1 < cups.length ? `${num(shownBand - 2, 0)}${cups[idx + 1]}` : 'None';
			const sisterLarger = idx - 1 >= 0 ? `${num(shownBand + 2, 0)}${cups[idx - 1]}` : 'None';
			const size = `${num(shownBand, 0)}${letter}`;

			return {
				primaryResult: size,
				primaryLabel: 'Your size',
				summary: `${SYSTEM_NAME[system]} size from one common method. Brands vary, so check their chart before buying.`,
				secondaryMetrics: [
					{ label: 'Band', value: num(shownBand, 0) },
					{ label: 'Cup', value: letter },
					{ label: 'Bust minus underbust', value: `${num(bustIn - underIn, 1, 1)} in` },
					{ label: 'Sister sizes', value: `${sisterSmaller} and ${sisterLarger}` }
				],
				table: {
					title: 'Sister sizes',
					columns: [
						{ key: 'size', label: 'Size' },
						{ key: 'note', label: 'How it relates' }
					],
					rows: [
						{ size, note: 'Your size' },
						{ size: sisterSmaller, note: 'Smaller band, one cup larger, same bust' },
						{ size: sisterLarger, note: 'Larger band, one cup smaller, same bust' }
					]
				}
			};
		}

		// EU and FR/ES: band from underbust in cm (nearest 5 cm), cup from bust minus underbust in cm.
		const band = Math.round(underCm / 5) * 5;
		const diff = Math.round(bustCm - underCm);
		if (diff < 12) return fail(outOfChart);
		const idx = Math.floor((diff - 12) / 2);
		const letter = EU_CUPS[idx];
		if (letter === undefined) return fail(outOfChart);
		const shownBand = system === 'FR' ? band + 15 : band;
		const size = `${num(shownBand, 0)}${letter}`;

		return {
			primaryResult: size,
			primaryLabel: 'Your size',
			summary: `${SYSTEM_NAME[system]} size from one common method. Brands vary, so check their chart before buying.`,
			secondaryMetrics: [
				{ label: 'Band', value: `${num(shownBand, 0)} cm` },
				{ label: 'Cup', value: letter },
				{ label: 'Bust minus underbust', value: `${num(bustCm - underCm, 1, 1)} cm` },
				{ label: 'Sister sizes', value: 'Not listed for metric sizing' }
			]
		};
	},
	content: {
		intro:
			'Estimate your bra band and cup size from two measurements, your underbust and your bust. The calculator works in US, UK, EU, French and Spanish, and Australian sizing, in inches or centimetres.',
		howTo: [
			'Choose inches or centimetres, then pick the size system you want.',
			'Measure your underbust snugly around the ribcage, just under the bust.',
			'Measure your bust around the fullest part, keeping the tape level.',
			'Read your size, and the sister sizes that give a similar fit.'
		],
		about: [
			{
				heading: 'How bra sizes are built',
				paragraphs: [
					'A bra size has two parts. The number is the band, which fits around your ribcage. The letter is the cup, which reflects how much bigger your bust is than the band. It is a difference, not a volume, which surprises many people.',
					'Because the cup is a difference, two people with the same bust can have different cup letters if their bands differ. This is normal, and it is why the band and cup are always read together.'
				]
			},
			{
				heading: 'Measuring at home',
				paragraphs: [
					'Use a soft measuring tape, and measure over unpadded underwear or bare skin. Keep the tape level all the way round, and do not pull it tight. For the bust, breathe out gently and measure around the fullest point.',
					'Also, take each measurement twice and use the average. Measuring in the morning, before a meal, can give a more steady result, but your body changes over the day. In short, the figures are a guide.'
				]
			},
			{
				heading: 'Size systems around the world',
				paragraphs: [
					'The US, UK, Australian, European and French and Spanish systems use different charts. However, the band is usually a number in each system, and the cup letters do not match one to one. The same letter can mean a different cup in another system.',
					'Read the size from the system that matches the chart you are using. If you shop abroad, check the brand’s size guide, as it will say which system it uses.'
				]
			},
			{
				heading: 'Checking the fit',
				paragraphs: [
					'A well-fitting bra has a band that sits level and feels snug without riding up. The cups hold the breast fully, without spilling over the top or leaving gaps. The centre panel lies flat against the chest.',
					'Try a few styles, because different cuts suit different bodies. Also, shoulder straps should not dig in, and you should be able to slip one finger under the band at the back. More everyday tools are listed on the [everyday calculators](/everyday-calculators) page.'
				]
			},
			{
				heading: 'When sizes change',
				paragraphs: [
					'Bodies change over time. Weight changes, pregnancy, breastfeeding, age and hormonal changes can all alter your size. It is a good idea to measure again every year or after a big change.',
					'For clothing sizes in other areas, the [shoe size conversion](/shoe-size-conversion) works the same way, with a chart and a measurement. If you need to switch between inches and centimetres, the [unit converter](/unit-converter) does it in one step.'
				]
			}
		],
		formulas: [
			{
				title: 'US, UK and AU band (inches)',
				expression: 'Band = underbust rounded to a whole inch, then rounded up to an even number if odd. AU band = UK band − 22',
				variables: [{ symbol: 'band', meaning: 'The number in the size, such as 32 in 32DD' }]
			},
			{
				title: 'US, UK and AU cup (inches)',
				expression: 'Cup index = bust − band, rounded to a whole inch. 0 = AA, 1 = A, 2 = B, 3 = C, 4 = D and so on',
				variables: [{ symbol: 'cup', meaning: 'The letters follow the chart for the chosen system' }]
			},
			{
				title: 'EU and FR/ES band (cm)',
				expression: 'Band = underbust rounded to the nearest 5 cm. FR/ES band = EU band + 15',
				variables: [{ symbol: '5 cm', meaning: 'Band steps used by most EU charts' }]
			},
			{
				title: 'EU and FR/ES cup (cm)',
				expression: 'Cup steps of 2 cm: a bust minus underbust of 12 to under 14 cm is A, 14 to under 16 cm is B, and so on up to G at 24 to under 26 cm',
				variables: [{ symbol: 'cm', meaning: 'Centimetres' }]
			}
		],
		example: {
			title: 'Underbust 32 in and bust 37 in, US sizing',
			steps: [
				'Band: 32 in is already a whole, even number, so the band is 32',
				'Cup: 37 − 32 = 5, which is DD in US sizing',
				'Sister sizes: 30DDD/F (smaller band, one cup larger) and 34D (larger band, one cup smaller)'
			],
			result: 'US size 32DD, with sister sizes 30DDD/F and 34D.'
		},
		faq: [
			{
				q: 'Why do different brands give different sizes?',
				a: 'Every brand cuts its bras differently and uses its own fit model. This calculator follows one common method, so treat the result as a starting point and check the brand’s own chart.'
			},
			{
				q: 'What are sister sizes?',
				a: 'Sister sizes keep the same cup volume with a different band. A smaller band needs a larger cup for the same bust, and a larger band needs a smaller cup. Try a sister size if the band feels loose or tight.'
			},
			{
				q: 'How do I know if a bra fits?',
				a: 'The band should sit level and snug without riding up, the cups should hold the breast without spilling or gaping, and the centre should lie flat. A professional fitting is the best way to check.'
			},
			{
				q: 'Why does EU sizing use centimetres?',
				a: 'Most European charts are metric, so the band and cup steps use centimetres. Enter your measurements in cm for the most direct result, or use inches and the calculator converts them.'
			},
			{
				q: 'Should I measure over a bra?',
				a: 'Measure over unpadded underwear or bare skin for the most accurate result. A padded or thick layer adds bulk and can change the size you read.'
			}
		]
	}
});
