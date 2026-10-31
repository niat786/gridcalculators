import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './big-number-calculator.meta';

const MAX_DIGITS = 10000;
const MAX_POWER = 10000;
const MAX_RESULT_DIGITS = 100000;

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result', summary });

const NOT_A_WHOLE_NUMBER =
	'Use whole numbers only: an optional + or − sign, then digits, up to 10,000 digits. Decimals and commas are not allowed.';

/** Parses an optional sign and digits into a BigInt. Returns null for anything else. */
function parseBig(raw: string): bigint | null {
	const s = raw.trim();
	if (!/^[+-]?\d+$/.test(s)) return null;
	if (s.replace(/^[+-]/, '').length > MAX_DIGITS) return null;
	return BigInt(s);
}

const abs = (x: bigint): bigint => (x < 0n ? -x : x);

/** Euclid's algorithm on BigInt values. */
function gcdBig(a: bigint, b: bigint): bigint {
	let x = abs(a);
	let y = abs(b);
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

/** Floored modulo, like Excel's MOD: the result has the same sign as the divisor. */
function modFloor(a: bigint, b: bigint): bigint {
	const r = a % b;
	return r !== 0n && r < 0n !== b < 0n ? r + b : r;
}

/**
 * Power with the result-size guard. Estimates the digit count from log10 first so an oversized
 * request is refused before any huge multiplication runs.
 */
function power(base: bigint, exp: bigint): bigint | string {
	if (exp < 0n || exp > BigInt(MAX_POWER)) return 'The exponent must be a whole number from 0 to 10,000.';
	if (abs(base) <= 1n) return base ** exp;
	const digits = abs(base).toString();
	const lead = Number(digits.slice(0, 15));
	const log10Base = Math.log10(lead) + Math.max(0, digits.length - 15);
	if (Number(exp) * log10Base > MAX_RESULT_DIGITS + 5) {
		return 'That power would have more than 100,000 digits. Try a smaller exponent.';
	}
	const result = base ** exp;
	if (abs(result).toString().length > MAX_RESULT_DIGITS) {
		return 'That power would have more than 100,000 digits. Try a smaller exponent.';
	}
	return result;
}

const LABELS: Record<string, { label: string; what: string }> = {
	add: { label: 'Sum', what: 'A plus B' },
	subtract: { label: 'Difference', what: 'A minus B' },
	multiply: { label: 'Product', what: 'A times B' },
	quotient: { label: 'Whole-number quotient', what: 'A divided by B, rounded toward zero' },
	remainder: { label: 'Remainder', what: 'What is left over after dividing A by B, with the sign of A' },
	power: { label: 'Power (A raised to B)', what: 'A raised to the power B, with B from 0 to 10,000' },
	modulo: { label: 'Modulo (A mod B)', what: 'A modulo B, with the sign of B' },
	gcd: { label: 'Greatest common divisor', what: 'The largest whole number that divides both A and B' }
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'a',
			label: 'First number (A)',
			type: 'text',
			default: '12345678901234567890',
			monospace: true,
			maxLength: MAX_DIGITS + 1,
			pattern: /^\s*[+-]?\d+\s*$/,
			patternMessage: NOT_A_WHOLE_NUMBER,
			help: 'Whole numbers only, up to 10,000 digits.'
		},
		{
			id: 'b',
			label: 'Second number (B)',
			type: 'text',
			default: '12',
			monospace: true,
			maxLength: MAX_DIGITS + 1,
			pattern: /^\s*[+-]?\d+\s*$/,
			patternMessage: NOT_A_WHOLE_NUMBER,
			help: 'For a power, this is the exponent: a whole number from 0 to 10,000.'
		},
		{
			id: 'op',
			label: 'Operation',
			type: 'select',
			display: 'menu',
			default: 'multiply',
			options: [
				{ label: 'A + B (add)', value: 'add' },
				{ label: 'A − B (subtract)', value: 'subtract' },
				{ label: 'A × B (multiply)', value: 'multiply' },
				{ label: 'A ÷ B, whole-number quotient', value: 'quotient' },
				{ label: 'A ÷ B, remainder', value: 'remainder' },
				{ label: 'A ^ B (power)', value: 'power' },
				{ label: 'A mod B (modulo)', value: 'modulo' },
				{ label: 'GCD of A and B', value: 'gcd' }
			]
		}
	],
	calculate(v: InputValues): CalculationResult {
		const op = String(v.op);
		const info = LABELS[op];
		if (!info) return fail('Choose an operation.');
		const a = parseBig(String(v.a));
		const b = parseBig(String(v.b));
		if (a === null || b === null) return fail(NOT_A_WHOLE_NUMBER);

		let result: bigint;
		if (op === 'add') result = a + b;
		else if (op === 'subtract') result = a - b;
		else if (op === 'multiply') {
			result = a * b;
			if (abs(result).toString().length > MAX_RESULT_DIGITS) {
				return fail('The product would have more than 100,000 digits. Try smaller numbers.');
			}
		} else if (op === 'power') {
			const p = power(a, b);
			if (typeof p === 'string') return fail(p);
			result = p;
		} else if (op === 'gcd') result = gcdBig(a, b);
		else {
			if (b === 0n) return fail('Division by zero is not defined. Change B to a number other than 0.');
			result = op === 'quotient' ? a / b : op === 'remainder' ? a % b : modFloor(a, b);
		}

		const text = result.toString();
		const digits = abs(result).toString();
		const sign = result > 0n ? 'Positive' : result < 0n ? 'Negative' : 'Zero';
		const scientific =
			result === 0n
				? '0'
				: `${result < 0n ? '−' : ''}${digits.length > 1 ? `${digits[0]}.${digits.slice(1, 8)}` : digits} × 10^${digits.length - 1}`;

		return {
			primaryResult: text,
			primaryLabel: info.label,
			long: true,
			summary: `${info.what}. Whole numbers only, so decimals are never shown.`,
			secondaryMetrics: [
				{ label: 'Digits in the result', value: num(digits.length, 0) },
				{ label: 'Sign', value: sign },
				{ label: 'Scientific notation (first digits)', value: scientific }
			]
		};
	},
	content: {
		intro:
			'Work with whole numbers far too large for a normal calculator, with up to 10,000 digits in each number. Every result is exact, with no rounding and no scientific notation in the answer.',
		howTo: [
			'Type the first number (A) and the second number (B). Use digits only, with an optional + or − sign.',
			'Choose an operation. For a power, B is the exponent and must be from 0 to 10,000.',
			'Read the result and its digit count. Results are whole numbers, so decimals are not supported.'
		],
		about: [
			{
				heading: 'What counts as a big number?',
				paragraphs: [
					'Most calculators show about 10 to 16 digits. Anything larger is either rounded or shown in scientific notation. The factorial of 30, for example, has 33 digits, which is more than most calculators can show.',
					'This calculator treats each whole number as a string of digits, so the length is limited only by the 10,000-digit input cap. For example, 2⁶⁴ is 18,446,744,073,709,551,616. That has 20 digits, and every one of them is shown.',
					'You can also type very long numbers directly, such as 12345678901234567890 times 12, which gives 148148146814814814680.'
				]
			},
			{
				heading: 'Why exact answers matter',
				paragraphs: [
					'Many calculators store numbers with about 15 to 17 significant digits. When a number is longer, the last digits can be lost. For example, 9,007,199,254,740,993 cannot always be held exactly by that kind of calculator.',
					'Exact integer arithmetic keeps every digit. That matters in number theory and computer science, and in checking long ID numbers. The answer is the same no matter how many digits you enter.',
					'The trade-off is that decimals are left out. Exact results for decimals would need a fixed number of places, so this tool works only with whole numbers.'
				]
			},
			{
				heading: 'Quotient, remainder and modulo',
				paragraphs: [
					'Division of whole numbers gives two results. The quotient is how many whole groups of B fit into A. The remainder is what is left over. For example, 100 ÷ 7 gives a quotient of 14 and a remainder of 2, because 7 × 14 + 2 = 100.',
					'The calculator also offers modulo. For positive numbers, modulo and remainder give the same answer. They differ only when a negative number is involved, and the sign rule is the difference.',
					'For more on remainders with ordinary numbers, the [long division calculator](/long-division-calculator) shows each step.'
				]
			},
			{
				heading: 'Powers and the greatest common divisor',
				paragraphs: [
					'A power multiplies a number by itself. The exponent can be from 0 to 10,000, and the result is limited to 100,000 digits. So 2¹⁰ is 1,024, while a very large exponent on a big base is refused with a message.',
					'The greatest common divisor (GCD) is the largest whole number that divides both numbers. The calculator finds it with the Euclidean algorithm, which works well even for very long numbers. For example, the GCD of 48 and 180 is 12. The [GCF calculator](/gcf-calculator) shows each step for smaller numbers.'
				]
			},
			{
				heading: 'Reading digit counts and scientific notation',
				paragraphs: [
					'Each result shows its number of digits, its sign and the first digits in scientific notation. The digit count is useful for checking. For example, 10¹⁰⁰ is a 1 followed by 100 zeros, so it has 101 digits.',
					'A quick way to check a result is to count the digits. Multiplying a 10-digit number by a 12-digit number always gives 21 or 22 digits.',
					'To write a result as a short power of ten, use the [scientific notation calculator](/scientific-notation-calculator).',
					'Very large numbers also matter for internet security. Some encryption methods depend on the difficulty of splitting a huge number into its prime factors. For smaller numbers, the [prime factorization calculator](/prime-factorization-calculator) shows each prime.'
				]
			},
		],
		formulas: [
			{
				title: 'Quotient and remainder',
				expression: 'A = B × q + r, where q is the whole-number quotient and r is the remainder',
				variables: [
					{ symbol: 'q', meaning: 'the quotient, rounded toward zero' },
					{ symbol: 'r', meaning: 'the remainder, with the same sign as A' }
				]
			},
			{
				title: 'Modulo',
				expression: 'mod(A, B) = A − B × ⌊A ÷ B⌋, so the result has the same sign as B',
				variables: [{ symbol: '⌊ ⌋', meaning: 'round down to the nearest whole number' }]
			},
			{
				title: 'Greatest common divisor',
				expression: 'gcd(A, B) is found by the Euclidean algorithm: gcd(A, B) = gcd(B, A mod B) until B is 0',
				variables: [{ symbol: 'gcd', meaning: 'the largest whole number that divides both A and B' }]
			}
		],
		example: {
			title: '10³⁰ divided by 7',
			steps: [
				'A = 1 followed by 30 zeros, and B = 7',
				'Quotient: 142857142857142857142857142857 (30 digits)',
				'Remainder: 10³⁰ − 7 × 142857142857142857142857142857 = 1'
			],
			result: 'The quotient is 142,857,142,857,142,857,142,857,142,857 with remainder 1.'
		},
		faq: [
			{
				q: 'Why does this calculator not show decimals?',
				a: 'It uses exact integer arithmetic, which keeps every digit with no rounding. Decimal results would need a fixed number of places, so they are left out on purpose.'
			},
			{
				q: 'How big a number can I enter?',
				a: 'Each input can have up to 10,000 digits. A power can have an exponent up to 10,000, and its result is limited to 100,000 digits. A sum can have one more digit than its longest input.'
			},
			{
				q: 'What is the difference between remainder and modulo?',
				a: 'They differ only when a negative number is involved. The remainder keeps the sign of A, so −7 divided by 3 has remainder −1. Modulo keeps the sign of B, so −7 modulo 3 is 2.'
			},
			{
				q: 'Is the answer rounded in any way?',
				a: 'No. Every operation uses whole-number arithmetic, so the result has every digit the operation produces. The only limit is the digit caps described above.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Arbitrary-precision arithmetic', url: 'https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic' },
			{ title: 'Wikipedia — Euclidean algorithm', url: 'https://en.wikipedia.org/wiki/Euclidean_algorithm' }
		]
	}
});
