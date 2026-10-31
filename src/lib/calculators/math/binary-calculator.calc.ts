import { defineCalculator, type CalculationResult, type InputValues, type Metric } from '../types';
import { DASH } from '../format';
import meta from './binary-calculator.meta';

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
const dec = (n: bigint) => (n < BigInt(0) ? MINUS : '') + abs(n).toLocaleString('en-US');
const inMode = (m: string) => (v: InputValues) => String(v.mode) === m;

/** Unsigned binary text. Spaces are ignored; anything other than 0 and 1 is rejected. */
function parseBinary(text: string): bigint | null {
	const s = text.replace(/\s/g, '');
	if (!/^[01]+$/.test(s) || s.length > MAX_DIGITS) return null;
	return BigInt(`0b${s}`);
}

/** Decimal text with an optional minus sign. */
function parseDecimal(text: string): bigint | null {
	const s = text.replace(/\s/g, '');
	if (!/^-?\d+$/.test(s) || s.length > MAX_DIGITS) return null;
	return BigInt(s);
}

function metricsFor(n: bigint): Metric[] {
	return [
		{ label: 'Binary', value: toBase(n, 2) },
		{ label: 'Decimal', value: dec(n) },
		{ label: 'Hexadecimal', value: toBase(n, 16).toUpperCase() },
		{ label: 'Octal', value: toBase(n, 8) }
	];
}

/** "1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 11". Empty when the number is too long to spell out. */
function positionalSum(digits: string): string {
	if (digits.length > 16) return '';
	const n = digits.length;
	const terms = digits.split('').map((d, i) => `${Number(d)}×2${sup(n - 1 - i)}`);
	return `${terms.join(' + ')} = ${BigInt(`0b${digits}`).toString()}`;
}

function fail(summary: string, primaryLabel = 'Binary result'): CalculationResult {
	return { primaryResult: DASH, primaryLabel, summary };
}

function convert(v: InputValues): CalculationResult {
	const text = String(v.value);
	if (String(v.from) === 'binary') {
		const n = parseBinary(text);
		if (n === null) return fail('Enter a binary number, using only the digits 0 and 1.', 'Decimal');
		const digits = text.replace(/\s/g, '');
		const sum = positionalSum(digits);
		const why = sum
			? `Each digit is worth a power of 2, counting from the right: ${sum}.`
			: 'Each digit is worth a power of 2, counting from the right.';
		return {
			primaryResult: dec(n),
			primaryLabel: 'Decimal',
			summary: `${digits} in binary is ${dec(n)} in decimal. ${why}`,
			secondaryMetrics: metricsFor(n)
		};
	}

	const n = parseDecimal(text);
	if (n === null) return fail('Enter a whole number, such as 100. Use a minus sign for negative numbers.', 'Binary');
	const bits = toBase(n, 2);
	const sign = n < BigInt(0) ? ' The minus sign stays in front.' : '';
	return {
		primaryResult: bits,
		primaryLabel: 'Binary',
		long: true,
		summary: `${dec(n)} in decimal is ${bits} in binary. Divide by 2, keep each remainder, and read the remainders from the bottom up.${sign}`,
		secondaryMetrics: metricsFor(n)
	};
}

function arithmetic(v: InputValues): CalculationResult {
	const op = String(v.op);
	const aText = String(v.a);
	const bText = String(v.b);
	const a = parseBinary(aText);
	const b = parseBinary(bText);
	if (a === null || b === null) return fail('Enter two binary numbers, using only the digits 0 and 1.');
	if (!(op in OPS)) return fail('Pick an operation.');

	const sym = OPS[op];
	if (op === 'div') {
		if (b === BigInt(0)) {
			return fail('You can’t divide by zero. Change the second number to something other than 0.', 'Quotient (binary)');
		}
		const q = a / b;
		const r = a % b;
		return {
			primaryResult: toBase(q, 2),
			primaryLabel: 'Quotient (binary)',
			long: true,
			summary: `${toBase(a, 2)} ÷ ${toBase(b, 2)} = ${toBase(q, 2)} remainder ${toBase(r, 2)} in binary. In decimal, ${dec(a)} ÷ ${dec(b)} = ${dec(q)} remainder ${dec(r)}.`,
			secondaryMetrics: [...metricsFor(q), { label: 'Remainder', value: `${toBase(r, 2)} (decimal ${dec(r)})` }]
		};
	}

	let result: bigint;
	if (op === 'add') result = a + b;
	else if (op === 'sub') result = a - b;
	else result = a * b;

	return {
		primaryResult: toBase(result, 2),
		primaryLabel: 'Result (binary)',
		long: true,
		summary: `${toBase(a, 2)} ${sym} ${toBase(b, 2)} = ${toBase(result, 2)} in binary, which is ${dec(result)} in decimal (${dec(a)} ${sym} ${dec(b)} = ${dec(result)}).`,
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
				{ label: 'Binary', value: 'binary' }
			],
			visibleWhen: inMode('convert')
		},
		{
			id: 'value',
			label: 'Number',
			type: 'text',
			default: '100',
			monospace: true,
			maxLength: 400,
			placeholder: 'e.g. 1011 or 100',
			pattern: /^[\s\d-]*$/,
			patternMessage: 'Use digits only.',
			help: 'Decimal numbers may start with a minus sign. Binary numbers use only 0 and 1.',
			visibleWhen: inMode('convert')
		},
		{
			id: 'a',
			label: 'First binary number',
			type: 'text',
			default: '1011',
			monospace: true,
			maxLength: 400,
			pattern: /^[01\s]*$/,
			patternMessage: 'Binary numbers use only 0 and 1.',
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
			label: 'Second binary number',
			type: 'text',
			default: '101',
			monospace: true,
			maxLength: 400,
			pattern: /^[01\s]*$/,
			patternMessage: 'Binary numbers use only 0 and 1.',
			help: 'For ÷, this is the divisor and cannot be 0.',
			visibleWhen: inMode('arithmetic')
		}
	],
	calculate(v: InputValues): CalculationResult {
		return String(v.mode) === 'arithmetic' ? arithmetic(v) : convert(v);
	},
	content: {
		intro:
			'Convert numbers between decimal and binary, and add, subtract, multiply or divide binary numbers. You also see the decimal, hexadecimal and octal forms of each result.',
		howTo: [
			'Choose Convert to change a number between decimal and binary, or Arithmetic to work with two binary numbers.',
			'Type your number. Binary numbers use only the digits 0 and 1. Spaces are ignored, so 1011 0110 is fine.',
			'Read the result, then check the other bases below it.',
			'For a decimal number, use a minus sign for a negative value.'
		],
		about: [
			{
				heading: 'What is binary?',
				paragraphs: [
					'Binary is a number system with only two digits, 0 and 1. Our everyday decimal system has ten digits, from 0 to 9. The word “binary” comes from “two”, because each place in a binary number is worth two times the place to its right.',
					'Computers use binary because electronic circuits are most reliable with two states, such as on and off. Each 0 or 1 is one bit, and a group of eight bits is one byte.',
					'Binary is not harder than decimal. It just counts with fewer digits, so numbers need more places to be written out.'
				]
			},
			{
				heading: 'Reading a binary number',
				paragraphs: [
					'Each place in a binary number has a value that doubles as you move left: 1, 2, 4, 8, 16, 32, and so on. To read a number, add up the place values where there is a 1. The zeros add nothing.',
					'For example, 1011 has a 1 in the 8s place, a 0 in the 4s place, a 1 in the 2s place and a 1 in the 1s place. So 1011 is 8 + 2 + 1 = 11 in decimal.'
				],
				table: {
					caption: 'Reading 1011 in binary',
					columns: ['Place value', '8', '4', '2', '1'],
					rows: [
						['Binary digit', '1', '0', '1', '1'],
						['Value', '8', '0', '2', '1']
					]
				}
			},
			{
				heading: 'Converting decimal to binary',
				paragraphs: [
					'To change a decimal number into binary, divide by 2 and keep each remainder. Keep dividing the result by 2 until you reach 0. Then read the remainders from the bottom up.',
					'Take 13. Dividing 13 by 2 gives 6 remainder 1. Then 6 ÷ 2 = 3 remainder 0, 3 ÷ 2 = 1 remainder 1, and 1 ÷ 2 = 0 remainder 1. Reading the remainders from the bottom gives 1101. Check it: 8 + 4 + 1 = 13.',
					'The calculator does all of this, and shows the binary, decimal, hexadecimal and octal forms together.'
				]
			},
			{
				heading: 'Binary arithmetic',
				paragraphs: [
					'Binary addition uses the same column method as decimal, but you carry at 2 instead of 10. The only tricky case is 1 + 1, which is 10 in binary: write 0 and carry 1. For example, 1011 + 101 = 10000, which is 11 + 5 = 16.',
					'Multiplication is simpler. Each digit is 0 or 1, so you either add the number or add nothing. For 101 × 11, that is 5 × 3 = 15, which is 1111 in binary.',
					'Division works like long division. For 1011 ÷ 101, the quotient is 10 and the remainder is 1. In decimal, 11 ÷ 5 = 2 remainder 1. For more on this method, see the [long division calculator](/long-division-calculator).'
				]
			},
			{
				heading: 'Binary in computing',
				paragraphs: [
					'A group of 8 bits is one byte. The largest value one byte can hold is 11111111, which is 255 in decimal. Bytes are the usual unit for computer memory and file sizes.',
					'Larger numbers use more bits. A 32-bit number can hold values up to 4,294,967,295. Hexadecimal is often used as a shorter way to write binary, because each hex digit stands for four bits. The [hex calculator](/hex-calculator) converts between the two.',
					'Programmers also use binary when they work with text encoding, such as [base64](/base64-encode-decode), which packs bits into printable characters.'
				]
			},
		],
		formulas: [
			{
				title: 'Binary to decimal',
				expression: 'value = dₙ×2ⁿ + … + d₂×2² + d₁×2¹ + d₀×2⁰',
				variables: [
					{ symbol: 'dₖ', meaning: 'the digit (0 or 1) in position k, counting from the right starting at 0' },
					{ symbol: '2ᵏ', meaning: 'the place value of that position: 1, 2, 4, 8, 16 and so on' }
				]
			},
			{
				title: 'Decimal to binary',
				expression: 'Divide by 2 and keep the remainder. Repeat on the quotient until it is 0, then read the remainders from last to first.',
				variables: [{ symbol: 'r', meaning: 'each remainder is 0 or 1 and becomes one binary digit' }]
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
			title: 'Add 1011 and 101 in binary',
			steps: [
				'1011 in decimal is 1×8 + 0×4 + 1×2 + 1×1 = 11.',
				'101 in decimal is 1×4 + 0×2 + 1×1 = 5.',
				'11 + 5 = 16.',
				'16 in binary is 10000, one 16 and nothing smaller.'
			],
			result: '1011 + 101 = 10000 in binary, which is 16 in decimal.'
		},
		faq: [
			{
				q: 'How do I convert decimal to binary by hand?',
				a: 'Divide the number by 2 and write down the remainder. Keep dividing the quotient by 2 until it reaches 0. Reading the remainders from the last one to the first gives the binary number.'
			},
			{
				q: 'Why do computers use binary?',
				a: 'Digital circuits have two stable states, on and off, which map directly to 1 and 0. Every number, letter and instruction a computer handles is stored as a pattern of these bits.'
			},
			{
				q: 'What does integer division mean for binary numbers?',
				a: 'It works like ordinary division with a remainder, except the quotient is a whole number. For example, 1011 ÷ 101 gives a quotient of 10 and a remainder of 1, because 11 ÷ 5 is 2 remainder 1.'
			},
			{
				q: 'Can this calculator handle negative numbers?',
				a: 'Yes. Decimal inputs can start with a minus sign, and a negative result is shown with a minus sign in front of its binary digits. The calculator does not use two’s complement, the form some processors use internally.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Binary number', url: 'https://en.wikipedia.org/wiki/Binary_number' },
			{ title: 'Wikipedia — Bit', url: 'https://en.wikipedia.org/wiki/Bit' }
		]
	}
});
