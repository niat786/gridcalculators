import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './lcm-calculator.meta';

const MAX_VALUE = 1e12;
const MAX_COUNT = 20;

/** Euclid's algorithm with BigInt, so the products used by the LCM never overflow. */
function gcdBig(a: bigint, b: bigint): bigint {
	let x = a;
	let y = b;
	while (y !== BigInt(0)) {
		const r = x % y;
		x = y;
		y = r;
	}
	return x;
}

const lcmBig = (a: bigint, b: bigint) => (a / gcdBig(a, b)) * b;
const text = (n: bigint) => n.toLocaleString('en-US');

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'values',
			label: 'Whole numbers',
			type: 'list',
			default: '12, 18, 24',
			minCount: 2,
			maxCount: MAX_COUNT,
			placeholder: 'e.g. 4, 6, 10',
			help: 'Two to twenty whole numbers from 1 to 1,000,000,000,000, separated by commas.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		const label = 'Least common multiple';
		if (xs.length < 2 || xs.length > MAX_COUNT) {
			return { primaryResult: DASH, primaryLabel: label, summary: `Enter between 2 and ${MAX_COUNT} numbers.` };
		}
		if (xs.some((x) => !Number.isInteger(x) || x < 1 || x > MAX_VALUE)) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Use whole numbers from 1 to 1,000,000,000,000 only. Decimals and zero are not allowed.'
			};
		}

		const big = xs.map((x) => BigInt(x));
		let l = big[0];
		const parts: string[] = [];
		for (let i = 1; i < big.length; i++) {
			const g = gcdBig(l, big[i]);
			const next = (l / g) * big[i];
			parts.push(
				big.length === 2
					? `lcm(${text(l)}, ${text(big[i])}) = ${text(l)} × ${text(big[i])} ÷ ${text(g)} = ${text(next)}`
					: `lcm(${text(l)}, ${text(big[i])}) = ${text(next)}`
			);
			l = next;
		}

		const product = big.reduce((p, x) => p * x, BigInt(1));
		const gcfAll = big.reduce((g, x) => gcdBig(g, x));
		const digits = text(l);
		const summary =
			big.length === 2
				? `Use lcm(a, b) = a × b ÷ gcf(a, b): ${parts[0]}.`
				: `Combine the numbers two at a time: ${parts.join(', then ')}.`;

		return {
			primaryResult: digits,
			primaryLabel: label,
			long: digits.length > 18,
			summary,
			secondaryMetrics: [
				{ label: 'Count', value: num(xs.length, 0) },
				{ label: 'Largest number', value: num(Math.max(...xs), 0) },
				{ label: 'Greatest common factor', value: text(gcfAll) },
				{ label: 'Product of all numbers', value: text(product) }
			]
		};
	},
	content: {
		intro:
			'Find the least common multiple (LCM) of two or more whole numbers. It is the smallest positive number that every number in your list divides into evenly.',
		howTo: [
			'Type two to twenty whole numbers, separated by commas or spaces.',
			'Use whole numbers from 1 up to 1,000,000,000,000. Decimals and zero are not accepted.',
			'Read the least common multiple. Very large results are shown in full, so you can copy them exactly.'
		],
		about: [
			{
				heading: 'What is a least common multiple?',
				paragraphs: [
					'A multiple of a number is what you get when you multiply it by a whole number. The multiples of 4 are 4, 8, 12, 16, 20, 24 and so on. The multiples of 6 are 6, 12, 18, 24, 30 and so on.',
					'Some multiples appear in both lists. These are common multiples. The smallest one is the least common multiple. For 4 and 6, that is 12.',
					'The LCM is useful whenever two repeating things need to line up. It tells you when they will happen at the same time again.'
				],
				table: {
					caption: 'Finding the LCM of 4 and 6 by listing multiples',
					columns: ['Number', 'First multiples', 'First shared multiple'],
					rows: [
						['4', '4, 8, 12, 16, 20, 24', '12'],
						['6', '6, 12, 18, 24, 30, 36', '12']
					]
				}
			},
			{
				heading: 'Using the GCF to find the LCM',
				paragraphs: [
					'For two numbers, there is a faster method. Multiply the numbers, then divide by their greatest common factor. This is written lcm(a, b) = a × b ÷ gcf(a, b).',
					'For 4 and 6, the GCF is 2. So 4 × 6 = 24, and 24 ÷ 2 = 12. For 12 and 18, the GCF is 6, so 12 × 18 = 216, and 216 ÷ 6 = 36.',
					'Dividing by the GCF first keeps the numbers smaller. The [GCF calculator](/gcf-calculator) finds that factor for you.'
				]
			},
			{
				heading: 'More than two numbers',
				paragraphs: [
					'For three or more numbers, find the LCM two at a time. Take the LCM of the first two numbers, then find the LCM of that answer and the next number. Keep going until you reach the end of the list.',
					'For 12, 18 and 24, the LCM of 12 and 18 is 36. Then the LCM of 36 and 24 is 72. So the LCM of all three is 72.'
				]
			},
			{
				heading: 'Where the LCM is used',
				paragraphs: [
					'Suppose one bus leaves every 12 minutes, and another leaves every 18 minutes. Both leave at the same time at the start. They leave together again after the LCM of 12 and 18, which is 36 minutes.',
					'The LCM is also used for fractions. To add 1/4 and 1/6, you need a common denominator, and the LCM of 4 and 6 is 12. Then 1/4 = 3/12 and 1/6 = 2/12, which add to 5/12. The [fraction calculator](/fraction-calculator) does this for you.',
					'Clock cycles, repeating patterns and shift timetables all use the same idea.'
				]
			},
			{
				heading: 'When the LCM is very large',
				paragraphs: [
					'If two numbers share no factor except 1, their LCM is simply their product. For example, 8 and 9 have a GCF of 1, so their LCM is 8 × 9 = 72.',
					'That is why a list of big, unrelated numbers can give a very large LCM. Check the list first. If numbers share factors, the LCM is much smaller than the product.',
					'To see the prime building blocks of a number, use the [prime factorization calculator](/prime-factorization-calculator). The LCM takes the highest power of each prime that appears.'
				]
			}
		],
		formulas: [
			{
				title: 'Two numbers',
				expression: 'lcm(a, b) = a × b ÷ gcf(a, b)',
				variables: [
					{ symbol: 'a, b', meaning: 'the two numbers' },
					{ symbol: 'gcf(a, b)', meaning: 'their greatest common factor. Dividing by it first avoids a larger product than needed' }
				]
			},
			{
				title: 'More than two numbers',
				expression: 'lcm(a, b, c) = lcm(lcm(a, b), c)',
				variables: [{ symbol: 'lcm(a, b)', meaning: 'the result of the previous pair, which then pairs with the next number' }]
			}
		],
		example: {
			title: 'LCM of 4 and 6',
			steps: [
				'The greatest common factor of 4 and 6 is 2.',
				'Multiply the numbers: 4 × 6 = 24.',
				'Divide by the GCF: 24 ÷ 2 = 12.',
				'Check: 12 ÷ 4 = 3 and 12 ÷ 6 = 2, both whole numbers.'
			],
			result: 'The least common multiple of 4 and 6 is 12.'
		},
		faq: [
			{
				q: 'How is the LCM used in fractions?',
				a: 'The least common denominator of fractions is the LCM of their denominators. For 1/4 and 1/6, the LCM of 4 and 6 is 12, so you rewrite them as 3/12 and 2/12.'
			},
			{
				q: 'What is the difference between LCM and GCF?',
				a: 'The LCM is the smallest number that all the inputs divide into. The GCF is the largest number that divides all the inputs. The LCM is always at least as large as each input, and the GCF is never larger than the smallest input.'
			},
			{
				q: 'Why is the LCM sometimes very large?',
				a: 'Numbers that share few factors multiply to a large product. The LCM of two coprime numbers equals their product, so a list of big, unrelated numbers gives a very large LCM.'
			},
			{
				q: 'What is the LCM of two equal numbers?',
				a: 'It is the number itself. For example, the LCM of 7 and 7 is 7, because 7 is the smallest positive number that both 7s divide into.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Least common multiple', url: 'https://en.wikipedia.org/wiki/Least_common_multiple' },
			{ title: 'Wikipedia — Multiple (mathematics)', url: 'https://en.wikipedia.org/wiki/Multiple_(mathematics)' }
		]
	}
});
