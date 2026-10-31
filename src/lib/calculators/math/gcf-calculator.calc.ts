import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './gcf-calculator.meta';

const MAX_VALUE = 1e12;
const MAX_COUNT = 20;

/** Euclid's algorithm on whole numbers. */
function gcd(a: number, b: number): number {
	let x = a;
	let y = b;
	while (y !== 0) {
		const r = x % y;
		x = y;
		y = r;
	}
	return x;
}

/** The Euclid steps for two numbers, larger first: "180 = 3 × 48 + 36; …". */
function euclidSteps(a: number, b: number): string[] {
	const steps: string[] = [];
	let x = Math.max(a, b);
	let y = Math.min(a, b);
	while (y !== 0) {
		const q = Math.floor(x / y);
		const r = x % y;
		steps.push(`${num(x, 0)} = ${num(q, 0)} × ${num(y, 0)} + ${num(r, 0)}`);
		x = y;
		y = r;
	}
	return steps;
}

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
			placeholder: 'e.g. 12, 18, 24',
			help: 'Two to twenty whole numbers from 1 to 1,000,000,000,000, separated by commas.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		const label = 'Greatest common factor';
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

		const result = xs.reduce((g, x) => gcd(g, x));
		let summary: string;
		if (xs.length === 2) {
			const [a, b] = [xs[0], xs[1]];
			const steps = euclidSteps(a, b);
			summary = `Euclid’s method: ${steps.join('; ')}. The last nonzero remainder, ${num(result, 0)}, is the greatest common factor.`;
		} else {
			const parts: string[] = [];
			let g = xs[0];
			for (let i = 1; i < xs.length; i++) {
				const next = gcd(g, xs[i]);
				parts.push(`gcf(${num(g, 0)}, ${num(xs[i], 0)}) = ${num(next, 0)}`);
				g = next;
			}
			summary = `Combine the numbers two at a time: ${parts.join(', then ')}.`;
		}

		return {
			primaryResult: num(result, 0),
			primaryLabel: label,
			summary,
			secondaryMetrics: [
				{ label: 'Count', value: num(xs.length, 0) },
				{ label: 'Smallest number', value: num(Math.min(...xs), 0) },
				{ label: 'Largest number', value: num(Math.max(...xs), 0) },
				{ label: 'Relatively prime?', value: result === 1 ? 'Yes' : 'No' }
			]
		};
	},
	content: {
		intro:
			'Find the greatest common factor (GCF) of two or more whole numbers. The GCF is the largest number that divides every number in your list with no remainder.',
		howTo: [
			'Type two to twenty whole numbers, separated by commas or spaces.',
			'Use whole numbers from 1 up to 1,000,000,000,000. Decimals and zero are not accepted.',
			'Read the greatest common factor. For two numbers, the summary shows Euclid’s method step by step.'
		],
		about: [
			{
				heading: 'What is the greatest common factor?',
				paragraphs: [
					'A common factor is a number that divides two or more numbers exactly. The greatest common factor is the biggest of those. It is also called the greatest common divisor (GCD), or the highest common factor (HCF) in some countries.',
					'For example, the factors of 12 are 1, 2, 3, 4, 6 and 12. The factors of 18 are 1, 2, 3, 6, 9 and 18. The shared factors are 1, 2, 3 and 6, so the greatest common factor is 6.',
					'The GCF is never bigger than the smallest number in the list. Every number in the list is a multiple of it. To list every factor of one number, use the [factor calculator](/factor-calculator).'
				],
				table: {
					caption: 'Finding the GCF of 12 and 18 by listing factors',
					columns: ['Number', 'Factors', 'Shared factors'],
					rows: [
						['12', '1, 2, 3, 4, 6, 12', '1, 2, 3, 6'],
						['18', '1, 2, 3, 6, 9, 18', 'Greatest shared: 6']
					]
				}
			},
			{
				heading: 'Euclid’s method for big numbers',
				paragraphs: [
					'Listing factors works for small numbers, but it is slow for big ones. Euclid’s method is faster. Divide the larger number by the smaller, and keep the remainder. Then repeat with the smaller number and the remainder. When the remainder reaches 0, the last nonzero remainder is the GCF.',
					'Take 48 and 180. Since 180 = 3 × 48 + 36, the next step uses 48 and 36. Then 48 = 1 × 36 + 12, so the next step uses 36 and 12. Finally 36 = 3 × 12 + 0. The last nonzero remainder is 12, so the GCF is 12.',
					'The calculator shows these steps for two numbers. It uses the same method for every pair, even with very large inputs.'
				]
			},
			{
				heading: 'More than two numbers',
				paragraphs: [
					'To find the GCF of three or more numbers, combine them two at a time. Find the GCF of the first two, then find the GCF of that answer and the next number. Keep going until the list is used up.',
					'For 12, 18 and 24, the GCF of 12 and 18 is 6. Then the GCF of 6 and 24 is also 6. So the GCF of all three is 6.'
				]
			},
			{
				heading: 'Using the GCF in everyday maths',
				paragraphs: [
					'The GCF is useful when you simplify a fraction. Divide the top and bottom by the GCF. For 18/24, the GCF is 6, so the fraction becomes 3/4. You can check the simplified fraction with the [fraction calculator](/fraction-calculator).',
					'It also helps with sharing. Suppose you have 12 red balls and 18 blue balls, and you want identical gift bags with the same mix in each bag. The most bags you can make is 6, with 2 red and 3 blue in each one.',
					'If you need the opposite, the smallest number that every value divides into, use the [LCM calculator](/lcm-calculator).'
				]
			},
			{
				heading: 'Relatively prime numbers',
				paragraphs: [
					'If the GCF of two numbers is 1, the numbers are called relatively prime, or coprime. They share no factor except 1. For example, 15 and 28 are relatively prime, even though neither is prime.',
					'Relatively prime numbers are useful in fractions. A fraction is already in its simplest form when its top and bottom are relatively prime. For example, 5/8 cannot be simplified further.'
				]
			}
		],
		formulas: [
			{
				title: 'Euclid’s method for two numbers',
				expression: 'gcf(a, b) = gcf(b, a mod b), and gcf(a, 0) = a',
				variables: [
					{ symbol: 'a, b', meaning: 'the two numbers, with a at least as large as b' },
					{ symbol: 'a mod b', meaning: 'the remainder when a is divided by b' }
				]
			},
			{
				title: 'More than two numbers',
				expression: 'gcf(a, b, c) = gcf(gcf(a, b), c)',
				variables: [{ symbol: 'gcf(a, b)', meaning: 'the result of the previous pair, which then pairs with the next number' }]
			}
		],
		example: {
			title: 'GCF of 48 and 180',
			steps: [
				'Divide 180 by 48: 180 = 3 × 48 + 36.',
				'Divide 48 by 36: 48 = 1 × 36 + 12.',
				'Divide 36 by 12: 36 = 3 × 12 + 0.',
				'The last nonzero remainder is 12.'
			],
			result: 'The greatest common factor of 48 and 180 is 12.'
		},
		faq: [
			{
				q: 'What is the difference between GCF and LCM?',
				a: 'The greatest common factor is the largest number that divides every value in the list. The least common multiple is the smallest number that every value divides into. Use the LCM calculator for that.'
			},
			{
				q: 'What does it mean when the GCF is 1?',
				a: 'The numbers share no factor other than 1. They are called relatively prime, or coprime. For example, 17 and 31 are both prime, so their GCF is 1.'
			},
			{
				q: 'Why does Euclid’s method work?',
				a: 'Any number that divides both a and b also divides the remainder a − b × q. So the pair (a, b) and the pair (b, remainder) have the same common factors, and the process keeps shrinking the numbers until the remainder is 0.'
			},
			{
				q: 'Is the GCF the same as the GCD or HCF?',
				a: 'Yes. GCF, GCD and HCF are different names for the same number. Use whichever name your class or textbook uses.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Greatest common divisor', url: 'https://en.wikipedia.org/wiki/Greatest_common_divisor' },
			{ title: 'Wikipedia — Euclidean algorithm', url: 'https://en.wikipedia.org/wiki/Euclidean_algorithm' }
		]
	}
});
