import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './resistor-calculator.meta';

const isFive = (v: InputValues) => String(v.bands) === '5';

/** Digit value of each color (IEC 60062). */
const DIGIT: Record<string, number> = {
	black: 0,
	brown: 1,
	red: 2,
	orange: 3,
	yellow: 4,
	green: 5,
	blue: 6,
	violet: 7,
	grey: 8,
	white: 9
};

/** Multiplier of each color (IEC 60062). Gold and silver are decimal multipliers. */
const MULTIPLIER: Record<string, number> = {
	black: 1,
	brown: 10,
	red: 100,
	orange: 1e3,
	yellow: 1e4,
	green: 1e5,
	blue: 1e6,
	violet: 1e7,
	grey: 1e8,
	white: 1e9,
	gold: 0.1,
	silver: 0.01
};

/** Tolerance of each color, in percent (IEC 60062). */
const TOLERANCE: Record<string, number> = {
	brown: 1,
	red: 2,
	green: 0.5,
	blue: 0.25,
	violet: 0.1,
	grey: 0.05,
	gold: 5,
	silver: 10
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Format ohms with an SI prefix: Ω, kΩ, MΩ or GΩ. */
export function formatOhms(x: number): string {
	if (x >= 1e9) return `${num(x / 1e9, 3)} GΩ`;
	if (x >= 1e6) return `${num(x / 1e6, 3)} MΩ`;
	if (x >= 1e3) return `${num(x / 1e3, 3)} kΩ`;
	return `${num(x, 3)} Ω`;
}

const digitOptions = Object.keys(DIGIT).map((c) => ({ label: `${cap(c)} (${DIGIT[c]})`, value: c }));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'bands',
			label: 'Number of bands',
			type: 'select',
			display: 'segmented',
			default: '4',
			options: [
				{ label: '4 bands', value: '4' },
				{ label: '5 bands', value: '5' }
			]
		},
		{ id: 'b1', label: 'Band 1', help: 'First digit', type: 'select', default: 'brown', options: digitOptions },
		{ id: 'b2', label: 'Band 2', help: 'Second digit', type: 'select', default: 'black', options: digitOptions },
		{ id: 'b3', label: 'Band 3', help: 'Third digit (5-band codes only)', type: 'select', default: 'black', options: digitOptions, visibleWhen: isFive },
		{
			id: 'mult',
			label: 'Multiplier',
			help: 'Band 3 on a 4-band resistor, band 4 on a 5-band resistor.',
			type: 'select',
			default: 'red',
			options: [
				{ label: 'Black (×1)', value: 'black' },
				{ label: 'Brown (×10)', value: 'brown' },
				{ label: 'Red (×100)', value: 'red' },
				{ label: 'Orange (×1,000)', value: 'orange' },
				{ label: 'Yellow (×10,000)', value: 'yellow' },
				{ label: 'Green (×100,000)', value: 'green' },
				{ label: 'Blue (×1,000,000)', value: 'blue' },
				{ label: 'Violet (×10,000,000)', value: 'violet' },
				{ label: 'Grey (×100,000,000)', value: 'grey' },
				{ label: 'White (×1,000,000,000)', value: 'white' },
				{ label: 'Gold (×0.1)', value: 'gold' },
				{ label: 'Silver (×0.01)', value: 'silver' }
			]
		},
		{
			id: 'tol',
			label: 'Tolerance',
			help: 'Band 4 on a 4-band resistor, band 5 on a 5-band resistor.',
			type: 'select',
			default: 'gold',
			options: [
				{ label: 'Brown (±1%)', value: 'brown' },
				{ label: 'Red (±2%)', value: 'red' },
				{ label: 'Green (±0.5%)', value: 'green' },
				{ label: 'Blue (±0.25%)', value: 'blue' },
				{ label: 'Violet (±0.1%)', value: 'violet' },
				{ label: 'Grey (±0.05%)', value: 'grey' },
				{ label: 'Gold (±5%)', value: 'gold' },
				{ label: 'Silver (±10%)', value: 'silver' }
			]
		}
	],
	calculate(v): CalculationResult {
		const five = isFive(v);
		const digitKeys = five ? [v.b1, v.b2, v.b3] : [v.b1, v.b2];
		const digits = digitKeys.map((k) => DIGIT[String(k)]);
		const mult = MULTIPLIER[String(v.mult)];
		const tol = TOLERANCE[String(v.tol)];
		if (digits.some((d) => d === undefined) || mult === undefined || tol === undefined) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Resistance',
				summary: 'Pick a color for every band.'
			};
		}
		const significant = five ? digits[0] * 100 + digits[1] * 10 + digits[2] : digits[0] * 10 + digits[1];
		const ohms = significant * mult;
		if (!(ohms > 0)) {
			return {
				primaryResult: '0 Ω',
				primaryLabel: 'Resistance',
				summary: 'Zero ohms: this is a jumper (zero-ohm link), usually marked with a single black band. Check the colors if you expected a resistor.'
			};
		}
		const min = ohms * (1 - tol / 100);
		const max = ohms * (1 + tol / 100);
		const colors = [...digitKeys, v.mult, v.tol].map((c) => cap(String(c))).join(' · ');

		return {
			primaryResult: formatOhms(ohms),
			primaryLabel: 'Resistance',
			summary: `${formatOhms(ohms)} ±${num(tol, 2)}%: the real value can be anywhere from ${formatOhms(min)} to ${formatOhms(max)}.`,
			secondaryMetrics: [
				{ label: 'Tolerance', value: `±${num(tol, 2)}%` },
				{ label: 'Minimum', value: formatOhms(min) },
				{ label: 'Maximum', value: formatOhms(max) },
				{ label: 'Color code', value: colors }
			]
		};
	},
	content: {
		intro:
			'Read the value of a resistor from its colour bands. The resistor colour code calculator works with 4-band and 5-band resistors, and shows the resistance, tolerance and the lowest and highest value it can have.',
		howTo: [
			'Choose 4 bands or 5 bands, by counting the bands on the resistor.',
			'Pick the colour of each digit band, then the multiplier band.',
			'Pick the tolerance band, which is usually gold or silver on a 4-band resistor.',
			'Read the resistance and the minimum and maximum it can have, with the colour code shown below.'
		],
		about: [
			{
				heading: 'What are resistor colour bands?',
				paragraphs: [
					'Most small resistors are too small to print a number on, so they use coloured bands instead. Each band is a digit, a multiplier or a tolerance. The colours follow an international standard, IEC 60062, so the code works in most countries.',
					'Start reading from the band nearest one end of the resistor. The tolerance band is usually separated from the others by a larger gap, or it is gold or silver. If you are not sure which end to start from, try both directions, and pick the one that gives a standard value.'
				]
			},
			{
				heading: 'Digit, multiplier and tolerance colours',
				paragraphs: [
					'Each digit colour has a value from 0 to 9. Black is 0, brown is 1, red is 2, orange is 3, yellow is 4, green is 5, blue is 6, violet is 7, grey is 8 and white is 9. A simple way to remember the order is the phrase “Bad Boys Race Our Young Girls But Violet Generally Wins”.',
					'The multiplier band sets the power of ten, so a red multiplier means 100. The [scientific notation calculator](/scientific-notation-calculator) explains powers of ten in more detail. Gold and silver are used for multipliers too, at 0.1 and 0.01. For tolerance, brown is ±1%, red ±2%, gold ±5% and silver ±10%.'
				],
				table: {
					caption: 'Colour values used in this calculator',
					columns: ['Colour', 'Digit', 'Multiplier', 'Tolerance'],
					rows: [
						['Black', '0', '×1', ''],
						['Brown', '1', '×10', '±1%'],
						['Red', '2', '×100', '±2%'],
						['Orange', '3', '×1,000', ''],
						['Yellow', '4', '×10,000', ''],
						['Green', '5', '×100,000', '±0.5%'],
						['Blue', '6', '×1,000,000', '±0.25%'],
						['Violet', '7', '×10,000,000', '±0.1%'],
						['Grey', '8', '×100,000,000', '±0.05%'],
						['White', '9', '×1,000,000,000', ''],
						['Gold', '', '×0.1', '±5%'],
						['Silver', '', '×0.01', '±10%']
					]
				}
			},
			{
				heading: 'Reading 4-band and 5-band resistors',
				paragraphs: [
					'A 4-band resistor has two digits, then a multiplier, then a tolerance. A 5-band resistor has three digits, then a multiplier, then a tolerance. The 5-band type is used when a more precise value is needed.',
					'For a tolerance of ±5%, a 1 kΩ resistor can be anywhere from 950 Ω to 1.05 kΩ. So if you need an exact value, choose a tighter tolerance, such as ±1%. The [ohms law calculator](/ohms-law-calculator) shows how the resistance sets the current in a circuit.'
				]
			},
			{
				heading: 'Tips for identifying resistors',
				paragraphs: [
					'Colours can look different under warm or dim light. Also, and older or faded resistors can be hard to read. Compare with a second resistor, or use a digital multimeter to check the real value.',
					'If a resistor has only one black band, it is likely a zero-ohm link, which is a short wire rather than a true resistor. The [voltage drop calculator](/voltage-drop-calculator) explains why wires and links are not perfect either.'
				],
				list: [
					'Hold the resistor under bright white light, and read it in daylight if you can.',
					'Check the tolerance band to see how far the real value can differ.',
					'Measure with a multimeter before you use a resistor in a critical circuit.',
					'Keep the resistors in labelled bags, since the bands are small and similar in colour.'
				]
			},
			{
				heading: 'Power rating and safety',
				paragraphs: [
					'The colour code gives the resistance, not the power rating. A small resistor is often rated at one quarter or one eighth of a watt. If it carries too much power, it gets hot and can burn or fail.',
					'Work out the power with the [ohms law calculator](/ohms-law-calculator) before you choose a part. Always switch off and discharge a circuit before you connect or remove resistors, and do not test live mains with a multimeter that is not rated for the job.'
				]
			}
		],
		formulas: [
			{
				title: '4-band resistance',
				expression: 'R = (digit 1 × 10 + digit 2) × multiplier',
				variables: [
					{ symbol: 'digit 1, digit 2', meaning: 'the values of the first two colour bands' },
					{ symbol: 'multiplier', meaning: 'the power of ten given by the third band, or a decimal for gold and silver' }
				]
			},
			{
				title: '5-band resistance',
				expression: 'R = (digit 1 × 100 + digit 2 × 10 + digit 3) × multiplier',
				variables: [{ symbol: 'digit 3', meaning: 'the value of the third digit band' }]
			},
			{
				title: 'Range from tolerance',
				expression: 'Minimum = R × (1 − tolerance ÷ 100)\nMaximum = R × (1 + tolerance ÷ 100)',
				variables: [{ symbol: 'tolerance', meaning: 'the percentage from the tolerance band' }]
			}
		],
		example: {
			title: 'A yellow, violet, orange and gold resistor',
			steps: [
				'Digits: yellow is 4, violet is 7, so the value starts 47',
				'Multiplier: orange is ×1,000, so 47 × 1,000 = 47,000 ohms',
				'Tolerance: gold is ±5%, so the range is 47,000 × 0.95 to 47,000 × 1.05',
				'Range: 44,650 ohms to 49,350 ohms'
			],
			result: 'The resistor is 47 kΩ ±5%, between 44.65 kΩ and 49.35 kΩ.'
		},
		faq: [
			{
				q: 'How do I read resistor colour bands?',
				a: 'Read the first two or three bands as digits, then the multiplier, then the tolerance. Find the band with a larger gap or a gold or silver colour, which is usually the tolerance band. The calculator does the sum for you.'
			},
			{
				q: 'What does a gold band mean on a resistor?',
				a: 'Gold is a multiplier of 0.1 when it is the third band, or a tolerance of ±5% when it is the last band. Check the position, because the same colour has different meanings.'
			},
			{
				q: 'Are resistor colour codes the same everywhere?',
				a: 'Yes, for the standard codes in IEC 60062, which most manufacturers follow. Very old or specialist parts may use other codes, so check the datasheet when you are unsure.'
			},
			{
				q: 'Why does a resistor have a tolerance?',
				a: 'No manufacturer can make every resistor exactly the same. The tolerance tells you how far the real value can differ from the printed value, such as ±5% for a general-purpose part.'
			}
		],
		sources: [{ title: 'International Electrotechnical Commission (IEC), colour code standard IEC 60062', url: 'https://www.iec.ch/' }]
	}
});
