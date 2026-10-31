import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './stair-calculator.meta';

const CM_PER_IN = 2.54;
/** IRC R311.7.5: a riser may be at most 7¾ in and a tread at least 10 in. */
const MAX_RISER_IN = 7.75;
const MIN_TREAD_IN = 10;
const EPS = 1e-9;

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Number of risers',
	summary
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'unit',
			label: 'Units',
			type: 'select',
			default: 'in',
			display: 'segmented',
			options: [
				{ label: 'Inches', value: 'in' },
				{ label: 'Centimetres', value: 'cm' }
			]
		},
		{
			id: 'totalIn',
			label: 'Total rise',
			type: 'number',
			default: 108,
			min: 1,
			max: 2000,
			suffix: 'in',
			help: 'Height from the lower floor to the upper floor.',
			visibleWhen: (v) => v.unit !== 'cm'
		},
		{
			id: 'totalCm',
			label: 'Total rise',
			type: 'number',
			default: 274,
			min: 1,
			max: 5000,
			suffix: 'cm',
			help: 'Height from the lower floor to the upper floor.',
			visibleWhen: (v) => v.unit === 'cm'
		},
		{
			id: 'riserIn',
			label: 'Maximum riser height',
			type: 'number',
			default: 7.75,
			min: 1,
			max: 12,
			decimal: true,
			suffix: 'in',
			help: 'The tallest step you want. Sets the number of risers.',
			visibleWhen: (v) => v.unit !== 'cm'
		},
		{
			id: 'riserCm',
			label: 'Maximum riser height',
			type: 'number',
			default: 19.5,
			min: 1,
			max: 30,
			decimal: true,
			suffix: 'cm',
			help: 'The tallest step you want. Sets the number of risers.',
			visibleWhen: (v) => v.unit === 'cm'
		},
		{
			id: 'treadIn',
			label: 'Tread depth',
			type: 'number',
			default: 10,
			min: 1,
			max: 30,
			decimal: true,
			suffix: 'in',
			help: 'The depth of each step you walk on.',
			visibleWhen: (v) => v.unit !== 'cm'
		},
		{
			id: 'treadCm',
			label: 'Tread depth',
			type: 'number',
			default: 25.4,
			min: 1,
			max: 75,
			decimal: true,
			suffix: 'cm',
			help: 'The depth of each step you walk on.',
			visibleWhen: (v) => v.unit === 'cm'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const isCm = v.unit === 'cm';
		const scale = isCm ? CM_PER_IN : 1;
		const toIn = (x: InputValues[string]) => Number(x) / scale;
		const out = (inches: number) => inches * scale;
		const unit = isCm ? 'cm' : 'in';

		const rise = isCm ? toIn(v.totalCm) : toIn(v.totalIn);
		const maxRiser = isCm ? toIn(v.riserCm) : toIn(v.riserIn);
		const tread = isCm ? toIn(v.treadCm) : toIn(v.treadIn);
		if (![rise, maxRiser, tread].every((x) => Number.isFinite(x) && x > 0)) {
			return fail('Enter a total rise, a maximum riser height and a tread depth, all above zero.');
		}

		const risers = Math.ceil(rise / maxRiser - EPS);
		if (risers < 2) {
			return fail('The total rise fits in one riser, so there are no treads. Check the rise and the maximum riser.');
		}

		const treads = risers - 1;
		const riser = rise / risers;
		const run = treads * tread;
		const stringer = Math.hypot(rise, run);
		const angle = (Math.atan2(rise, run) * 180) / Math.PI;

		const riserOk = riser <= MAX_RISER_IN + EPS;
		const treadOk = tread >= MIN_TREAD_IN - EPS;
		const problems = [
			...(riserOk ? [] : [`the riser is over 7¾ in`]),
			...(treadOk ? [] : [`the tread is under 10 in`])
		];
		const summary =
			problems.length === 0
				? 'Each riser is 7¾ in or less and each tread is 10 in or more, which matches IRC R311.7.5. Local codes can differ.'
				: `This layout may not meet IRC R311.7.5: ${problems.join(' and ')}. Local codes can differ.`;

		return {
			primaryResult: plural(risers, 'riser'),
			primaryLabel: 'Number of risers',
			summary,
			secondaryMetrics: [
				{ label: 'Actual riser height', value: `${num(out(riser), 2)} ${unit}` },
				{ label: 'Number of treads', value: num(treads, 0) },
				{ label: 'Total run', value: `${num(out(run), 2)} ${unit}` },
				{ label: 'Stringer length', value: `${num(out(stringer), 2)} ${unit}` },
				{ label: 'Stair angle', value: `${num(angle, 1)}°` },
				{ label: 'Code check', value: riserOk && treadOk ? 'Within IRC R311.7.5' : 'Outside IRC R311.7.5' }
			]
		};
	},
	content: {
		intro:
			'Plan a staircase from its total rise. The stair calculator works out the number of risers and treads, the riser height, the total run, the stringer length and the stair angle, in inches or centimetres.',
		howTo: [
			'Choose inches or centimetres, then enter the total rise from the lower floor to the upper floor.',
			'Enter the tallest riser you want. The calculator sets the number of steps from this.',
			'Enter the tread depth, which is the depth of each step you walk on.',
			'Read the risers, treads, run, stringer length and angle, then check the code line at the bottom of the result.'
		],
		about: [
			{
				heading: 'What the stair calculator works out',
				paragraphs: [
					'A staircase is a series of steps that climb a fixed height. Each step has a riser, which is the upright part, and a tread, which is the flat part you stand on. The total rise is the height the stairs must climb.',
					'Because the number of steps must be whole, the calculator rounds up to get the number of risers. Then it divides the total rise evenly, so every riser is the same height. Even steps are important, because uneven steps are a common cause of trips and falls.'
				]
			},
			{
				heading: 'How the steps are calculated',
				paragraphs: [
					'The number of risers is the total rise divided by the maximum riser height, rounded up. The actual riser height is then the total rise divided by that number. The number of treads is always one less than the number of risers, because the top floor is the last landing.',
					'The total run is the number of treads times the tread depth. The stringer, which is the sloping board that holds the steps, is the diagonal across the rise and the run. The angle comes from the rise and the run, using the same geometry as a right triangle. The [right triangle calculator](/right-triangle-calculator) shows that relationship in more detail, and the [pythagorean theorem calculator](/pythagorean-theorem-calculator) works out the stringer alone.'
				]
			},
			{
				heading: 'Building codes differ by country',
				paragraphs: [
					'In the United States, the International Residential Code, section R311.7.5, sets a maximum riser of 7¾ inches and a minimum tread of 10 inches for homes. Many local codes follow it, but some do not.',
					'Other countries have their own rules. The United Kingdom, for example, sets stair rules in Approved Document K, and other countries use different limits for rise, going and headroom. Use the calculator as a planning tool, then check the rules where you build.'
				]
			},
			{
				heading: 'Tips for planning a staircase',
				paragraphs: [
					'Measure the total rise carefully, from the finished surface of the lower floor to the finished surface of the upper floor. Floor coverings and screed change the height, so measure after they are in place.',
					'Plan the layout before you cut any stringers. If your plans mix inches and centimetres, the [unit converter](/unit-converter) helps. The [roofing calculator](/roofing-calculator) uses the same idea of rise and run for a roof. A small change in the riser height changes every step, so check the final numbers with a full set of drawings.'
				],
				list: [
					'Keep every riser the same height. Uneven steps are a common trip hazard.',
					'Allow enough headroom at the top and along the run. Local rules set the minimum.',
					'Use a handrail on at least one side, and check the local rule for both sides.',
					'If you need a winding or spiral stair, the rules are different, so check them separately.'
				]
			},
			{
				heading: 'Safety on stairs',
				paragraphs: [
					'Falls on stairs cause many serious injuries each year. Good lighting, a sturdy handrail and non-slip treads reduce the risk. Keep the stairs clear of items you could trip over.',
					'For a new staircase, ask a qualified builder or engineer to check the design and the structure. A staircase must carry real loads, not just the weight of the people who use it.'
				]
			}
		],
		formulas: [
			{
				title: 'Number of risers',
				expression: 'Risers = ⌈ total rise ÷ maximum riser ⌉',
				variables: [
					{ symbol: 'total rise', meaning: 'the height from the lower floor to the upper floor' },
					{ symbol: 'maximum riser', meaning: 'the tallest step you want' }
				]
			},
			{
				title: 'Riser, treads and run',
				expression: 'Riser = total rise ÷ risers\nTreads = risers − 1\nRun = treads × tread depth',
				variables: [{ symbol: 'tread depth', meaning: 'the depth of one step you walk on' }]
			},
			{
				title: 'Stringer length and angle',
				expression: 'Stringer = √(rise² + run²)\nAngle = arctan(rise ÷ run)',
				variables: [
					{ symbol: 'rise', meaning: 'the total rise' },
					{ symbol: 'run', meaning: 'the total run, not including the nosing' }
				]
			}
		],
		example: {
			title: 'A total rise of 108 inches with a 7.75 inch maximum riser and 10 inch treads',
			steps: [
				'Risers: 108 ÷ 7.75 = 13.9, rounded up to 14 risers',
				'Actual riser: 108 ÷ 14 = 7.71 inches',
				'Treads: 14 − 1 = 13 treads, so the run is 13 × 10 = 130 inches',
				'Stringer: √(108² + 130²) = 169.01 inches, and the angle is about 39.7 degrees'
			],
			result: 'Build 14 risers of 7.71 inches with 13 treads. The total run is 130 inches, and the stringer is about 169 inches long.'
		},
		faq: [
			{
				q: 'How many steps do I need for a staircase?',
				a: 'Divide the total rise by the tallest riser you want, then round up. The result is the number of risers. Most staircases have one tread fewer than the number of risers.'
			},
			{
				q: 'What is a good riser height?',
				a: 'Many homes use a riser between about 7 and 7¾ inches, but the right figure depends on local rules and comfort. Keep every riser the same height on one staircase.'
			},
			{
				q: 'Why is there one fewer tread than riser?',
				a: 'The top of the staircase is the upper floor, which is not a step. So a staircase with 14 risers has 13 treads between the floors.'
			},
			{
				q: 'Is this calculator enough to build stairs?',
				a: 'It is a planning tool. Structure, headroom, handrails and local code all matter, so check the details with a qualified builder or your local building authority before you cut any material.'
			}
		],
		sources: [{ title: 'International Code Council, International Residential Code', url: 'https://www.iccsafe.org/' }]
	}
});
