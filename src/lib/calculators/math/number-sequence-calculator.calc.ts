import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './number-sequence-calculator.meta';

const MAX_TERM = 1000;
const FIRST_TERMS = 10;

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Sequence', summary });

/** Decimal number for display. Very large or small values switch to scientific notation. */
function fmt(x: number): string {
	if (!Number.isFinite(x)) return DASH;
	if (Math.abs(x) >= 1e15) return x.toExponential(6).replace(/e\+?(-?\d+)/, ' × 10^$1');
	return num(x, 6);
}

/** Groups the digits of a whole number in threes, e.g. 12586269025 → 12,586,269,025. */
const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Fibonacci numbers with F₁ = 1 and F₂ = 1, exact with BigInt. Returns [F(n − 1), F(n)]. */
function fibPair(n: number): [bigint, bigint] {
	let prev = 0n;
	let cur = 1n;
	for (let i = 1; i < n; i++) [prev, cur] = [cur, prev + cur];
	return [prev, cur];
}

function firstTermsTable(label: string, terms: string[]): Table {
	return {
		title: label,
		columns: [
			{ key: 'term', label: 'Term' },
			{ key: 'value', label: 'Value', align: 'end' }
		],
		rows: terms.map((value, i) => ({ term: num(i + 1, 0), value }))
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Sequence type',
			type: 'select',
			display: 'segmented',
			default: 'arithmetic',
			options: [
				{ label: 'Arithmetic', value: 'arithmetic' },
				{ label: 'Geometric', value: 'geometric' },
				{ label: 'Fibonacci', value: 'fibonacci' }
			]
		},
		{
			id: 'a1',
			label: 'First term (a₁)',
			type: 'number',
			default: 2,
			visibleWhen: (v: InputValues) => v.mode !== 'fibonacci'
		},
		{
			id: 'd',
			label: 'Common difference (d)',
			type: 'number',
			default: 3,
			help: 'Added to each term to get the next one.',
			visibleWhen: (v: InputValues) => v.mode === 'arithmetic'
		},
		{
			id: 'r',
			label: 'Common ratio (r)',
			type: 'number',
			default: 0.5,
			help: 'Each term is the previous term times r.',
			visibleWhen: (v: InputValues) => v.mode === 'geometric'
		},
		{
			id: 'n',
			label: 'Term number (n)',
			type: 'number',
			default: 10,
			min: 1,
			max: MAX_TERM,
			decimal: false,
			help: 'Whole number from 1 to 1,000.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const mode = String(v.mode);
		const n = Number(v.n);
		if (!Number.isInteger(n) || n < 1 || n > MAX_TERM) return fail('Enter a whole term number from 1 to 1,000.');

		if (mode === 'fibonacci') {
			const [prev, cur] = fibPair(n);
			const digits = cur.toString().length;
			const terms: string[] = [];
			let [a, b] = [0n, 1n];
			for (let i = 1; i <= FIRST_TERMS; i++) {
				terms.push(group(b.toString()));
				[a, b] = [b, a + b];
			}
			const ratio = n >= 2 ? fmt(Number(cur) / Number(prev)) : DASH;
			return {
				primaryResult: group(cur.toString()),
				primaryLabel: `Fibonacci number F(${num(n, 0)})`,
				long: digits > 15,
				summary: `F(n) = F(n − 1) + F(n − 2), with F₁ = 1 and F₂ = 1. This number has ${num(digits, 0)} digits.`,
				secondaryMetrics: [
					{ label: 'Digits in the number', value: num(digits, 0) },
					{ label: 'Previous term F(n − 1)', value: group(prev.toString()) },
					{ label: 'Ratio F(n) ÷ F(n − 1)', value: ratio }
				],
				table: firstTermsTable('First 10 terms', terms)
			};
		}

		const a1 = Number(v.a1);
		if (!Number.isFinite(a1)) return fail('Enter a first term.');

		if (mode === 'arithmetic') {
			const d = Number(v.d);
			if (!Number.isFinite(d)) return fail('Enter a common difference.');
			const nth = a1 + (n - 1) * d;
			const sum = (n * (2 * a1 + (n - 1) * d)) / 2;
			const next = nth + d;
			const terms = Array.from({ length: FIRST_TERMS }, (_, i) => fmt(a1 + i * d));
			return {
				primaryResult: fmt(nth),
				primaryLabel: `Term ${num(n, 0)} of the arithmetic sequence`,
				summary: `aₙ = a₁ + (n − 1) × d = ${fmt(a1)} + ${num(n - 1, 0)} × ${fmt(d)} = ${fmt(nth)}.`,
				secondaryMetrics: [
					{ label: 'Sum of the first n terms', value: fmt(sum) },
					{ label: 'Next term (n + 1)', value: fmt(next) },
					{ label: 'Common difference (d)', value: fmt(d) }
				],
				table: firstTermsTable('First 10 terms', terms)
			};
		}

		if (mode === 'geometric') {
			const r = Number(v.r);
			if (!Number.isFinite(r)) return fail('Enter a common ratio.');
			const nth = a1 * Math.pow(r, n - 1);
			const sum = r === 1 ? n * a1 : (a1 * (1 - Math.pow(r, n))) / (1 - r);
			const next = a1 * Math.pow(r, n);
			if (![nth, sum, next].every((x) => Number.isFinite(x))) {
				return fail('Those numbers are too large to calculate. Try a smaller term number or ratio.');
			}
			const infinite =
				Math.abs(r) < 1 ? fmt(a1 / (1 - r)) : a1 === 0 ? '0' : 'Not defined, because |r| is 1 or more';
			const terms = Array.from({ length: FIRST_TERMS }, (_, i) => fmt(a1 * Math.pow(r, i)));
			return {
				primaryResult: fmt(nth),
				primaryLabel: `Term ${num(n, 0)} of the geometric sequence`,
				summary: `aₙ = a₁ × rⁿ⁻¹ = ${fmt(a1)} × ${fmt(r)}^${num(n - 1, 0)} = ${fmt(nth)}.`,
				secondaryMetrics: [
					{ label: 'Sum of the first n terms', value: fmt(sum) },
					{ label: 'Infinite sum', value: infinite },
					{ label: 'Next term (n + 1)', value: fmt(next) }
				],
				table: firstTermsTable('First 10 terms', terms)
			};
		}

		return fail('Choose arithmetic, geometric or Fibonacci.');
	},
	content: {
		intro:
			'This number sequence calculator finds any term in an arithmetic, geometric or Fibonacci sequence, along with the sum of the terms. Pick the sequence type, enter the first term and the rule, then choose the term number.',
		howTo: [
			'Choose the sequence type: arithmetic, geometric or Fibonacci.',
			'Enter the first term and the rule. For arithmetic, that is the common difference. For geometric, it is the common ratio. Fibonacci needs no rule.',
			'Enter the term number n, a whole number from 1 to 1,000.',
			'Read the term, the sum of the first n terms and the first ten terms in the table.'
		],
		about: [
			{
				heading: 'What is a number sequence?',
				paragraphs: [
					'A number sequence is a list of numbers that follows a rule. Each number in the list is called a term. The first term is written a₁, the second a₂, and so on. The term number n tells you its position in the list.',
					'Some sequences add the same amount each time, and others multiply by the same amount. Others, like the Fibonacci sequence, add the two terms before. The rule is what lets you jump straight to a far term without writing out the whole list.',
					'For example, the list 2, 5, 8, 11, 14 adds 3 each time. The fifth term is 14, and the rule predicts that the 100th term is 299.'
				]
			},
			{
				heading: 'Arithmetic and geometric sequences',
				paragraphs: [
					'In an arithmetic sequence, the difference between neighbouring terms stays the same. This difference is the common difference, d. To find term n, start at a₁ and add d a total of n − 1 times.',
					'In a geometric sequence, each term is the previous term times a fixed ratio, r. Growth at a steady percentage each period is geometric. For example, a ratio of 1.05 means 5% growth per step. A ratio between −1 and 1 makes the terms shrink towards zero. To work out a power such as rⁿ, the [exponent calculator](/exponent-calculator) does the arithmetic.',
					'Adding up the terms is also easy with a formula. An arithmetic sum is n ÷ 2 × (2a₁ + (n − 1)d). A story often told about the mathematician Carl Friedrich Gauss says that, as a schoolboy, he added the numbers 1 to 100 this way and got 5,050.'
				],
				table: {
					caption: 'Key formulas for the two common sequence types',
					columns: ['Type', 'Term n', 'Sum of first n terms'],
					rows: [
						['Arithmetic', 'a₁ + (n − 1) × d', 'n ÷ 2 × (2a₁ + (n − 1) × d)'],
						['Geometric', 'a₁ × rⁿ⁻¹', 'a₁ × (1 − rⁿ) ÷ (1 − r), when r ≠ 1']
					]
				}
			},
			{
				heading: 'The Fibonacci sequence',
				paragraphs: [
					'The Fibonacci sequence starts with 1 and 1. Each later term is the sum of the two before it, so the list runs 1, 1, 2, 3, 5, 8, 13 and onwards. The sequence is named after Leonardo of Pisa, also called Fibonacci, who wrote about it in his book Liber Abaci in 1202.',
					'The sequence grows quickly. Its tenth term is 55, and its fiftieth term is 12,586,269,025. The ratio of one term to the one before settles near 1.618, which is the golden ratio. You can check this with the calculator’s ratio line.',
					'Fibonacci numbers appear in some plant growth patterns, but they are not a law of nature. Treat them as an interesting pattern, rather than a rule that every natural shape follows.'
				]
			},
			{
				heading: 'Tips for working with sequences',
				paragraphs: ['Sequence problems are simple once you name the parts. These habits prevent most errors:'],
				list: [
					'**Find the first term and the rule.** Write them down before you use the formula.',
					'**Count n − 1 steps, not n.** The first term needs no step, so the term n is reached after n − 1 steps.',
					'**Check the first few terms.** Write out two or three terms by hand to confirm the rule.',
					'**Use the average for a quick sum.** For an arithmetic sequence, the sum equals the number of terms times the average of the first and last terms. The [average calculator](/average-calculator) can help with that step.',
					'**Solve for n with logs.** If you know a geometric term and need n, use the [log calculator](/log-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Arithmetic sequence',
				expression: 'aₙ = a₁ + (n − 1) × d,   Sₙ = n ÷ 2 × (2a₁ + (n − 1) × d)',
				variables: [
					{ symbol: 'a₁', meaning: 'the first term' },
					{ symbol: 'd', meaning: 'the common difference' },
					{ symbol: 'Sₙ', meaning: 'the sum of the first n terms' }
				]
			},
			{
				title: 'Geometric sequence',
				expression: 'aₙ = a₁ × rⁿ⁻¹,   Sₙ = a₁ × (1 − rⁿ) ÷ (1 − r),   infinite sum = a₁ ÷ (1 − r) when |r| < 1',
				variables: [{ symbol: 'r', meaning: 'the common ratio, the number each term is multiplied by' }]
			},
			{
				title: 'Fibonacci sequence',
				expression: 'F(n) = F(n − 1) + F(n − 2), with F(1) = 1 and F(2) = 1',
				variables: [{ symbol: 'F(n)', meaning: 'the nth Fibonacci number' }]
			}
		],
		example: {
			title: 'An arithmetic sequence that starts at 2 and adds 3 each time, for n = 10',
			steps: [
				'Rule: aₙ = 2 + (n − 1) × 3.',
				'Term 10: a₁₀ = 2 + 9 × 3 = 29.',
				'Sum of the first 10 terms: 10 ÷ 2 × (2 × 2 + 9 × 3) = 5 × 31 = 155.'
			],
			result: 'The 10th term is 29, and the first ten terms add up to 155.'
		},
		faq: [
			{
				q: 'How do I find the nth term of a sequence?',
				a: 'For an arithmetic sequence, use a₁ + (n − 1) × d. For a geometric sequence, use a₁ × rⁿ⁻¹. For Fibonacci, add the two terms before n. The calculator applies these rules for you.'
			},
			{
				q: 'What is the difference between arithmetic and geometric?',
				a: 'An arithmetic sequence adds the same amount each time. A geometric sequence multiplies by the same amount each time. For example, 2, 4, 8, 16 is geometric with a ratio of 2.'
			},
			{
				q: 'Why does the geometric infinite sum only work for small ratios?',
				a: 'The terms must shrink for the sum to settle at a finite value. That happens when the ratio is between −1 and 1. Otherwise, the terms grow or stay the same size, so the sum has no limit.'
			},
			{
				q: 'Why does the Fibonacci sequence start with 1, 1?',
				a: 'This is the common convention for the sequence. Some lists start with 0, 1, which shifts every number along by one position. Check which convention a problem uses.'
			},
			{
				q: 'What is the largest term number this calculator accepts?',
				a: 'Term numbers from 1 to 1,000 are accepted. Very large results show in scientific notation, and geometric sequences may show an error if the numbers are too large.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Arithmetic Series', url: 'https://mathworld.wolfram.com/ArithmeticSeries.html' },
			{ title: 'Wolfram MathWorld: Fibonacci Number', url: 'https://mathworld.wolfram.com/FibonacciNumber.html' }
		]
	}
});
