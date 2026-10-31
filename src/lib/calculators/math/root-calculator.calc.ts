import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './root-calculator.meta';

/** Number with a true minus sign (−) for negatives, for display. */
const sgn = (x: number) => (x < 0 ? '−' : '') + num(Math.abs(x), 6);

/** 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th", 21 → "21st". */
function ordinal(n: number): string {
	const suffixes = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? 'th');
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'x', label: 'Number', type: 'number', default: 16, help: 'The number to take the root of. Negative numbers work with odd roots.' },
		{
			id: 'n',
			label: 'Root degree',
			type: 'number',
			default: 2,
			min: 2,
			max: 100,
			decimal: false,
			help: '2 for a square root, 3 for a cube root, and so on.'
		}
	],
	calculate(v): CalculationResult {
		const x = Number(v.x);
		const n = Number(v.n);
		if (!Number.isFinite(x)) return { primaryResult: DASH, primaryLabel: 'Root', summary: 'Enter a number.' };
		if (!Number.isInteger(n) || n < 2) {
			return { primaryResult: DASH, primaryLabel: 'Root', summary: 'The root degree must be a whole number, 2 or more.' };
		}
		if (x < 0 && n % 2 === 0) {
			return {
				primaryResult: DASH,
				primaryLabel: `${ordinal(n)} root`,
				summary: `A negative number has no real root of even degree. Try an odd degree, such as 3.`,
				secondaryMetrics: [
					{ label: 'Square root', value: 'Not real' },
					{ label: 'Cube root', value: sgn(Math.cbrt(x)) },
					{ label: 'Check (root to the power n)', value: DASH }
				]
			};
		}

		const r = x < 0 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n);
		const label = n === 2 ? 'Square root' : n === 3 ? 'Cube root' : `${ordinal(n)} root`;
		return {
			primaryResult: sgn(r + 0),
			primaryLabel: label,
			summary: `The ${ordinal(n)} root of ${sgn(x)} is ${sgn(r + 0)}, because ${sgn(r + 0)}^${n} = ${sgn(Math.pow(r, n) + 0)}.`,
			secondaryMetrics: [
				{ label: 'Square root', value: x < 0 ? 'Not real' : sgn(Math.sqrt(x)) },
				{ label: 'Cube root', value: sgn(Math.cbrt(x) + 0) },
				{ label: 'Check (root to the power n)', value: sgn(Math.pow(r, n) + 0) }
			]
		};
	},
	content: {
		intro:
			'Find the root of a number: the square root, the cube root, or any root of a degree you choose. The square and cube roots are always shown too, so you can compare them.',
		howTo: [
			'Enter the number you want the root of.',
			'Enter the root degree. Use 2 for a square root, 3 for a cube root, and so on.',
			'Read the root, then check it. The root raised to the degree gives back your number.'
		],
		about: [
			{
				heading: 'What a root means',
				paragraphs: [
					'A root asks, “what number, multiplied by itself a set number of times, gives this?” The square root of 16 is 4, because 4 × 4 = 16. The cube root of 27 is 3, because 3 × 3 × 3 = 27.',
					'A root undoes a power. If 4 squared is 16, then the square root of 16 gets you back to 4. You can check any root by raising it to the same power, and the [exponent calculator](/exponent-calculator) does that step.',
					'The small symbol in the root is the degree. In the cube root symbol ∛, the 3 is shown. A square root has degree 2, and the 2 is usually left out of the symbol.'
				]
			},
			{
				heading: 'Square roots',
				paragraphs: [
					'A perfect square is a whole number that is the square of another whole number. Their square roots are whole numbers. The first few are 1, 4, 9, 16, 25, 36, 49, 64, 81 and 100.',
					'Most numbers are not perfect squares, so their square roots have decimals that never end. For example, √2 is about 1.414214, and √10 is about 3.162278, to six decimal places.',
					'You can estimate a square root. The square root of 50 must be between 7 and 8, because 49 is 7 squared and 64 is 8 squared. The answer, about 7.07, is much closer to 7 than to 8.'
				]
			},
			{
				heading: 'Cube roots and other degrees',
				paragraphs: [
					'The cube root uses degree 3. Cube roots work for negative numbers too. The cube root of −8 is −2, because (−2) × (−2) × (−2) = −8.',
					'For other degrees, the same idea applies. The fourth root of 81 is 3, because 3 × 3 × 3 × 3 = 81. The cube root of 16 is about 2.519842. It doesn’t come out to a whole number, so the calculator rounds it.',
					'Any root can also be written as a power. The n-th root of x is x to the power of 1 ÷ n. The [scientific calculator](/scientific-calculator) has a √ key for square roots, and you can type any other root as a power.'
				]
			},
			{
				heading: 'Why negative numbers have no square root',
				paragraphs: [
					'Any real number multiplied by itself gives zero or a positive number. For example, 3 × 3 = 9, and (−3) × (−3) = 9 too. So no real number squared gives −9.',
					'This is why the calculator shows “Not real” for the square root of a negative number. An even root of a negative number is not a real number, but an odd root is. Try a degree of 3 to find a real root of −27.'
				]
			},
			{
				heading: 'Roots in everyday life',
				paragraphs: [
					'The square root is useful when you know an area and need a side length. A square room with an area of 49 square metres has sides of √49 = 7 metres. The same idea helps with a square garden or floor.',
					'Square roots also appear in the Pythagorean theorem, which finds the longest side of a right-angled triangle. For that, use the [Pythagorean theorem calculator](/pythagorean-theorem-calculator).',
					'If your answer is a decimal, use the [rounding calculator](/rounding-calculator) to round it to a useful number of places.'
				]
			}
		],
		formulas: [
			{
				title: 'Nth root',
				expression: 'ⁿ√x = x^(1/n)',
				variables: [
					{ symbol: 'x', meaning: 'the number' },
					{ symbol: 'n', meaning: 'the root degree, 2 or more' }
				]
			},
			{ title: 'Square root', expression: '√x = x^(1/2)', variables: [] },
			{ title: 'Cube root', expression: '∛x = x^(1/3)', variables: [] },
			{
				title: 'Check',
				expression: '(ⁿ√x)ⁿ = x',
				variables: []
			}
		],
		example: {
			title: 'The fourth root of 81',
			steps: ['Find r where r⁴ = 81', '81^(1/4) = 3', 'Check: 3⁴ = 3 × 3 × 3 × 3 = 81'],
			result: 'The fourth root of 81 is 3.'
		},
		faq: [
			{
				q: 'Can you take the square root of a negative number?',
				a: 'Not with a real number. Multiplying any real number by itself gives zero or a positive result, so a negative number has no real square root. Its square root is an imaginary number, which this calculator does not show.'
			},
			{
				q: 'Why does a cube root of a negative number work?',
				a: 'Multiplying three negative numbers gives a negative result, so the cube root of −27 is −3. Any odd root of a negative number is a real number.'
			},
			{
				q: 'Why does the cube root of 16 show as 2.519842?',
				a: 'Most roots are decimals that never end. The calculator rounds the answer to six decimal places. When you check it by raising to the power of 3, you get very close to 16.'
			},
			{
				q: 'How do I find a root without a calculator?',
				a: 'Find the two whole-number roots it sits between. For the square root of 50, 49 is 7 squared and 64 is 8 squared, so the answer is between 7 and 8. Then try decimals to get closer.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Square root', url: 'https://en.wikipedia.org/wiki/Square_root' },
			{ title: 'Wikipedia — Nth root', url: 'https://en.wikipedia.org/wiki/Nth_root' }
		]
	}
});
