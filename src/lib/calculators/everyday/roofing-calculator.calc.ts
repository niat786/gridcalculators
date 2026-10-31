import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, plural } from '../format';
import meta from './roofing-calculator.meta';

const SQ_FT_PER_SQUARE = 100;
const BUNDLES_PER_SQUARE = 3;

/** Roof pitches as rise per 12 inches of run. */
const PITCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '18', '20'];

const pos = (n: number) => Number.isFinite(n) && n > 0;

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Roof area', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'length',
			label: 'House length',
			type: 'number',
			default: 40,
			min: 1,
			max: 1000,
			step: 0.5,
			suffix: 'ft',
			width: 'half',
			help: 'Measure the outside of the walls, not the roof.'
		},
		{ id: 'width', label: 'House width', type: 'number', default: 30, min: 1, max: 1000, step: 0.5, suffix: 'ft', width: 'half' },
		{
			id: 'overhang',
			label: 'Roof overhang',
			type: 'number',
			default: 12,
			min: 0,
			max: 72,
			step: 1,
			suffix: 'in',
			help: 'How far the roof reaches past the walls on each side.'
		},
		{
			id: 'pitch',
			label: 'Roof pitch',
			type: 'select',
			display: 'menu',
			default: '6',
			help: 'Rise in inches for every 12 inches of run.',
			options: PITCHES.map((p) => ({ label: `${p}/12`, value: p }))
		},
		{
			id: 'waste',
			label: 'Waste allowance',
			type: 'number',
			default: 10,
			min: 0,
			max: 50,
			step: 1,
			suffix: '%',
			help: 'Extra for cuts, hips, valleys and ridges.'
		}
	],
	calculate(v): CalculationResult {
		const length = Number(v.length);
		const width = Number(v.width);
		const overhangIn = Number(v.overhang);
		const rise = Number(v.pitch);
		const waste = Number(v.waste);

		if (!pos(length) || !pos(width)) return invalid('Enter a house length and width greater than zero.');
		if (!Number.isFinite(overhangIn) || overhangIn < 0) return invalid('Enter an overhang of 0 inches or more.');
		if (!pos(rise)) return invalid('Pick a roof pitch.');
		if (!Number.isFinite(waste) || waste < 0) return invalid('Enter a waste allowance of 0% or more.');

		// The roof reaches past the walls on all four sides, so add the overhang twice to each length.
		const overhang = overhangIn / 12;
		const plan = (length + 2 * overhang) * (width + 2 * overhang);
		const multiplier = Math.sqrt(1 + (rise / 12) ** 2);
		const roof = plan * multiplier;
		const squares = roof / SQ_FT_PER_SQUARE;
		const squaresWithWaste = squares * (1 + waste / 100);
		// A small epsilon stops exact multiples from adding an extra bundle.
		const bundles = Math.ceil(squaresWithWaste * BUNDLES_PER_SQUARE - 1e-9);

		return {
			primaryResult: `${num(roof, 0)} sq ft`,
			primaryLabel: 'Roof area',
			summary: `Includes ${num(waste, 0)}% waste. One roofing square is 100 sq ft.`,
			secondaryMetrics: [
				{ label: 'Roof area on the plan', value: `${num(plan, 0)} sq ft` },
				{ label: 'Pitch multiplier', value: num(multiplier, 4, 4) },
				{ label: 'Squares before waste', value: num(squares, 2, 2) },
				{ label: 'Squares with waste', value: num(squaresWithWaste, 2, 2) },
				{ label: 'Shingle bundles', value: plural(bundles, 'bundle') }
			]
		};
	},
	content: {
		intro:
			'Estimate the roof area of a house from its size, roof pitch and overhang. You also get roofing squares and shingle bundles, with an allowance for waste, so you can order the right amount of material.',
		howTo: [
			'Enter the outside length and width of the house, in feet.',
			'Enter the roof overhang, which is how far the roof reaches past the walls.',
			'Pick the roof pitch, which is the rise in inches for every 12 inches of run.',
			'Set a waste allowance, then read the roof area, the squares and the bundles to order.'
		],
		about: [
			{
				heading: 'What this roofing calculator measures',
				paragraphs: [
					'The roof is bigger than the floor of the house, for two reasons. It is sloped, so it covers more surface than its footprint. It also overhangs the walls on every side. This calculator adds both effects, so you get the real area that needs covering. The [area calculator](/area-calculator) handles the simple flat shapes behind it.',
					'The results are an estimate. A simple gable or hip roof is easy to model, but dormers, valleys and skylights add cuts and extra material. Add more waste if your roof is complicated.'
				]
			},
			{
				heading: 'How roof pitch changes the area',
				paragraphs: [
					'Pitch is the steepness of the roof. It is written as rise over run, so 6/12 means the roof rises 6 inches for every 12 inches it runs across. A steeper roof has a larger surface than the flat plan below it.',
					'The calculator uses a multiplier for each pitch. It is the square root of 1 plus (rise ÷ 12) squared. At 6/12, the multiplier is 1.118, so the roof is about 12% larger than the plan. A steep 12/12 roof, which is a 45 degree slope, has a multiplier of 1.414.',
					'For angles, the [right triangle calculator](/right-triangle-calculator) shows how rise and run relate. To find the length of a rafter, the [pythagorean theorem calculator](/pythagorean-theorem-calculator) works from the same rise and run.'
				],
				table: {
					caption: 'Pitch multipliers used in this calculator',
					columns: ['Pitch', 'Slope angle', 'Multiplier'],
					rows: [
						['4/12', '18.4°', '1.054'],
						['6/12', '26.6°', '1.118'],
						['8/12', '33.7°', '1.202'],
						['12/12', '45.0°', '1.414']
					]
				}
			},
			{
				heading: 'Roofing squares, bundles and other units',
				paragraphs: [
					'In North America, roofers measure in squares. One roofing square covers 100 square feet, or about 9.29 square metres. The calculator assumes three bundles of asphalt shingles per square, which is a common figure in that market.',
					'Many other countries sell roofing material by the square metre or by the piece. Check the coverage on the product label, because bundle sizes and coverage differ by product. For a plan-based check, the [square footage calculator](/square-footage-calculator) gives the area of the house footprint.'
				]
			},
			{
				heading: 'Tips for ordering roofing material',
				paragraphs: [
					'Measure the house from the outside, along the walls, not from the roof edge. Then add the overhang yourself, or use the field in this tool to do it for you.',
					'Ask the supplier about returns for unopened bundles before you order.'
				],
				list: [
					'Add 10% for a simple roof, and 15% or more for a complex roof with many hips and valleys.',
					'Order ridge caps and underlayment separately, because they are sold by their own units.',
					'Check the local building code for underlayment, ventilation and the number of layers allowed.',
					'Get a professional to measure a large or steep roof before you buy.'
				]
			},
			{
				heading: 'Safety on the roof',
				paragraphs: [
					'Falls from roofs cause serious injury every year. Do not work on a roof in wet, icy or windy weather. Use a sturdy ladder that extends past the roof edge, and wear shoes with good grip.',
					'Keep well away from overhead power lines, and do not carry long metal ladders or pipes near them. For steep roofs, use fall protection or hire a qualified roofer.'
				]
			}
		],
		formulas: [
			{
				title: 'Plan area with overhang',
				expression: 'Plan area = (length + 2 × overhang) × (width + 2 × overhang)',
				variables: [
					{ symbol: 'length, width', meaning: 'the outside size of the house, in feet' },
					{ symbol: 'overhang', meaning: 'the roof overhang in feet (inches ÷ 12), added on each side' }
				]
			},
			{
				title: 'Roof area for a pitch',
				expression: 'Roof area = plan area × √(1 + (rise ÷ 12)²)',
				variables: [{ symbol: 'rise', meaning: 'the pitch as inches of rise per 12 inches of run, for example 6' }]
			},
			{
				title: 'Squares and bundles',
				expression: 'Squares = roof area ÷ 100\nBundles = ⌈ squares × (1 + waste ÷ 100) × 3 ⌉',
				variables: [
					{ symbol: 'square', meaning: 'a roofing unit of 100 square feet' },
					{ symbol: '3', meaning: 'bundles per square, the usual figure for asphalt shingles in North America' }
				]
			}
		],
		example: {
			title: 'A 40 ft by 30 ft house, 12 in overhang, 6/12 pitch, 10% waste',
			steps: [
				'Plan area: (40 + 2) × (30 + 2) = 42 × 32 = 1,344 square feet',
				'Pitch multiplier: √(1 + (6 ÷ 12)²) = 1.1180',
				'Roof area: 1,344 × 1.1180 = 1,503 square feet, which is 15.03 squares',
				'With waste: 15.03 × 1.10 = 16.53 squares, so 16.53 × 3 = 49.6, rounded up to 50 bundles'
			],
			result: 'The roof is about 1,503 square feet. Order 50 bundles of shingles.'
		},
		faq: [
			{
				q: 'How many roofing squares are in a typical house?',
				a: 'It depends on the size and pitch. A roof of about 1,500 square feet is 15 squares before waste. Use the calculator to get the figure for your own house, then add your waste allowance.'
			},
			{
				q: 'What is a good roof pitch?',
				a: 'There is no single best pitch. Steeper roofs shed water and snow faster, but they cost more to build and are harder to walk on. Local weather and building rules often set minimum pitches for some roof types.'
			},
			{
				q: 'Does the calculator include the overhang?',
				a: 'Yes. It adds the overhang on all four sides before it works out the pitch. Enter zero if you want the area of the walls alone.'
			},
			{
				q: 'How many bundles of shingles do I need?',
				a: 'The calculator assumes three bundles per square, which is common for asphalt shingles. Check the coverage on your product, because some shingles cover less per bundle.'
			}
		],
		sources: [{ title: 'National Roofing Contractors Association', url: 'https://www.nrca.net/' }],
		disclaimer:
			'This is an estimate. Check the plans, the product coverage and your local building code before you order. Roof work can be dangerous, so use a qualified professional when in doubt.'
	}
});
