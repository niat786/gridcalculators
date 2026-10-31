import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH } from '../format';
import meta from './scientific-notation-calculator.meta';

/** Guards against inputs such as "1e99999999" that would make a huge plain-decimal string. */
const MAX_EXPONENT = 10000;
const MINUS = '−';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const supDigits = (n: number) =>
	String(n)
		.split('')
		.map((d) => SUP[Number(d)])
		.join('');
const supExp = (e: number) => (e < 0 ? '⁻' : '') + supDigits(Math.abs(e));

interface Parsed {
	neg: boolean;
	/** Significant digits with no leading zeros. Empty for zero. */
	D: string;
	/** Value = 0.D × 10^point. */
	point: number;
}

/**
 * Reads the text as digits and a power of ten, without floating-point math, so long inputs stay exact.
 * Commas and spaces are ignored. Trailing zeros are dropped unless the number has a decimal point.
 */
function parse(text: string): Parsed | null {
	const cleaned = text.replace(/[,\s_]/g, '');
	const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(cleaned);
	if (!m) return null;
	const ip = m[2];
	const fp = m[3] ?? '';
	if (ip.length + fp.length === 0) return null;
	const e10 = m[4] === undefined ? 0 : Number(m[4]);
	if (!Number.isFinite(e10) || Math.abs(e10) > MAX_EXPONENT) return null;

	let D = ip + fp;
	let point = ip.length + e10;
	const lead = D.length - D.replace(/^0+/, '').length;
	D = D.slice(lead);
	point -= lead;
	if (D === '') return { neg: m[1] === '-', D: '', point: 0 };
	if (fp === '') D = D.replace(/0+$/, '');
	return { neg: m[1] === '-', D, point };
}

/** Round half up to n significant digits. A carry such as 999.6 → 1000 moves the point. */
function roundTo(D: string, point: number, n: number): { D: string; point: number } {
	if (D.length <= n) return { D: D.padEnd(n, '0'), point };
	const head = D.slice(0, n);
	if (D.charAt(n) < '5') return { D: head, point };
	const up = (BigInt(head) + BigInt(1)).toString();
	if (up.length > n) return { D: up.slice(0, n), point: point + 1 };
	return { D: up, point };
}

/** Plain decimal from digits and the point position, e.g. ("123", -3) → "0.000123". */
function toPlain(D: string, point: number): string {
	if (point <= 0) return `0.${'0'.repeat(-point)}${D}`;
	if (point >= D.length) return D + '0'.repeat(point - D.length);
	return `${D.slice(0, point)}.${D.slice(point)}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'value',
			label: 'Number',
			type: 'text',
			default: '0.000123',
			monospace: true,
			maxLength: 400,
			placeholder: 'e.g. 0.000123 or 1.23e-4',
			pattern: /^[\s\d,._+\-eE]*$/,
			patternMessage: 'Use digits, a decimal point, commas or an exponent such as 1.23e-4.',
			help: 'Commas and spaces are ignored. An exponent such as e-4 or E6 is allowed.'
		},
		{
			id: 'sig',
			label: 'Significant figures',
			type: 'select',
			default: 'auto',
			options: [
				{ label: 'Auto (keep the digits entered)', value: 'auto' },
				{ label: '1', value: '1' },
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
				{ label: '4', value: '4' },
				{ label: '5', value: '5' },
				{ label: '6', value: '6' },
				{ label: '7', value: '7' },
				{ label: '8', value: '8' },
				{ label: '9', value: '9' },
				{ label: '10', value: '10' }
			],
			help: 'Round the coefficient to this many significant digits, or keep every digit you typed.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const label = 'Scientific notation';
		const parsed = parse(String(v.value));
		if (!parsed) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Enter a number, such as 0.000123, 1.23e-4 or 1,230,000.'
			};
		}

		if (parsed.D === '') {
			return {
				primaryResult: `0 × 10⁰`,
				primaryLabel: label,
				summary: 'Zero is written as 0 × 10⁰.',
				secondaryMetrics: [
					{ label: 'E notation', value: '0E0' },
					{ label: 'Engineering notation', value: '0E0' },
					{ label: 'Plain decimal', value: '0' },
					{ label: 'Significant figures', value: DASH }
				]
			};
		}

		const sigRaw = String(v.sig);
		// Only 1–10 are valid; anything else falls back to Auto.
		const sigOpt = /^(10|[1-9])$/.test(sigRaw) ? sigRaw : 'auto';
		let { D, point } = parsed;
		if (sigOpt !== 'auto') ({ D, point } = roundTo(D, point, Number(sigOpt)));

		const sign = parsed.neg ? MINUS : '';
		const exp = point - 1;
		const mantissa = D.length > 1 ? `${D[0]}.${D.slice(1)}` : D;

		// Engineering notation: the exponent is a multiple of 3, and the coefficient runs from 1 to 999.
		const e3 = Math.floor(exp / 3) * 3;
		const before = exp - e3 + 1;
		const padded = D.padEnd(before, '0');
		const engMantissa = padded.slice(0, before) + (padded.length > before ? `.${padded.slice(before)}` : '');

		const shift = Math.abs(exp);
		const summary =
			exp === 0
				? 'The number is already between 1 and 10, so the exponent is 0.'
				: `Move the decimal point ${shift} place${shift === 1 ? '' : 's'} to the ${exp < 0 ? 'right' : 'left'}, so one digit sits before it.`;
		const rounded =
			sigOpt === 'auto' ? '' : ` Rounded half up to ${sigOpt} significant figure${sigOpt === '1' ? '' : 's'}.`;

		return {
			primaryResult: `${sign}${mantissa} × 10${supExp(exp)}`,
			primaryLabel: label,
			summary: summary + rounded,
			secondaryMetrics: [
				{ label: 'E notation', value: `${sign}${mantissa}E${exp}` },
				{ label: 'Engineering notation', value: `${sign}${engMantissa}E${e3}` },
				{ label: 'Plain decimal', value: `${sign}${toPlain(D, point)}` },
				{ label: 'Significant figures', value: String(D.length) }
			]
		};
	},
	content: {
		intro:
			'Write any number in scientific notation, a number from 1 up to 10 multiplied by a power of ten. You also get E notation, engineering notation and the plain decimal, and you can round to a set number of significant figures.',
		howTo: [
			'Type a number. You can use a decimal point, commas such as 1,230,000, or an exponent such as 1.23e-4.',
			'Choose how many significant figures to keep, or leave it on Auto to keep the digits you typed.',
			'Read the scientific form first. Then check the E, engineering and plain decimal versions.'
		],
		about: [
			{
				heading: 'What scientific notation is',
				paragraphs: [
					'Scientific notation is a short way to write very large or very small numbers. It has two parts: a coefficient, and a power of ten. The coefficient is at least 1 and less than 10. So 1,230,000 becomes 1.23 × 10⁶.',
					'The power of ten tells you the size. A positive power means a big number, and a negative power means a number less than 1. So 1.23 × 10⁶ is a million or more, and 1.23 × 10⁻⁴ is a small decimal.',
					'Scientists use it for things such as the number of atoms in a sample. Avogadro’s constant is about 6.022 × 10²³, which would be hard to read written out in full.'
				]
			},
			{
				heading: 'Converting by moving the decimal point',
				paragraphs: [
					'To convert, move the decimal point until exactly one non-zero digit sits in front of it. Count how many places you moved. That count is the exponent.',
					'Moving the point left makes the exponent positive. For example, 45,000 moves four places left to 4.5, so 45,000 is 4.5 × 10⁴. Moving it right makes the exponent negative. So 0.0045 moves three places right to 4.5, giving 4.5 × 10⁻³.',
					'A number between 1 and 10 has an exponent of 0. For example, 4.5 is 4.5 × 10⁰. The calculator shows this case as well.'
				]
			},
			{
				heading: 'E notation and engineering notation',
				paragraphs: [
					'Calculators and spreadsheets often show scientific notation with the letter E. So 1.23 × 10⁻⁴ is written 1.23E-4. This is called E notation, and it means exactly the same thing.',
					'Engineering notation is a close relative. Its exponent is always a multiple of 3, such as 3, 6 or −9. Those exponents match the standard prefixes: kilo is 10³, mega is 10⁶, milli is 10⁻³ and micro is 10⁻⁶. So 47,000 ohms is 47 × 10³ ohms, which is 47 kilohms.',
					'The official list of metric prefixes is kept by NIST, which is linked in the sources below. For converting between units, use the [unit converter](/unit-converter).'
				]
			},
			{
				heading: 'Significant figures',
				paragraphs: [
					'Significant figures are the digits that carry meaning in a measurement. All non-zero digits count. Zeros between non-zero digits count. Leading zeros before the first non-zero digit do not count.',
					'For example, 0.000123 has three significant figures. The zeros at the front only show the position of the decimal point. A number such as 1,230,000 has three, because the trailing zeros are placeholders.',
					'To round to a set number of significant figures, keep that many digits and look at the next one. If it is 5 or more, round up. For example, 1.2345 to three significant figures is 1.23. And 9.996 to three significant figures is 10.0, which is written 1.00 × 10¹.'
				]
			},
			{
				heading: 'Tips for writing numbers',
				paragraphs: [
					'Scientific notation is easier to check when you write the steps down. A simple check is to multiply back. The number you get should match the original.'
				],
				list: [
					'Keep one digit before the decimal point, and no more.',
					'Use commas freely when you type. The calculator ignores them.',
					'Use the [exponent calculator](/exponent-calculator) to check a power of ten.',
					'For very large counts, the [big number calculator](/big-number-calculator) works with long digit strings.'
				]
			}
		],
		formulas: [
			{
				title: 'Scientific notation',
				expression: 'x = a × 10ⁿ, where 1 ≤ |a| < 10',
				variables: [
					{ symbol: 'a', meaning: 'the coefficient, with exactly one non-zero digit before the decimal point' },
					{ symbol: 'n', meaning: 'the exponent: how many places the decimal point moves to reach a' }
				]
			},
			{
				title: 'Engineering notation',
				expression: 'x = a × 10ᵐ, where m is a multiple of 3 and 1 ≤ |a| < 1000',
				variables: [{ symbol: 'm', meaning: 'an exponent that is a multiple of 3, such as −6, 3 or 9' }]
			},
			{
				title: 'Rounding to significant figures',
				expression: 'Keep the first k non-zero digits. If the next digit is 5 or more, round up.',
				variables: [{ symbol: 'k', meaning: 'the number of significant figures you choose' }]
			}
		],
		example: {
			title: 'Write 0.000123 in scientific notation',
			steps: [
				'Move the decimal point 4 places to the right: 0.000123 becomes 1.23.',
				'Moving right makes the exponent negative, so the exponent is −4.',
				'Check: 1.23 × 10⁻⁴ = 1.23 ÷ 10000 = 0.000123.',
				'In engineering notation the exponent must be a multiple of 3, so 123 × 10⁻⁶.'
			],
			result: '0.000123 = 1.23 × 10⁻⁴, which is 1.23E-4 in E notation.'
		},
		faq: [
			{
				q: 'What is the difference between E notation and scientific notation?',
				a: 'They describe the same value. E notation writes the power of ten with the letter E, so 1.23 × 10⁻⁴ is written 1.23E-4. Calculators and spreadsheets usually display E notation.'
			},
			{
				q: 'When should I use engineering notation?',
				a: 'Use it when you want the power of ten to match a unit prefix. Exponents that are multiples of 3 line up with kilo, mega, milli and micro, so 123 × 10⁻⁶ is easy to read as 123 micro-units.'
			},
			{
				q: 'What are significant figures?',
				a: 'They are the digits that carry meaning in a number: all non-zero digits, and zeros between them. Trailing zeros after a decimal point also count. Choosing fewer significant figures rounds the number to that precision.'
			},
			{
				q: 'Can I enter numbers with commas?',
				a: 'Yes. Commas and spaces are ignored, so 1,230,000 and 1230000 give the same result, 1.23 × 10⁶.'
			},
			{
				q: 'What does a number between 1 and 10 look like in scientific notation?',
				a: 'Its exponent is 0, so the power of ten is 10⁰, which equals 1. For example, 4.5 is written as 4.5 × 10⁰.'
			}
		],
		sources: [
			{ title: 'NIST — Metric (SI) prefixes', url: 'https://www.nist.gov/pml/owm/metric-si-prefixes' },
			{ title: 'Wikipedia — Scientific notation', url: 'https://en.wikipedia.org/wiki/Scientific_notation' }
		]
	}
});
