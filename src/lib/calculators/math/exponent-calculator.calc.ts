import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './exponent-calculator.meta';

const SUPERSCRIPT: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
	'-': '⁻',
	'+': ''
};

/** Number with a true minus sign (−) for negatives, for display. */
const sgn = (x: number) => (x < 0 ? '−' : '') + num(Math.abs(x), 6);

/** Scientific notation, e.g. 1024 → "1.024 × 10³". Six decimals in the mantissa. */
function sci(x: number): string {
	if (x === 0) return '0';
	const [mantissa, exponent] = x.toExponential(6).split('e');
	const sup = String(Number(exponent))
		.split('')
		.map((c) => SUPERSCRIPT[c])
		.join('');
	return `${sgn(Number(mantissa))} × 10${sup}`;
}

/** Plain digits for everyday sizes; scientific notation for very large or very small results. */
function show(x: number): string {
	if (x !== 0 && (Math.abs(x) >= 1e6 || Math.abs(x) < 1e-4)) return sci(x);
	return (x < 0 ? '−' : '') + num(Math.abs(x), 6);
}

function fail(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Result', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'base', label: 'Base', type: 'number', default: 2, help: 'The number being multiplied by itself.' },
		{
			id: 'exponent',
			label: 'Exponent',
			type: 'number',
			default: 10,
			help: 'How many times to multiply. Negative and fractional exponents work too.'
		}
	],
	calculate(v): CalculationResult {
		const b = Number(v.base);
		const e = Number(v.exponent);
		if (!Number.isFinite(b) || !Number.isFinite(e)) return fail('Enter a base and an exponent.');
		if (b === 0 && e < 0) return fail('Zero cannot be raised to a negative power, because that would mean 1 ÷ 0.');
		if (b < 0 && !Number.isInteger(e)) {
			return fail('A negative base with a fractional exponent has no real answer here. Try a whole-number exponent.');
		}

		const r = Math.pow(b, e) + 0;
		if (!Number.isFinite(r)) return fail('The result is too large to display.');
		if (r === 0 && b !== 0) return fail('The result is too small to display.');

		const baseText = b < 0 ? `(${sgn(b)})` : sgn(b);
		const note = b === 0 && e === 0 ? ' By convention, 0⁰ is taken as 1.' : '';
		return {
			primaryResult: show(r),
			primaryLabel: 'Result',
			summary: `${baseText}^${sgn(e)} = ${show(r)}.${note}`,
			secondaryMetrics: [
				{ label: 'Scientific notation', value: sci(r) },
				{ label: 'Reciprocal (1 ÷ result)', value: r === 0 ? 'Undefined' : show(1 / r) }
			]
		};
	},
	content: {
		intro:
			'Raise a base number to an exponent, such as 2 to the power of 10. Works with whole, negative and fractional exponents, and shows very large or very small results in scientific notation.',
		howTo: [
			'Enter the base, the number that gets multiplied.',
			'Enter the exponent, which shows how many times it multiplies itself.',
			'Read the result. For very large or very small numbers, check the scientific notation below it.'
		],
		about: [
			{
				heading: 'What an exponent means',
				paragraphs: [
					'An exponent is a small number written up and to the right of a base. It tells you how many times to multiply the base by itself. So 2³ means 2 × 2 × 2, which is 8. Read it as “2 to the power of 3”.',
					'Exponents are a short way to write repeated multiplication. Writing 2¹⁰ is much quicker than writing ten 2s with multiplication signs between them. The answer is 1,024.',
					'The exponent 2 has a special name. A number to the power of 2 is squared, so 5² = 5 × 5 = 25. A number to the power of 3 is cubed, so 5³ = 125.'
				]
			},
			{
				heading: 'Negative exponents',
				paragraphs: [
					'A negative exponent means divide instead of multiply. The rule is b⁻ⁿ = 1 ÷ bⁿ. So 2⁻³ means 1 ÷ 2³ = 1 ÷ 8 = 0.125.',
					'This pattern shows why 10⁻² is 0.01. Each step down in the exponent divides by 10, so 10¹ is 10, 10⁰ is 1, and 10⁻¹ is 0.1. Then 10⁻² is 0.01.',
					'Negative exponents are common in science, for very small measurements. For example, a tiny length of 0.000001 metres is written as 1 × 10⁻⁶ metres.'
				]
			},
			{
				heading: 'Zero, one and fractional exponents',
				paragraphs: [
					'Any number, except zero, raised to the power of 0 is 1. So 7⁰ = 1. Any number raised to the power of 1 is itself, so 7¹ = 7.',
					'A fractional exponent is a root. An exponent of 0.5 is a square root, and an exponent of 1 ÷ 3 is a cube root. So 9 to the power of 0.5 is 3, because 3 × 3 = 9. You can type 0.5 in the exponent box to find a square root.',
					'For more on roots, use the [root calculator](/root-calculator).'
				]
			},
			{
				heading: 'Scientific notation for big and small results',
				paragraphs: [
					'Scientific notation writes a number as a value between 1 and 10, multiplied by a power of 10. So 1,024 becomes 1.024 × 10³. Scientists and engineers use it to keep very large and very small numbers easy to read.',
					'The calculator shows plain digits for most results. It switches to scientific notation for results of one million or more, and for results smaller than 0.0001. For example, 6,000,000 appears as 6 × 10⁶.',
					'To convert numbers in both directions, try the [scientific notation calculator](/scientific-notation-calculator).'
				]
			},
			{
				heading: 'Tips for using exponents',
				paragraphs: [
					'Be careful with brackets. The result of −3² is −9, because the power is worked out before the minus sign is applied. But (−3)² is 9, because the brackets make −3 the base.',
					'Exponents grow very fast. For example, 2 to the power of 10 is 1,024, and 2 to the power of 20 is 1,048,576. Small changes in the exponent can make a big difference.'
				],
				list: [
					'Use brackets around a negative base, such as (−2)⁴.',
					'Remember that x² means x × x, not 2 × x. For example, 3² is 9, while 2 × 3 is 6.',
					'For powers inside longer sums, use the [scientific calculator](/scientific-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Power',
				expression: 'Result = bⁿ = b × b × … × b   (n times)',
				variables: [
					{ symbol: 'b', meaning: 'the base' },
					{ symbol: 'n', meaning: 'the exponent' }
				]
			},
			{
				title: 'Negative exponent',
				expression: 'b⁻ⁿ = 1 ÷ bⁿ',
				variables: []
			},
			{
				title: 'Fractional exponent',
				expression: 'b^(1/n) = ⁿ√b',
				variables: [{ symbol: 'ⁿ√b', meaning: 'the n-th root of b' }]
			},
			{
				title: 'Scientific notation',
				expression: 'x = m × 10ᵏ,   where 1 ≤ |m| < 10',
				variables: [
					{ symbol: 'm', meaning: 'the mantissa, the leading digits' },
					{ symbol: 'k', meaning: 'the power of ten' }
				]
			}
		],
		example: {
			title: 'Two to the power of ten',
			steps: ['Multiply 2 by itself 10 times: 2 × 2 × … × 2', '2¹⁰ = 1,024', 'In scientific notation: 1.024 × 10³'],
			result: 'Two to the power of ten is 1,024, or 1.024 × 10³.'
		},
		faq: [
			{
				q: 'What does a negative exponent mean?',
				a: 'It means one divided by the base raised to the positive exponent. For example, 2⁻³ = 1 ÷ 2³ = 1 ÷ 8 = 0.125.'
			},
			{
				q: 'Why can a negative number not be raised to a fractional power?',
				a: 'A fraction such as 1/2 means a square root, and a negative number has no real square root. Some fractional powers of negative numbers are real when the root is odd, but this calculator only handles whole-number exponents for negative bases.'
			},
			{
				q: 'Why is zero to a negative power not allowed?',
				a: 'Zero to a negative power would equal 1 ÷ 0, and division by zero has no answer.'
			},
			{
				q: 'Why does a big result show as a power of ten?',
				a: 'Results of one million or more are shown in scientific notation, so they are easier to read. For example, 10⁶ is shown as 1 × 10⁶, which is the same as 1,000,000.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Exponentiation', url: 'https://en.wikipedia.org/wiki/Exponentiation' },
			{ title: 'Wikipedia — Scientific notation', url: 'https://en.wikipedia.org/wiki/Scientific_notation' }
		]
	}
});
