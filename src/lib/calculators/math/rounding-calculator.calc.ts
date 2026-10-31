import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './rounding-calculator.meta';

/**
 * Rounding is done on the decimal digits, not on binary floating-point values, so 1.005 rounded
 * to hundredths gives 1.01 (a plain Math.round(1.005 * 100) gives 1.00 because 1.005 is stored
 * as 1.00499999…). The number is read back as its shortest decimal text, then rounded with BigInt.
 */

const TEN = BigInt(10);
const TWO = BigInt(2);
const ONE = BigInt(1);

/** Place values: the power of ten to round to. */
const PLACES: Record<string, { label: string; power: number }> = {
	thousands: { label: 'Thousands', power: 3 },
	hundreds: { label: 'Hundreds', power: 2 },
	tens: { label: 'Tens', power: 1 },
	ones: { label: 'Ones', power: 0 },
	tenths: { label: 'Tenths', power: -1 },
	hundredths: { label: 'Hundredths', power: -2 },
	thousandths: { label: 'Thousandths', power: -3 }
};

const METHOD_LABEL: Record<string, string> = {
	'half-up': 'half up',
	'half-down': 'half down',
	'half-even': 'half even (banker’s)',
	up: 'up (ceiling)',
	down: 'down (floor)'
};

/** Plain decimal text for a non-negative finite number, without exponent notation. */
function plainDecimal(x: number): string {
	const s = String(x);
	if (!/e/i.test(s)) return s;
	const [mantissa, exp] = s.split(/e/i);
	const [intDigits, fracDigits = ''] = mantissa.split('.');
	const digits = intDigits + fracDigits;
	const point = intDigits.length + Number(exp);
	if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
	if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
	return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Digits with thousands separators, e.g. "1235000" → "1,235,000". Decimals are kept. */
function group(text: string): string {
	const [int, frac] = text.split('.');
	const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return frac === undefined ? grouped : `${grouped}.${frac}`;
}

/** The quantity q × 10^power as plain text, with exactly −power decimal places when power < 0. */
function formatUnits(q: bigint, power: number): string {
	if (power >= 0) return (q * TEN ** BigInt(power)).toString();
	const decimals = -power;
	const s = q.toString().padStart(decimals + 1, '0');
	return `${s.slice(0, s.length - decimals)}.${s.slice(s.length - decimals)}`;
}

interface RoundResult {
	text: string; // magnitude, e.g. "1.01"
	negative: boolean;
	tie: boolean; // the discarded part was exactly half a unit
}

function roundDecimal(x: number, power: number, method: string): RoundResult {
	const negative = x < 0;
	const [intPart, fracPart = ''] = plainDecimal(Math.abs(x)).split('.');
	const digits = BigInt(intPart + fracPart);
	// value = digits ÷ 10^scale, and value ÷ 10^power = digits ÷ 10^shift
	const shift = fracPart.length + power;

	let q: bigint;
	let rem: bigint;
	let div: bigint;
	if (shift <= 0) {
		q = digits * TEN ** BigInt(-shift);
		rem = BigInt(0);
		div = ONE;
	} else {
		div = TEN ** BigInt(shift);
		q = digits / div;
		rem = digits % div;
	}

	const hasRemainder = rem !== BigInt(0);
	const twice = rem * TWO;
	const tie = hasRemainder && twice === div;
	let up: boolean;
	switch (method) {
		case 'half-up':
			up = twice >= div; // exact halves go away from zero
			break;
		case 'half-down':
			up = twice > div; // exact halves go toward zero
			break;
		case 'half-even':
			up = twice > div || (tie && q % TWO === ONE);
			break;
		case 'up':
			up = hasRemainder && !negative; // toward +∞
			break;
		case 'down':
			up = hasRemainder && negative; // toward −∞
			break;
		default:
			up = false;
	}
	const result = up ? q + ONE : q;
	return { text: formatUnits(result, power), negative: negative && result !== BigInt(0), tie };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'x',
			label: 'Number',
			type: 'number',
			default: 1.005,
			help: 'Try 1.005 with hundredths and half up: the answer is 1.01.'
		},
		{
			id: 'place',
			label: 'Round to',
			type: 'select',
			display: 'menu',
			default: 'hundredths',
			options: [
				{ label: 'Thousands', value: 'thousands' },
				{ label: 'Hundreds', value: 'hundreds' },
				{ label: 'Tens', value: 'tens' },
				{ label: 'Ones', value: 'ones' },
				{ label: 'Tenths', value: 'tenths' },
				{ label: 'Hundredths', value: 'hundredths' },
				{ label: 'Thousandths', value: 'thousandths' }
			]
		},
		{
			id: 'method',
			label: 'Method',
			type: 'select',
			display: 'menu',
			default: 'half-up',
			options: [
				{ label: 'Half up', value: 'half-up' },
				{ label: 'Half down', value: 'half-down' },
				{ label: 'Half even (banker’s)', value: 'half-even' },
				{ label: 'Up (ceiling)', value: 'up' },
				{ label: 'Down (floor)', value: 'down' }
			]
		}
	],
	calculate(v): CalculationResult {
		const x = Number(v.x);
		const place = PLACES[String(v.place)];
		const method = String(v.method);
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Rounded result', summary });
		if (!Number.isFinite(x)) return fail('Enter a number.');
		if (!place || !(method in METHOD_LABEL)) return fail('Pick a place value and a method.');

		const r = roundDecimal(x, place.power, method);
		const result = `${r.negative ? '−' : ''}${group(r.text)}`;
		const inputText = `${x < 0 ? '−' : ''}${group(plainDecimal(Math.abs(x)))}`;

		const change = Number(r.text.replace(/,/g, '')) * (r.negative ? -1 : 1) - x;
		const changeText =
			Math.abs(change) < 1e-9 ? 'No change' : `${change > 0 ? '+' : '−'}${num(Math.abs(change), 6)}`;

		return {
			primaryResult: result,
			primaryLabel: 'Rounded result',
			summary: `${inputText} rounded to ${place.label.toLowerCase()} (${METHOD_LABEL[method]}) is ${result}.`,
			secondaryMetrics: [
				{ label: 'Place value', value: `${place.label} (${group(formatUnits(ONE, place.power))})` },
				{ label: 'Change from input', value: changeText },
				{ label: 'Exactly halfway', value: r.tie ? 'Yes' : 'No' }
			]
		};
	},
	content: {
		intro:
			'Round a number to the place you choose, such as the nearest ten or the nearest hundredth. Pick the rounding method you need, from half up to ceiling and floor. The digits you type are used exactly.',
		howTo: [
			'Enter the number you want to round.',
			'Choose the place to round to, such as tens, tenths or thousandths.',
			'Choose a method. Half up is the usual rule for school and everyday use.',
			'Read the rounded result and the change from your input.'
		],
		about: [
			{
				heading: 'What rounding means',
				paragraphs: [
					'Rounding replaces a number with a nearby number that is simpler to read or use. For example, a crowd of 47 people is about 50, to the nearest ten. The answer is less exact, but easier to remember and say.',
					'The place you round to is called the place value. For 47, the tens place is the 4, and the ones place is the 7. Rounding to tens looks at the ones digit to decide whether to go up or down.',
					'Look at the digit just after the place you are rounding to. If it is 5 or more, round up. If it is 4 or less, keep the digit you have and drop the rest. Very large numbers are often shown in [scientific notation](/scientific-notation-calculator) instead.'
				]
			},
			{
				heading: 'Rounding to different places',
				paragraphs: [
					'The same number can be rounded to many places. Each answer is correct for its own purpose. Here is 1,234.5678 rounded to six different places.'
				],
				table: {
					caption: 'Rounding 1,234.5678 (half up)',
					columns: ['Round to', 'Result'],
					rows: [
						['Hundreds', '1,200'],
						['Tens', '1,230'],
						['Ones', '1,235'],
						['Tenths', '1,234.6'],
						['Hundredths', '1,234.57'],
						['Thousandths', '1,234.568']
					]
				}
			},
			{
				heading: 'Exact halves and rounding methods',
				paragraphs: [
					'Sometimes the digit after the place is exactly 5, with nothing after it. The number is exactly halfway. A rounding method decides what happens then. The table shows how five methods handle three numbers rounded to the ones place.',
					'Half up is the everyday rule, where halves go away from zero. Half down sends them toward zero. Half even sends them to the nearest even digit, which keeps the total fair over many numbers.',
					'Up (ceiling) always moves toward positive infinity, and down (floor) always moves toward negative infinity. Ceiling and floor ignore the digit rule. They round any fraction in one direction.'
				],
				table: {
					caption: 'Rounding to the ones place',
					columns: ['Method', '2.5', '3.5', '−2.5'],
					rows: [
						['Half up', '3', '4', '−3'],
						['Half down', '2', '3', '−2'],
						['Half even', '2', '4', '−2'],
						['Up (ceiling)', '3', '4', '−2'],
						['Down (floor)', '2', '3', '−3']
					]
				}
			},
			{
				heading: 'Why 1.005 rounds to 1.01',
				paragraphs: [
					'The number 1.005 sits exactly halfway between 1.00 and 1.01. Half up sends it to 1.01. But some programs store decimals in binary, which cannot hold 1.005 exactly. They may see a value a tiny bit below 1.005, and round it down to 1.00.',
					'This calculator uses the digits you type. So 1.005 to the nearest hundredth is 1.01 with half up, as you would expect on paper.'
				]
			},
			{
				heading: 'Rounding in money and statistics',
				paragraphs: [
					'Money is usually rounded to the nearest cent, which is the hundredths place. For a price of $4.675, half up gives $4.68. Shops, banks and tax offices each have their own rules, so check the one that applies to you.',
					'Statisticians often use half even rounding. Over a large set of numbers, it keeps the total from drifting up. So an average or a report may show a different last digit from a simple school rule.',
					'Round only at the final step. If you round each step of a long calculation, small errors can build up. Keep the extra digits until the end. The [average calculator](/average-calculator) and the [fraction calculator](/fraction-calculator) both show decimals, so you can round the final result yourself.'
				]
			}
		],
		formulas: [
			{
				title: 'How rounding works',
				expression: 'Look at the digit just after the place you round to. If it is 5 or more, round up. Otherwise, keep the digits and drop the rest.',
				variables: []
			},
			{
				title: 'Half up',
				expression: 'Exact halves go away from zero: 2.5 → 3, −2.5 → −3',
				variables: []
			},
			{
				title: 'Half down',
				expression: 'Exact halves go toward zero: 2.5 → 2, −2.5 → −2',
				variables: []
			},
			{
				title: 'Half even (banker’s)',
				expression: 'Exact halves go to the nearest even digit: 2.5 → 2, 3.5 → 4',
				variables: []
			},
			{
				title: 'Up (ceiling) and down (floor)',
				expression: 'Up always moves toward +∞: −1.2 → −1.   Down always moves toward −∞: −1.2 → −2',
				variables: []
			}
		],
		example: {
			title: 'Rounding 1.005 to the nearest hundredth',
			steps: [
				'The place is hundredths. The digits after it are 5, with nothing after that, so the number is exactly halfway.',
				'Half up rounds exact halves away from zero, so 1.005 rounds up to 1.01.'
			],
			result: '1.005 rounded to hundredths (half up) is 1.01.'
		},
		faq: [
			{
				q: 'Why can a program round 1.005 down to 1.00?',
				a: 'Many programs store decimals in binary, so 1.005 may be held as a value slightly below 1.005. Rounding that value gives 1.00. This calculator works with the digits you type, so the answer is 1.01.'
			},
			{
				q: 'What is banker’s rounding?',
				a: 'Half even rounding, also called banker’s rounding, sends an exact half to the nearest even digit. Over many values, about half the halves round up and half round down, so the total stays balanced on average.'
			},
			{
				q: 'What is the difference between ceiling and floor?',
				a: 'Ceiling always rounds toward positive infinity, so −1.2 becomes −1. Floor always rounds toward negative infinity, so −1.2 becomes −2. For positive numbers, ceiling rounds up and floor rounds down.'
			},
			{
				q: 'Should I round in the middle of a calculation?',
				a: 'No. Keep full precision until the final step. Rounding early can make the final answer drift, especially in long sums or averages.'
			},
			{
				q: 'Which rounding method should I use?',
				a: 'Use half up for everyday and school work. Use half even when a course, report or field asks for it. Use ceiling or floor when the answer must never fall short or go over.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Rounding', url: 'https://en.wikipedia.org/wiki/Rounding' },
			{ title: 'Wikipedia — Floating-point arithmetic', url: 'https://en.wikipedia.org/wiki/Floating-point_arithmetic' }
		]
	}
});
