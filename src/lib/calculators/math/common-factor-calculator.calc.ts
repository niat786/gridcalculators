import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './common-factor-calculator.meta';

const MAX = 1e12;

/** Euclid's algorithm. Exact for whole numbers up to 1e12, far below the 2^53 limit. */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Every divisor of g, ascending. Trial division up to √g, so at most 10⁶ steps for g ≤ 1e12. */
function divisors(g: number): number[] {
	const low: number[] = [];
	const high: number[] = [];
	for (let i = 1; i * i <= g; i++) {
		if (g % i === 0) {
			low.push(i);
			if (i !== g / i) high.push(g / i);
		}
	}
	return low.concat(high.reverse());
}

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Common factors', summary });

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'values',
			label: 'Whole numbers',
			type: 'list',
			default: '24, 36, 60',
			minCount: 2,
			maxCount: 10,
			placeholder: 'e.g. 24, 36, 60',
			help: 'Two to ten positive whole numbers, each up to 1,000,000,000,000.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		if (xs.length < 2 || xs.length > 10) return fail('Enter from 2 to 10 numbers.');
		if (xs.some((x) => !Number.isInteger(x) || x < 1 || x > MAX)) {
			return fail('Use whole numbers from 1 to 1,000,000,000,000. Decimals and negative numbers are not allowed.');
		}

		const g = xs.reduce((acc, x) => gcd(acc, x));
		const factors = divisors(g);
		const count = factors.length;

		return {
			primaryResult: factors.join(', '),
			primaryLabel: 'Common factors',
			long: true,
			summary: `The greatest common factor is ${num(g, 0)}, so these ${num(count, 0)} numbers divide every number you entered.`,
			secondaryMetrics: [
				{ label: 'Greatest common factor', value: num(g, 0) },
				{ label: 'Number of common factors', value: num(count, 0) },
				{ label: 'Numbers entered', value: num(xs.length, 0) }
			]
		};
	},
	content: {
		intro:
			'Find every whole number that divides evenly into all of your numbers. Enter two to ten whole numbers to get the full list of common factors, the greatest common factor and how many there are.',
		howTo: [
			'Enter two to ten positive whole numbers, separated by commas or spaces.',
			'Read the list of common factors. The greatest common factor is shown beside it.',
			'Use the count to see how many shared divisors your numbers have.'
		],
		about: [
			{
				heading: 'What is a common factor?',
				paragraphs: [
					'A common factor is a number that divides two or more numbers with no remainder. Take 24 and 36. The factors of 24 are 1, 2, 3, 4, 6, 8, 12 and 24. The factors of 36 are 1, 2, 3, 4, 6, 9, 12, 18 and 36.',
					'The numbers that appear in both lists are the common factors. Here they are 1, 2, 3, 4, 6 and 12. The biggest of these is 12, which is the greatest common factor.',
					'Every list of common factors starts with 1, because 1 divides every whole number. If the numbers share no other factor, the list has just that one item.'
				],
				table: {
					caption: 'Common factors of 24 and 36',
					columns: ['Number', 'Factors', 'In both lists'],
					rows: [
						['24', '1, 2, 3, 4, 6, 8, 12, 24', '1, 2, 3, 4, 6, 12'],
						['36', '1, 2, 3, 4, 6, 9, 12, 18, 36', 'Greatest: 12']
					]
				}
			},
			{
				heading: 'How the calculator finds them',
				paragraphs: [
					'The calculator uses a shortcut. It first finds the greatest common factor (GCF) with Euclid’s method. Then it lists the divisors of that GCF.',
					'This works because the common factors are exactly the divisors of the GCF. Any number that divides all your numbers must also divide the GCF, and any divisor of the GCF divides every number too.',
					'For 24, 36 and 60, the GCF is 12. The divisors of 12 are 1, 2, 3, 4, 6 and 12. So those six numbers are the common factors of all three.'
				]
			},
			{
				heading: 'Common factors and common multiples',
				paragraphs: [
					'A common factor divides into each number in the list. A common multiple is a number that each number in the list divides into. These two ideas are easy to mix up.',
					'For 4 and 6, the common factors are 1 and 2. The common multiples are 12, 24, 36 and so on. The smallest common multiple is the least common multiple, which here is 12. The [LCM calculator](/lcm-calculator) finds it for any list.'
				]
			},
			{
				heading: 'Using common factors to share',
				paragraphs: [
					'Common factors are useful when you need to share items into identical groups. Suppose a teacher has 24 pencils and 36 erasers, and wants identical packs with nothing left over.',
					'The common factors of 24 and 36 tell her the possible numbers of packs. The largest is 12. Each pack then holds 2 pencils and 3 erasers, since 24 ÷ 12 = 2 and 36 ÷ 12 = 3.',
					'For a single number’s full list of factors, the [factor calculator](/factor-calculator) shows each one, with its pair.'
				]
			},
			{
				heading: 'Tips for common factors',
				paragraphs: [
					'Start with the greatest common factor. Once you have it, the rest of the list is just its divisors. This saves a lot of work, especially with three or more numbers.'
				],
				list: [
					'Use the [GCF calculator](/gcf-calculator) if you only need the biggest common factor.',
					'Two numbers with a common factor of 1 are called coprime, such as 8 and 15.',
					'Check your list by dividing each original number by one of the factors. You should get a whole number every time.'
				]
			}
		],
		formulas: [
			{
				title: 'Greatest common factor',
				expression: 'GCF(a, b, …) is found by the Euclidean algorithm: gcd(a, b) = gcd(b, a mod b), until the remainder is 0.',
				variables: [{ symbol: 'mod', meaning: 'the remainder after division' }]
			},
			{
				title: 'Common factors',
				expression: 'The common factors are exactly the divisors of the GCF.',
				variables: [{ symbol: 'd', meaning: 'a number that divides the GCF with no remainder' }]
			}
		],
		example: {
			title: 'Common factors of 24, 36 and 60',
			steps: [
				'Greatest common factor of 24 and 36 is 12. Then gcd(12, 60) = 12',
				'Divisors of 12 are 1, 2, 3, 4, 6 and 12',
				'Each of these divides 24, 36 and 60 with no remainder'
			],
			result: 'The common factors are 1, 2, 3, 4, 6 and 12. The greatest is 12, and there are 6 of them.'
		},
		faq: [
			{
				q: 'What is the difference between a common factor and a common multiple?',
				a: 'A common factor divides into every number in the set. A common multiple is a number that every number in the set divides into.'
			},
			{
				q: 'Why is 1 always a common factor?',
				a: 'Every whole number is divisible by 1, so 1 is always on the list.'
			},
			{
				q: 'What if my numbers have no common factor other than 1?',
				a: 'Then the greatest common factor is 1, and 1 is the only common factor. Numbers like this are called coprime.'
			},
			{
				q: 'How many common factors can two numbers have?',
				a: 'As many as the GCF has divisors. For 24 and 36, the GCF is 12, which has six divisors, so there are six common factors.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Divisor', url: 'https://en.wikipedia.org/wiki/Divisor' },
			{ title: 'Wikipedia — Greatest common divisor', url: 'https://en.wikipedia.org/wiki/Greatest_common_divisor' }
		]
	}
});
