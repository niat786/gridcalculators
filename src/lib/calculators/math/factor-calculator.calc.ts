import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH } from '../format';
import meta from './factor-calculator.meta';

const MAX_VALUE = 1e12;
/** Pairs shown in the table. A highly composite number can have thousands. */
const TABLE_LIMIT = 50;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'n',
			label: 'Whole number',
			type: 'number',
			default: 360,
			min: 1,
			max: MAX_VALUE,
			step: 1,
			decimal: false,
			help: 'From 1 to 1,000,000,000,000.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const n = Number(v.n);
		const label = 'All factors';
		if (!Number.isInteger(n) || n < 1 || n > MAX_VALUE) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a whole number from 1 to 1,000,000,000,000.' };
		}

		// Trial division up to the square root finds every factor in pairs (i, n ÷ i).
		let root = Math.floor(Math.sqrt(n));
		while (root * root > n) root--;
		while ((root + 1) * (root + 1) <= n) root++;

		const small: number[] = [];
		const large: number[] = [];
		for (let i = 1; i <= root; i++) {
			if (n % i !== 0) continue;
			small.push(i);
			if (i * i !== n) large.push(n / i);
		}
		const factors = [...small, ...large.reverse()];
		const count = factors.length;
		const pairCount = small.length;
		const isPrime = count === 2;
		const isSquare = root * root === n;

		const rows = small.slice(0, TABLE_LIMIT).map((i) => ({ small: String(i), large: String(n / i) }));
		const table: Table = {
			title: `Factor pairs (${pairCount.toLocaleString('en-US')} in total${pairCount > TABLE_LIMIT ? `, first ${TABLE_LIMIT} shown` : ''})`,
			columns: [
				{ key: 'small', label: 'Smaller factor', align: 'end' },
				{ key: 'large', label: 'Larger factor', align: 'end' }
			],
			rows,
			collapsed: true
		};

		let summary: string;
		if (n === 1) summary = '1 is not prime. Its only factor is itself.';
		else if (isPrime) summary = `${n} is prime. Its only factors are 1 and ${n}.`;
		else summary = `${n} is composite. It has ${count.toLocaleString('en-US')} factors, which form ${pairCount.toLocaleString('en-US')} pairs whose product is ${n}.`;

		return {
			primaryResult: factors.join(', '),
			primaryLabel: label,
			long: count > 12,
			summary,
			secondaryMetrics: [
				{ label: 'Number of factors', value: String(count) },
				{ label: 'Factor pairs', value: String(pairCount) },
				{ label: 'Prime?', value: isPrime ? 'Yes' : 'No' },
				{ label: 'Perfect square?', value: isSquare ? 'Yes' : 'No' }
			],
			table
		};
	},
	content: {
		intro:
			'List every factor of a whole number, meaning each number that divides it with no remainder. The calculator also shows the factor pairs, how many factors there are, and whether the number is prime.',
		howTo: [
			'Type a whole number from 1 up to 1,000,000,000,000.',
			'Read the full list of factors in order, with the count and whether the number is prime.',
			'Open the factor pairs table to see each pair of factors that multiply to your number.'
		],
		about: [
			{
				heading: 'What is a factor?',
				paragraphs: [
					'A factor of a number is a whole number that divides it exactly, with no remainder. For example, 4 is a factor of 36, because 36 ÷ 4 = 9 with nothing left over.',
					'Every number is a factor of itself, and 1 is a factor of every number. So the factors of 36 start with 1 and end with 36.',
					'Factors are the building blocks of multiplication. If 36 has a factor of 4, you can split 36 into 4 equal groups of 9.'
				]
			},
			{
				heading: 'How the factor list is built',
				paragraphs: [
					'Factors come in pairs. If 4 is a factor of 36, then 9 is too, because 4 × 9 = 36. The calculator checks each number from 1 up to the square root of your number. Each factor it finds gives you a pair.',
					'For 36, the square root is 6. Checking 1 to 6 finds 1, 2, 3, 4 and 6. Their partners are 36, 18, 12, 9 and 6. Put them together and you get 1, 2, 3, 4, 6, 9, 12, 18 and 36.',
					'Checking only up to the square root keeps the search short, even for large numbers. You never need to test past it, because each pair has one factor at or below the root.',
					'Divisibility rules help too. A number is divisible by 2 if it ends in 0, 2, 4, 6 or 8. It is divisible by 3 if its digits add up to a multiple of 3, and by 5 if it ends in 0 or 5.'
				],
				table: {
					caption: 'Factor pairs of 36',
					columns: ['Smaller factor', 'Larger factor', 'Product'],
					rows: [
						['1', '36', '36'],
						['2', '18', '36'],
						['3', '12', '36'],
						['4', '9', '36'],
						['6', '6', '36']
					]
				}
			},
			{
				heading: 'Prime, composite and perfect squares',
				paragraphs: [
					'A prime number has exactly two factors, 1 and itself. A composite number has more than two. The number 1 has only one factor, so it is neither prime nor composite.',
					'A perfect square, such as 36 = 6 × 6, has an odd number of factors. The square root pairs with itself, so it is counted once, not as a pair. The calculator shows whether your number is a perfect square.'
				]
			},
			{
				heading: 'Counting factors from prime factors',
				paragraphs: [
					'You can count the factors without listing them. First, write the number as a product of primes. Add 1 to each exponent, then multiply the results. For 36 = 2² × 3², the count is (2 + 1) × (2 + 1) = 9.',
					'The same method works for bigger numbers. For 360 = 2³ × 3² × 5, the count is (3 + 1) × (2 + 1) × (1 + 1) = 24 factors. To see the primes first, use the [prime factorization calculator](/prime-factorization-calculator).'
				]
			},
			{
				heading: 'Where factors are useful',
				paragraphs: [
					'Factors help when you share things into equal groups. If you have 24 apples, you can share them equally between 1, 2, 3, 4, 6, 8, 12 or 24 people. Those are the factors of 24, and nothing is left over.',
					'Factors also help you compare numbers. The shared factors of two numbers are their common factors, and the largest one is the greatest common factor. The [common factor calculator](/common-factor-calculator) and the [GCF calculator](/gcf-calculator) work with these lists.'
				]
			},
		],
		formulas: [
			{
				title: 'Factor pairs',
				expression: 'If i × j = n, then i and j are a factor pair of n. Check each i from 1 up to √n.',
				variables: [
					{ symbol: 'n', meaning: 'the number you entered' },
					{ symbol: 'i', meaning: 'a candidate factor. It divides n when n ÷ i has no remainder' },
					{ symbol: '√n', meaning: 'the square root. Every pair has one factor at or below it, so you never need to test past it' }
				]
			},
			{
				title: 'Number of factors from prime factorization',
				expression: 'If n = p₁ᵃ × p₂ᵇ × … then the number of factors is (a + 1)(b + 1) …',
				variables: [
					{ symbol: 'p', meaning: 'a prime factor of n' },
					{ symbol: 'a, b', meaning: 'how many times each prime appears' }
				]
			}
		],
		example: {
			title: 'Factors of 36',
			steps: [
				'Test each i up to √36 = 6: 1, 2, 3, 4 and 6 divide 36 with no remainder.',
				'Each one gives a pair: 1 × 36, 2 × 18, 3 × 12, 4 × 9 and 6 × 6.',
				'The factors are 1, 2, 3, 4, 6, 9, 12, 18 and 36, so there are 9.',
				'36 is not prime, but it is a perfect square because 6 × 6 = 36.'
			],
			result: '36 has 9 factors: 1, 2, 3, 4, 6, 9, 12, 18, 36. It is not prime.'
		},
		faq: [
			{
				q: 'What is a factor?',
				a: 'A factor of a number is a whole number that divides it exactly, with no remainder. For example, 4 is a factor of 36 because 36 ÷ 4 = 9.'
			},
			{
				q: 'Is 1 a prime number?',
				a: 'No. A prime has exactly two factors, 1 and itself. The number 1 has only one factor, so it is not prime.'
			},
			{
				q: 'What is a factor pair?',
				a: 'A factor pair is two factors that multiply to give the number. For 36, the pairs are 1 × 36, 2 × 18, 3 × 12, 4 × 9 and 6 × 6.'
			},
			{
				q: 'Why can’t I find the factors of 0?',
				a: 'Every whole number divides 0 exactly, because any number times 0 is 0. So 0 has infinitely many factors, and no list can show them all. The calculator starts at 1.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Divisor', url: 'https://en.wikipedia.org/wiki/Divisor' },
			{ title: 'Wikipedia — Square number', url: 'https://en.wikipedia.org/wiki/Square_number' }
		]
	}
});
