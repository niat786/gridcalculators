import { defineCalculator, type CalculationResult, type InputValues, type Metric } from '../types';
import { DASH } from '../format';
import meta from './hex-calculator.meta';

/** Longest number accepted, in digits. BigInt keeps every value exact, so this only guards against huge pastes. */
const MAX_DIGITS = 400;
const MINUS = '−';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const OPS: Record<string, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

const sup = (n: number) =>
	String(n)
		.split('')
		.map((d) => SUP[Number(d)])
		.join('');
const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
const toBase = (n: bigint, base: number) => (n < BigInt(0) ? MINUS : '') + abs(n).toString(base);
const hex = (n: bigint) => toBase(n, 16).toUpperCase();
const dec = (n: bigint) => (n < BigInt(0) ? MINUS : '') + abs(n).toLocaleString('en-US');
const inMode = (m: string) => (v: InputValues) => String(v.mode) === m;

/** Hexadecimal text, case-insensitive. Spaces are ignored. */
function parseHex(text: string): bigint | null {
	const s = text.replace(/\s/g, '');
	if (!/^[0-9a-fA-F]+$/.test(s) || s.length > MAX_DIGITS) return null;
	return BigInt(`0x${s}`);
}

/** Decimal text with an optional minus sign. */
function parseDecimal(text: string): bigint | null {
	const s = text.replace(/\s/g, '');
	if (!/^-?\d+$/.test(s) || s.length > MAX_DIGITS) return null;
	return BigInt(s);
}

function metricsFor(n: bigint): Metric[] {
	return [
		{ label: 'Hexadecimal', value: hex(n) },
		{ label: 'Decimal', value: dec(n) },
		{ label: 'Binary', value: toBase(n, 2) }
	];
}

/** "15×16¹ + 15×16⁰ = 255". Empty when the number is too long to spell out. */
function positionalSum(digits: string): string {
	if (digits.length > 8) return '';
	const n = digits.length;
	const terms = digits.split('').map((d, i) => `${parseInt(d, 16)}×16${sup(n - 1 - i)}`);
	return `${terms.join(' + ')} = ${BigInt(`0x${digits}`).toString()}`;
}

function fail(summary: string, primaryLabel = 'Hexadecimal result'): CalculationResult {
	return { primaryResult: DASH, primaryLabel, summary };
}

function convert(v: InputValues): CalculationResult {
	const text = String(v.value);
	if (String(v.from) === 'hex') {
		const n = parseHex(text);
		if (n === null) return fail('Enter a hexadecimal number, using 0–9 and A–F.', 'Decimal');
		const digits = text.replace(/\s/g, '').toUpperCase();
		const sum = positionalSum(digits);
		const why = sum
			? `Each digit is worth a power of 16, counting from the right: ${sum}.`
			: 'Each digit is worth a power of 16, counting from the right.';
		return {
			primaryResult: dec(n),
			primaryLabel: 'Decimal',
			summary: `${digits} in hexadecimal is ${dec(n)} in decimal. ${why}`,
			secondaryMetrics: metricsFor(n)
		};
	}

	const n = parseDecimal(text);
	if (n === null) return fail('Enter a whole number, such as 255. Use a minus sign for negative numbers.', 'Hexadecimal');
	const h = hex(n);
	const sign = n < BigInt(0) ? ' The minus sign stays in front.' : '';
	return {
		primaryResult: h,
		primaryLabel: 'Hexadecimal',
		long: true,
		summary: `${dec(n)} in decimal is ${h} in hexadecimal. Divide by 16, keep each remainder, and read the remainders from the bottom up. Remainders of 10 to 15 are written A to F.${sign}`,
		secondaryMetrics: metricsFor(n)
	};
}

function arithmetic(v: InputValues): CalculationResult {
	const op = String(v.op);
	const a = parseHex(String(v.a));
	const b = parseHex(String(v.b));
	if (a === null || b === null) return fail('Enter two hexadecimal numbers, using 0–9 and A–F.');
	if (!(op in OPS)) return fail('Pick an operation.');

	const sym = OPS[op];
	if (op === 'div') {
		if (b === BigInt(0)) {
			return fail('You can’t divide by zero. Change the second number to something other than 0.', 'Quotient (hexadecimal)');
		}
		const q = a / b;
		const r = a % b;
		return {
			primaryResult: hex(q),
			primaryLabel: 'Quotient (hexadecimal)',
			long: true,
			summary: `${hex(a)} ÷ ${hex(b)} = ${hex(q)} remainder ${hex(r)} in hexadecimal. In decimal, ${dec(a)} ÷ ${dec(b)} = ${dec(q)} remainder ${dec(r)}.`,
			secondaryMetrics: [...metricsFor(q), { label: 'Remainder', value: `${hex(r)} (decimal ${dec(r)})` }]
		};
	}

	let result: bigint;
	if (op === 'add') result = a + b;
	else if (op === 'sub') result = a - b;
	else result = a * b;

	return {
		primaryResult: hex(result),
		primaryLabel: 'Result (hexadecimal)',
		long: true,
		summary: `${hex(a)} ${sym} ${hex(b)} = ${hex(result)} in hexadecimal, which is ${dec(result)} in decimal (${dec(a)} ${sym} ${dec(b)} = ${dec(result)}).`,
		secondaryMetrics: metricsFor(result)
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Mode',
			type: 'select',
			display: 'segmented',
			default: 'convert',
			options: [
				{ label: 'Convert', value: 'convert' },
				{ label: 'Arithmetic', value: 'arithmetic' }
			]
		},
		{
			id: 'from',
			label: 'Convert from',
			type: 'select',
			display: 'segmented',
			default: 'decimal',
			options: [
				{ label: 'Decimal', value: 'decimal' },
				{ label: 'Hexadecimal', value: 'hex' }
			],
			visibleWhen: inMode('convert')
		},
		{
			id: 'value',
			label: 'Number',
			type: 'text',
			default: '255',
			monospace: true,
			maxLength: 400,
			placeholder: 'e.g. 255 or FF',
			pattern: /^[\s0-9a-fA-F-]*$/,
			patternMessage: 'Use 0–9 and A–F only.',
			help: 'Hex uses 0–9 and A–F, and is not case-sensitive. Decimal numbers may start with a minus sign.',
			visibleWhen: inMode('convert')
		},
		{
			id: 'a',
			label: 'First hex number',
			type: 'text',
			default: 'FF',
			monospace: true,
			maxLength: 400,
			pattern: /^[0-9a-fA-F\s]*$/,
			patternMessage: 'Use 0–9 and A–F only.',
			visibleWhen: inMode('arithmetic')
		},
		{
			id: 'op',
			label: 'Operation',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: '+', value: 'add' },
				{ label: '−', value: 'sub' },
				{ label: '×', value: 'mul' },
				{ label: '÷', value: 'div' }
			],
			visibleWhen: inMode('arithmetic')
		},
		{
			id: 'b',
			label: 'Second hex number',
			type: 'text',
			default: '1A',
			monospace: true,
			maxLength: 400,
			pattern: /^[0-9a-fA-F\s]*$/,
			patternMessage: 'Use 0–9 and A–F only.',
			help: 'For ÷, this is the divisor and cannot be 0.',
			visibleWhen: inMode('arithmetic')
		}
	],
	calculate(v: InputValues): CalculationResult {
		return String(v.mode) === 'arithmetic' ? arithmetic(v) : convert(v);
	},
	content: {
		intro:
			'Convert whole numbers between hexadecimal (base 16) and decimal, or add, subtract, multiply and divide hex numbers. Results also show the binary form, and division gives the remainder.',
		howTo: [
			'Pick Convert to change one number between decimal and hexadecimal. Then choose which base you are starting from.',
			'Pick Arithmetic to work with two hex numbers. Use 0–9 and A–F. Upper or lower case both work.',
			'Choose an operation. For division, the whole-number quotient is the result, and the remainder is shown below it.'
		],
		about: [
			{
				heading: 'What is hexadecimal?',
				paragraphs: [
					'Hexadecimal, or hex, is a number system with 16 digits. The digits are 0 to 9, then A to F. A stands for 10, B for 11, and so on up to F, which stands for 15.',
					'Each place in a hex number is worth 16 times the place to its right. So the places are worth 1, 16, 256, 4,096 and so on. The full name mixes Greek for six with Latin for ten, and it is often shortened to hex.',
					'Hex is popular with programmers because 16 is a power of 2. One hex digit stands for exactly four binary digits, which makes long binary values much shorter.'
				]
			},
			{
				heading: 'Reading a hex number',
				paragraphs: [
					'To read a hex number, multiply each digit by its place value and add the results. Remember that A to F stand for 10 to 15. So the number 1F4 is 1 × 256 + 15 × 16 + 4 × 1.',
					'That adds up to 256 + 240 + 4 = 500. The calculator shows the same working in its results.'
				],
				table: {
					caption: 'Reading 1F4 in hexadecimal',
					columns: ['Place value', '256', '16', '1'],
					rows: [
						['Hex digit', '1', 'F (15)', '4'],
						['Value', '256', '240', '4']
					]
				}
			},
			{
				heading: 'Converting decimal to hexadecimal',
				paragraphs: [
					'To change a decimal number into hex, divide by 16 and keep each remainder. Keep dividing the result by 16 until you reach 0. Then read the remainders from the bottom up, writing 10 to 15 as A to F.',
					'Take 500. Dividing 500 by 16 gives 31 remainder 4. Then 31 ÷ 16 = 1 remainder 15, which is F. Finally 1 ÷ 16 = 0 remainder 1. Reading from the bottom gives 1F4.',
					'The [binary calculator](/binary-calculator) uses the same method with 2 instead of 16. It is a good place to see how the bases compare.'
				]
			},
			{
				heading: 'Hex arithmetic',
				paragraphs: [
					'Hex arithmetic works like decimal arithmetic, but you carry at 16 instead of 10. For example, FF + 1A is 255 + 26 = 281, which is 119 in hex.',
					'Other examples show the same idea. FF × 2 is 510 in decimal, which is 1FE in hex. And 100 − 1 is 256 − 1 = 255, which is FF.',
					'Division gives a whole-number quotient and a remainder, just like long division. In decimal, the remainder is always smaller than the divisor, and the same is true in hex. For the method on paper, see the [long division calculator](/long-division-calculator). To check decimal sums, the [basic calculator](/basic-calculator) helps.'
				]
			},
			{
				heading: 'Why hex is used in computing',
				paragraphs: [
					'Computers store data in bytes, and one byte is eight bits. Two hex digits can show exactly one byte, so a value from 00 to FF covers every possible byte. That is much easier to read than eight 0s and 1s.',
					'Hex is common in web colour codes. The code #FF0000 means full red, with FF for red, 00 for green and 00 for blue. Memory addresses and error codes are often written in hex too.',
					'To change hex to binary, write each hex digit as its four-bit binary form. For example, F is 1111 and 4 is 0100, so 1F4 is 0001 1111 0100.'
				]
			},
		],
		formulas: [
			{
				title: 'Hexadecimal to decimal',
				expression: 'value = dₙ×16ⁿ + … + d₁×16¹ + d₀×16⁰',
				variables: [
					{ symbol: 'dₖ', meaning: 'the digit in position k, counting from the right starting at 0. A to F stand for 10 to 15' },
					{ symbol: '16ᵏ', meaning: 'the place value of that position: 1, 16, 256, 4096 and so on' }
				]
			},
			{
				title: 'Decimal to hexadecimal',
				expression: 'Divide by 16 and keep the remainder. Repeat on the quotient until it is 0, then read the remainders from last to first.',
				variables: [{ symbol: 'r', meaning: 'each remainder is 0 to 15, written as one hex digit (0–9, then A–F)' }]
			},
			{
				title: 'Division with remainder',
				expression: 'a = q × b + r, where 0 ≤ r < b',
				variables: [
					{ symbol: 'q', meaning: 'the quotient: the whole number of times b fits into a' },
					{ symbol: 'r', meaning: 'the remainder left over' }
				]
			}
		],
		example: {
			title: 'Add FF and 1A in hexadecimal',
			steps: [
				'FF in decimal is 15×16 + 15 = 255.',
				'1A in decimal is 1×16 + 10 = 26.',
				'255 + 26 = 281.',
				'281 in hexadecimal is 119, because 1×256 + 1×16 + 9 = 281.'
			],
			result: 'FF + 1A = 119 in hexadecimal, which is 281 in decimal.'
		},
		faq: [
			{
				q: 'What does hexadecimal use for digits above 9?',
				a: 'It uses the letters A to F for the values 10 to 15. A is 10, B is 11, C is 12, D is 13, E is 14 and F is 15. Case does not matter, so ff and FF are the same number.'
			},
			{
				q: 'Why is hexadecimal used in computing?',
				a: 'One hex digit stands for exactly four binary digits, so a byte (eight bits) fits in two hex digits. That makes long binary values, such as memory addresses and colour codes, shorter and easier to read.'
			},
			{
				q: 'How do I convert decimal to hexadecimal by hand?',
				a: 'Divide the number by 16 and write down the remainder, using A to F for 10 to 15. Repeat on the quotient until it reaches 0, then read the remainders from the last to the first.'
			},
			{
				q: 'Why does the calculator reject the 0x prefix?',
				a: 'The prefix 0x is a programming convention, and the letter x is not a hex digit. Type the digits alone, such as 1F4 instead of 0x1F4.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Hexadecimal', url: 'https://en.wikipedia.org/wiki/Hexadecimal' },
			{ title: 'Wikipedia — Web colors', url: 'https://en.wikipedia.org/wiki/Web_colors' }
		]
	}
});
