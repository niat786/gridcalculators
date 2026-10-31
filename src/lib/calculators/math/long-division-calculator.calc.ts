import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './long-division-calculator.meta';

const MAX_DIVIDEND = 1_000_000_000_000;
const MAX_DIVISOR = 1_000_000;
const DECIMAL_PLACES = 10;
/** Longest repeating block written out in full; longer blocks are cut with an ellipsis. */
const MAX_SHOWN_BLOCK = 40;

export interface DivisionStep {
	/** 1-based position of the digit brought down. */
	step: number;
	digit: number;
	/** Previous remainder × 10 + the digit brought down. */
	partial: number;
	quotientDigit: number;
	product: number;
	remainder: number;
}

/** Digit-by-digit long division of whole numbers. One step per digit of the dividend. */
export function longDivide(dividend: number, divisor: number) {
	const steps: DivisionStep[] = [];
	let remainder = 0;
	let quotientText = '';
	[...String(dividend)].forEach((ch, i) => {
		const digit = Number(ch);
		const partial = remainder * 10 + digit;
		const quotientDigit = Math.floor(partial / divisor);
		const product = quotientDigit * divisor;
		remainder = partial - product;
		steps.push({ step: i + 1, digit, partial, quotientDigit, product, remainder });
		quotientText += String(quotientDigit);
	});
	return { quotient: Number(quotientText), remainder, steps };
}

export interface DecimalForm {
	/** Digits after the decimal point, up to the end of the first repeating block. */
	digits: number[];
	/** Index in `digits` where the repeating block starts, or -1 when the decimal ends. */
	repeatStart: number;
	/** Length of the repeating block; 0 when the decimal ends. */
	period: number;
}

/**
 * Digits of remainder ÷ divisor. A remainder that comes back to one already seen means the
 * digits from there on repeat. Remainders are below the divisor, so this always stops.
 */
export function decimalForm(remainder: number, divisor: number): DecimalForm {
	const digits: number[] = [];
	if (remainder === 0) return { digits, repeatStart: -1, period: 0 };
	const seen = new Map<number, number>([[remainder, 0]]);
	let r = remainder;
	for (;;) {
		r *= 10;
		digits.push(Math.floor(r / divisor));
		r %= divisor;
		if (r === 0) return { digits, repeatStart: -1, period: 0 };
		const first = seen.get(r);
		if (first !== undefined) return { digits, repeatStart: first, period: digits.length - first };
		seen.set(r, digits.length);
	}
}

function digitAt(form: DecimalForm, i: number): number {
	if (form.repeatStart < 0) return form.digits[i] ?? 0;
	if (i < form.repeatStart) return form.digits[i];
	return form.digits[form.repeatStart + ((i - form.repeatStart) % form.period)];
}

function repeatingNotation(intText: string, form: DecimalForm): string {
	if (form.repeatStart < 0) return form.digits.length ? `${intText}.${form.digits.join('')}` : intText;
	const before = form.digits.slice(0, form.repeatStart).join('');
	const block = form.digits.slice(form.repeatStart);
	const shown = block.length > MAX_SHOWN_BLOCK ? `${block.slice(0, MAX_SHOWN_BLOCK).join('')}…` : block.join('');
	return `${intText}.${before}(${shown})`;
}

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'dividend',
			label: 'Dividend (number to divide)',
			type: 'number',
			default: 1234,
			min: 0,
			max: MAX_DIVIDEND,
			decimal: false,
			help: 'A whole number from 0 to 1,000,000,000,000.'
		},
		{
			id: 'divisor',
			label: 'Divisor (divide by)',
			type: 'number',
			default: 7,
			min: 1,
			max: MAX_DIVISOR,
			decimal: false,
			help: 'A whole number from 1 to 1,000,000.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const n = Number(v.dividend);
		const d = Number(v.divisor);
		const valid =
			Number.isInteger(n) && n >= 0 && n <= MAX_DIVIDEND && Number.isInteger(d) && d >= 1 && d <= MAX_DIVISOR;
		if (!valid) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Quotient and remainder',
				summary: `Enter whole numbers: dividend 0 to ${num(MAX_DIVIDEND)}, divisor 1 to ${num(MAX_DIVISOR)}.`
			};
		}

		const { quotient, remainder, steps } = longDivide(n, d);
		const form = decimalForm(remainder, d);
		const intText = num(quotient, 0);
		const tenPlaces = Array.from({ length: DECIMAL_PLACES }, (_, i) => digitAt(form, i)).join('');
		const g = gcd(remainder, d);
		const mixed = remainder === 0 ? intText : `${intText} ${remainder / g}/${d / g}`;

		const table: Table = {
			title: `Long division: ${n} ÷ ${d}`,
			columns: [
				{ key: 'step', label: 'Step' },
				{ key: 'bring', label: 'Bring down', align: 'end' },
				{ key: 'partial', label: 'Partial dividend', align: 'end' },
				{ key: 'divide', label: 'Divide' },
				{ key: 'multiply', label: 'Multiply' },
				{ key: 'subtract', label: 'Subtract' }
			],
			rows: steps.map((s) => ({
				step: String(s.step),
				bring: String(s.digit),
				partial: String(s.partial),
				divide: `${s.partial} ÷ ${d} = ${s.quotientDigit} R ${s.remainder}`,
				multiply: `${s.quotientDigit} × ${d} = ${s.product}`,
				subtract: `${s.partial} − ${s.product} = ${s.remainder}`
			}))
		};

		return {
			primaryResult: `${intText} R ${remainder}`,
			primaryLabel: 'Quotient and remainder',
			summary: `${num(n, 0)} ÷ ${d} = ${intText} with a remainder of ${remainder}. Check: ${d} × ${intText} + ${remainder} = ${num(n, 0)}.`,
			secondaryMetrics: [
				{ label: 'Decimal (first 10 places)', value: `${intText}.${tenPlaces}` },
				{ label: 'Exact or repeating form', value: repeatingNotation(intText, form) },
				{
					label: 'Repeating block',
					value: form.period ? `${num(form.period, 0)} ${form.period === 1 ? 'digit' : 'digits'}` : 'None, the decimal ends'
				},
				{ label: 'Mixed number', value: mixed }
			],
			table
		};
	},
	content: {
		intro:
			'Long division shows how many times one whole number fits into another, and what is left over. This tool works through the number one digit at a time, the way you would on paper.',
		howTo: [
			'Enter the dividend, the number you want to divide, as a whole number up to 1,000,000,000,000.',
			'Enter the divisor, the number you divide by, as a whole number from 1 to 1,000,000. Decimals are not accepted here.',
			'Read the quotient and remainder first, then the decimal form. Repeating digits are shown in brackets.',
			'Follow the table to see each step, with one row for each digit of the dividend.'
		],
		about: [
			{
				heading: 'What long division does',
				paragraphs: [
					'Division asks how many equal groups fit into a number. In 1,234 ÷ 7, the number 1,234 is the dividend, and 7 is the divisor. The answer has two parts: the quotient, which is the number of whole groups, and the remainder, which is what is left over.',
					'For 1,234 ÷ 7, the quotient is 176 and the remainder is 2. Seven fits into 1,234 exactly 176 times, with 2 left over. Long division is the method that finds these two numbers step by step.',
					'You can check any answer with one multiplication. Multiply the divisor by the quotient, then add the remainder. You should get the dividend back. For 1,234, that is 7 × 176 + 2 = 1,234.'
				]
			},
			{
				heading: 'How long division works, step by step',
				paragraphs: [
					'Work from left to right. Take the first digit, or the first few digits, that is big enough to hold the divisor. Divide that part, write the answer, multiply back, and subtract. The result is the remainder for that step. Then bring down the next digit and repeat.',
					'Here is 1,234 ÷ 7 in four steps. The first step uses only the digit 1, which is smaller than 7, so the first quotient digit is 0. The table shows each step, as the calculator does.'
				],
				table: {
					caption: 'Working out 1,234 ÷ 7',
					columns: ['Step', 'Bring down', 'Partial number', 'Divide', 'Subtract'],
					rows: [
						['1', '1', '1', '1 ÷ 7 = 0 R 1', '1 − 0 = 1'],
						['2', '2', '12', '12 ÷ 7 = 1 R 5', '12 − 7 = 5'],
						['3', '3', '53', '53 ÷ 7 = 7 R 4', '53 − 49 = 4'],
						['4', '4', '44', '44 ÷ 7 = 6 R 2', '44 − 42 = 2']
					]
				}
			},
			{
				heading: 'Remainders and the check',
				paragraphs: [
					'The remainder is always smaller than the divisor. If it were as big as the divisor, you could fit in one more group, so the quotient would be larger. That rule is a good way to spot a mistake.',
					'Here the remainder is 2, which is less than 7. The quotient 176 and the remainder 2 together give 1,234, so the answer is correct.',
					'Remainders are also useful in everyday life. If 30 people sit at tables of 4, that fills 7 full tables with 2 people left over, so 8 tables are needed. For more calculations, the [basic calculator](/basic-calculator) does the sums quickly.'
				]
			},
			{
				heading: 'Decimals and repeating decimals',
				paragraphs: [
					'Long division can carry on past the decimal point. Add a zero to the remainder, and keep dividing. Some answers stop, such as 1 ÷ 4 = 0.25. Others repeat forever, such as 1 ÷ 3 = 0.333…',
					'A repeating decimal is written with brackets around the repeating digits. So 1 ÷ 3 is 0.(3), and 2 ÷ 7 is 0.(285714). The calculator shows the repeating block this way.',
					'Every fraction either stops or repeats, because there are only a limited number of remainders to choose from. For more on fractions, see the [fraction calculator](/fraction-calculator).'
				]
			},
			{
				heading: 'Tips for long division',
				paragraphs: [
					'Practice with small numbers first, then move on to bigger ones. Most mistakes come from a wrong multiplication or a wrong subtraction, so check each row.'
				],
				list: [
					'Keep the digits in their columns when you write the steps by hand.',
					'If the remainder is bigger than the divisor, the last step needs another group.',
					'Dividing by 10 moves the decimal point one place to the left, which is a quick check.',
					'To round a decimal answer, use the [rounding calculator](/rounding-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Quotient and remainder',
				expression: 'dividend = divisor × quotient + remainder, with 0 ≤ remainder < divisor',
				variables: [
					{ symbol: 'dividend', meaning: 'the number being divided' },
					{ symbol: 'divisor', meaning: 'the number you divide by' },
					{ symbol: 'quotient', meaning: 'whole groups of the divisor that fit' },
					{ symbol: 'remainder', meaning: 'what is left over' }
				]
			},
			{
				title: 'Each long division step',
				expression: 'partial = previous remainder × 10 + next digit, quotient digit = ⌊partial ÷ divisor⌋, new remainder = partial − divisor × quotient digit',
				variables: []
			},
			{
				title: 'Decimal digits',
				expression: 'next digit = ⌊10 × remainder ÷ divisor⌋, new remainder = 10 × remainder mod divisor',
				variables: [{ symbol: 'remainder', meaning: 'the remainder from the previous digit' }]
			}
		],
		example: {
			title: 'Divide 1,234 by 7',
			steps: [
				'Bring down the 1. 1 is smaller than 7, so the first quotient digit is 0.',
				'Bring down the 2. 12 ÷ 7 = 1 remainder 5. Write 1 in the quotient.',
				'Bring down the 3. 53 ÷ 7 = 7 remainder 4. Write 7 in the quotient.',
				'Bring down the 4. 44 ÷ 7 = 6 remainder 2. Write 6 in the quotient.',
				'The quotient is 176 with a remainder of 2. As a decimal, 2 ÷ 7 = 0.285714 repeating, so the answer is 176.(285714).'
			],
			result: '1,234 ÷ 7 = 176 R 2, or 176.(285714) as a repeating decimal.'
		},
		faq: [
			{
				q: 'What is a remainder?',
				a: 'The remainder is what is left after you take out as many whole groups of the divisor as you can. For 17 ÷ 5, five fits three times with 2 left over, so the remainder is 2.'
			},
			{
				q: 'How are repeating decimals written?',
				a: 'Digits that repeat forever are put in brackets. 1 ÷ 6 = 0.1666…, which is written 0.1(6). When a remainder returns to a value already seen, the digits from that point repeat.'
			},
			{
				q: 'Why does the table include a row with a 0 digit?',
				a: 'A digit too small to hold a whole group of the divisor gives a quotient digit of 0. The row is kept so every digit of the dividend is shown.'
			},
			{
				q: 'Can I divide decimal numbers here?',
				a: 'Not directly. Multiply both numbers by the same power of 10 until they are whole numbers. For 12.5 ÷ 5, use 125 ÷ 50, which gives 2.5.'
			},
			{
				q: 'What is the difference between the dividend and the divisor?',
				a: 'The dividend is the number being split up, and the divisor is the number you split it by. In 20 ÷ 4, the dividend is 20 and the divisor is 4. The result is 5, which is the quotient.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Long division', url: 'https://en.wikipedia.org/wiki/Long_division' },
			{ title: 'Wikipedia — Repeating decimal', url: 'https://en.wikipedia.org/wiki/Repeating_decimal' }
		]
	}
});
