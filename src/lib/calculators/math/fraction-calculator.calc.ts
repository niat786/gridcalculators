import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './fraction-calculator.meta';

interface Frac {
	n: number;
	d: number;
}

const LABEL = 'Simplified fraction';
const SYMBOL: Record<string, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

export function gcd(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) {
		const t = x % y;
		x = y;
		y = t;
	}
	return x;
}

/** Keep the sign on the top number and the denominator positive. */
function normalize(f: Frac): Frac {
	return f.d < 0 ? { n: -f.n, d: -f.d } : f;
}

function simplify(f: Frac): Frac {
	const s = normalize(f);
	const g = gcd(s.n, s.d) || 1;
	return { n: s.n / g || 0, d: s.d / g };
}

/** "5/6", or "3" when the denominator is 1. */
function fracText(f: Frac): string {
	const s = normalize(f);
	return s.d === 1 ? String(s.n) : `${s.n}/${s.d}`;
}

/** "1 3/4", "5/6" or "-1/4". Expects a simplified fraction. */
function mixedText(f: Frac): string {
	const s = simplify(f);
	if (s.d === 1) return String(s.n);
	const whole = Math.trunc(s.n / s.d);
	const rest = Math.abs(s.n % s.d);
	if (whole === 0) return `${s.n < 0 ? '-' : ''}${rest}/${s.d}`;
	return `${whole} ${rest}/${s.d}`;
}

const decimal = (f: Frac) => num(f.n / f.d || 0, 6);

/** Whole part plus numerator over denominator, written as one fraction. */
function improper(w: number, n: number, d: number): Frac {
	return normalize({ n: w * d + n, d });
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'whole1',
			label: 'First whole number',
			type: 'number',
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
			decimal: false,
			help: 'Use 0 for a plain fraction.'
		},
		{ id: 'num1', label: 'First numerator', type: 'number', default: 1, min: -10000, max: 10000, step: 1, decimal: false, width: 'half' },
		{ id: 'den1', label: 'First denominator', type: 'number', default: 2, min: -10000, max: 10000, step: 1, decimal: false, width: 'half' },
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
			]
		},
		{
			id: 'whole2',
			label: 'Second whole number',
			type: 'number',
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
			decimal: false,
			help: 'Use 0 for a plain fraction.'
		},
		{ id: 'num2', label: 'Second numerator', type: 'number', default: 1, min: -10000, max: 10000, step: 1, decimal: false, width: 'half' },
		{ id: 'den2', label: 'Second denominator', type: 'number', default: 3, min: -10000, max: 10000, step: 1, decimal: false, width: 'half' }
	],
	calculate(v: InputValues): CalculationResult {
		const [w1, n1, d1, w2, n2, d2] = [v.whole1, v.num1, v.den1, v.whole2, v.num2, v.den2].map(Number);
		const op = String(v.op);

		if (![w1, n1, d1, w2, n2, d2].every(Number.isInteger)) {
			return {
				primaryResult: DASH,
				primaryLabel: LABEL,
				summary: 'Use whole numbers only for the whole part, numerator and denominator.'
			};
		}
		if (d1 === 0 || d2 === 0) return { primaryResult: DASH, primaryLabel: LABEL, summary: 'A denominator can’t be zero.' };
		if (!['add', 'sub', 'mul', 'div'].includes(op)) return { primaryResult: DASH, primaryLabel: LABEL, summary: 'Pick an operation.' };

		const a = improper(w1, n1, d1);
		const b = improper(w2, n2, d2);
		const steps: string[] = [];
		if (w1 !== 0) steps.push(`${w1} ${n1}/${d1} = ${fracText(a)}.`);
		if (w2 !== 0) steps.push(`${w2} ${n2}/${d2} = ${fracText(b)}.`);

		let raw: Frac;
		if (op === 'add' || op === 'sub') {
			const sign = op === 'add' ? 1 : -1;
			const L = (a.d / gcd(a.d, b.d)) * b.d;
			const na = a.n * (L / a.d);
			const nb = b.n * (L / b.d);
			const total = na + sign * nb;
			raw = { n: total, d: L };
			steps.push(`Common denominator ${L}: ${fracText(a)} = ${na}/${L} and ${fracText(b)} = ${nb}/${L}.`);
			steps.push(`Then ${na} ${SYMBOL[op]} ${nb < 0 ? `(${nb})` : nb} = ${total}, so the result is ${total}/${L}.`);
		} else if (op === 'mul') {
			raw = { n: a.n * b.n, d: a.d * b.d };
			steps.push(`Multiply the tops and the bottoms: ${fracText(a)} × ${fracText(b)} = ${fracText(raw)}.`);
		} else {
			if (b.n === 0) {
				return {
					primaryResult: DASH,
					primaryLabel: LABEL,
					summary: 'You can’t divide by zero. The second fraction’s top number must not be 0.'
				};
			}
			const reciprocal: Frac = { n: b.d, d: b.n };
			raw = { n: a.n * b.d, d: a.d * b.n };
			steps.push(
				`Dividing by a fraction means multiplying by its reciprocal: ${fracText(a)} × ${fracText(reciprocal)} = ${fracText(raw)}.`
			);
		}

		const result = simplify(raw);
		const shown = fracText(result);
		if (fracText(raw) !== shown) steps.push(`Simplified: ${fracText(raw)} = ${shown}.`);

		return {
			primaryResult: shown,
			primaryLabel: LABEL,
			summary: steps.join(' '),
			secondaryMetrics: [
				{ label: 'Mixed number', value: mixedText(result) },
				{ label: 'Decimal', value: decimal(result) },
				{ label: 'Before simplifying', value: fracText(raw) }
			]
		};
	},
	content: {
		intro:
			'Add, subtract, multiply or divide two fractions or mixed numbers. You get a simplified fraction, a mixed number and a decimal, with each step shown so you can follow the working.',
		howTo: [
			'Enter the whole number part of each fraction. Use 0 if there is none.',
			'Enter the numerator (top) and denominator (bottom) of each fraction. The denominator can’t be 0.',
			'Pick an operation. The answer and the working update as you type.',
			'Read the simplified fraction first. Then check the mixed number and decimal to see if they make sense.'
		],
		about: [
			{
				heading: 'What is a fraction?',
				paragraphs: [
					'A fraction shows part of a whole. The top number, the numerator, counts the parts you have. The bottom number, the denominator, shows how many equal parts the whole is split into.',
					'So 3/4 means three of four equal parts. If you eat three quarters of a pizza, you have three slices from a pizza cut into four. The denominator can never be zero, because you can’t split something into zero parts.',
					'A mixed number combines a whole number and a fraction. For example, 1 3/4 means one whole plus three quarters. A fraction whose top is bigger than its bottom, such as 7/4, is called an improper fraction. Both mean the same amount.'
				]
			},
			{
				heading: 'How to add and subtract fractions',
				paragraphs: [
					'You can only add or subtract pieces of the same size. So first, find a common denominator. This is a number that both denominators divide into evenly. The smallest one is the easiest to use.',
					'Take 3/4 − 1/6 as an example. The number 12 works for both denominators, so 3/4 = 9/12 and 1/6 = 2/12. Then 9/12 − 2/12 = 7/12.',
					'Keep the bottom number the same when you add or subtract. The tops change, because you are counting pieces of one size. The [LCM calculator](/lcm-calculator) can find a common denominator for you.'
				]
			},
			{
				heading: 'How to multiply and divide fractions',
				paragraphs: [
					'To multiply, multiply the tops together and the bottoms together. For example, 2/3 × 3/4 = 6/12, which simplifies to 1/2.',
					'To divide, flip the second fraction and multiply. The flipped fraction is called the reciprocal. So 3/4 ÷ 1/2 becomes 3/4 × 2/1 = 6/4, which is 3/2, or 1 1/2.',
					'Why flip? Ask how many halves fit into 3/4. Each whole holds two halves, so 3/4 of a whole holds 1.5 halves. Multiplying by 2 gives the same answer.'
				]
			},
			{
				heading: 'Mixed numbers and simplifying',
				paragraphs: [
					'To add mixed numbers, first change each one to an improper fraction. For example, 1 1/2 is 3/2, and 2 1/4 is 9/4. Then 3/2 + 9/4 = 6/4 + 9/4 = 15/4, which is 3 3/4.',
					'To simplify a fraction, divide the top and bottom by the same number. Use the greatest common divisor, the largest number that goes into both. For example, 6/8 divided by 2 gives 3/4. The [GCF calculator](/gcf-calculator) finds this for you.',
					'Simplifying doesn’t change the value. 6/8, 3/4 and 0.75 all name the same amount.'
				],
				table: {
					caption: 'Simplifying fractions',
					columns: ['Fraction', 'Simplified', 'Decimal'],
					rows: [
						['6/8', '3/4', '0.75'],
						['5/10', '1/2', '0.5'],
						['9/12', '3/4', '0.75'],
						['2/6', '1/3', '0.333333']
					]
				}
			},
			{
				heading: 'Tips for working with fractions',
				paragraphs: [
					'Most mistakes come from adding the bottoms by accident, or forgetting to simplify. Check these points before you move on.'
				],
				list: [
					'Never add the bottoms of two fractions. 1/2 + 1/3 is 5/6, not 2/5.',
					'Simplify at the end, or at the start if the numbers are large.',
					'To turn a fraction into a decimal, divide the top by the bottom. For example, 3 ÷ 4 = 0.75.',
					'For percentages of fractions, use the [percentage calculator](/percentage-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Add or subtract',
				expression: 'a/b ± c/d = (a × (L ÷ b) ± c × (L ÷ d)) ÷ L',
				variables: [{ symbol: 'L', meaning: 'the common denominator: the smallest number that both b and d divide into' }]
			},
			{
				title: 'Multiply',
				expression: 'a/b × c/d = (a × c) ÷ (b × d)',
				variables: [
					{ symbol: 'a, c', meaning: 'the numerators (tops)' },
					{ symbol: 'b, d', meaning: 'the denominators (bottoms)' }
				]
			},
			{
				title: 'Divide',
				expression: 'a/b ÷ c/d = a/b × d/c = (a × d) ÷ (b × c)',
				variables: [{ symbol: 'd/c', meaning: 'the reciprocal of c/d: swap its top and bottom' }]
			},
			{
				title: 'Mixed number to fraction',
				expression: 'W n/d = (W × d + n) ÷ d',
				variables: [
					{ symbol: 'W', meaning: 'the whole number part' },
					{ symbol: 'n/d', meaning: 'the fraction part' }
				]
			}
		],
		example: {
			title: 'Add 1/2 and 1/3',
			steps: [
				'Common denominator: the smallest number that 2 and 3 both divide into is 6.',
				'1/2 = 3/6 and 1/3 = 2/6',
				'3/6 + 2/6 = 5/6',
				'5/6 cannot be reduced, so it is already simplified.'
			],
			result: '1/2 + 1/3 = 5/6, which is 0.833333 as a decimal.'
		},
		faq: [
			{
				q: 'How do I simplify a fraction?',
				a: 'Divide the top and bottom by their greatest common divisor, the largest whole number that divides both. For example, 6/8 has a greatest common divisor of 2, so it simplifies to 3/4.'
			},
			{
				q: 'How do I add fractions with different denominators?',
				a: 'Rewrite each fraction over a common denominator, then add the tops and keep the bottom. The least common denominator keeps the numbers small. For 1/2 + 1/3, the common denominator is 6, giving 5/6.'
			},
			{
				q: 'How do I divide fractions?',
				a: 'Multiply the first fraction by the reciprocal of the second, which means swapping the top and bottom of the second. So 1/2 ÷ 1/4 becomes 1/2 × 4/1 = 2.'
			},
			{
				q: 'Why can’t a denominator be zero?',
				a: 'Splitting something into zero parts makes no sense, so a denominator of zero is not allowed. A top number of zero is fine, as in 0/5, which equals 0. But you can’t divide by a fraction whose top number is zero.'
			},
			{
				q: 'How do I turn a fraction into a decimal?',
				a: 'Divide the top number by the bottom number. For example, 3/4 is 3 ÷ 4 = 0.75. Some fractions, such as 1/3, give a decimal that repeats, so the calculator rounds it.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Fraction', url: 'https://en.wikipedia.org/wiki/Fraction' },
			{ title: 'Wikipedia — Greatest common divisor', url: 'https://en.wikipedia.org/wiki/Greatest_common_divisor' }
		]
	}
});
