import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './prime-factorization-calculator.meta';

const MAX_VALUE = 1e12;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number) =>
	String(n)
		.split('')
		.map((d) => SUP[Number(d)])
		.join('');

/** Trial division: divide out each prime p while it fits, stopping once p² is larger than what is left. */
function primeFactors(n: number): number[] {
	const out: number[] = [];
	let m = n;
	for (let p = 2; p * p <= m; p++) {
		while (m % p === 0) {
			out.push(p);
			m /= p;
		}
	}
	if (m > 1) out.push(m);
	return out;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'n',
			label: 'Whole number',
			type: 'number',
			default: 360,
			min: 2,
			max: MAX_VALUE,
			step: 1,
			decimal: false,
			help: 'From 2 to 1,000,000,000,000.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const n = Number(v.n);
		const label = 'Prime factorization';
		if (!Number.isInteger(n) || n < 2 || n > MAX_VALUE) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a whole number from 2 to 1,000,000,000,000.' };
		}

		const factors = primeFactors(n);
		const counts = new Map<number, number>();
		for (const p of factors) counts.set(p, (counts.get(p) ?? 0) + 1);
		const exponentForm = [...counts.entries()].map(([p, k]) => `${p}${k > 1 ? sup(k) : ''}`).join(' × ');
		const isPrime = factors.length === 1;

		let rest = n;
		const rows = factors.map((p, i) => {
			rest /= p;
			return { step: String(i + 1), divide: String(p), quotient: num(rest, 0) };
		});
		const table: Table = {
			title: 'Factor tree, as repeated division',
			columns: [
				{ key: 'step', label: 'Step', align: 'start' },
				{ key: 'divide', label: 'Divide by', align: 'end' },
				{ key: 'quotient', label: 'Quotient', align: 'end' }
			],
			rows
		};

		const summary = isPrime
			? `${num(n, 0)} is prime, so its only prime factor is itself.`
			: `${num(n, 0)} = ${factors.join(' × ')}. Keep dividing by the smallest prime that fits until the quotient is 1.`;

		return {
			primaryResult: exponentForm,
			primaryLabel: label,
			summary,
			secondaryMetrics: [
				{ label: 'Distinct primes', value: String(counts.size) },
				{ label: 'Prime factors, with repeats', value: String(factors.length) },
				{ label: 'Largest prime factor', value: num(factors[factors.length - 1], 0) },
				{ label: 'Is it prime?', value: isPrime ? 'Yes' : 'No' }
			],
			table
		};
	},
	content: {
		intro:
			'Break a whole number into the prime numbers that multiply together to make it. The answer is shown in exponent form, such as 2³ × 3² × 5 for 360, along with each division step.',
		howTo: [
			'Type a whole number from 2 up to 1,000,000,000,000.',
			'Read the answer in exponent form. The small raised number shows how many times that prime appears.',
			'Open the factor tree table to see each prime you divided by and what was left.'
		],
		about: [
			{
				heading: 'What is a prime number?',
				paragraphs: [
					'A prime number is a whole number greater than 1 that has only two factors: 1 and itself. The first few primes are 2, 3, 5, 7, 11, 13, 17 and 19.',
					'The number 1 is not prime, because it has only one factor. The number 2 is the only even prime, because every other even number is divisible by 2.',
					'A number that is not prime is called composite. For example, 12 is composite, because 2 × 6 = 12 and 3 × 4 = 12.'
				]
			},
			{
				heading: 'What is prime factorization?',
				paragraphs: [
					'Prime factorization writes a number as a product of prime numbers. Every whole number greater than 1 can be written this way, and there is only one set of primes for each number, apart from the order.',
					'Take 360. Divide it by 2 three times to get 45. Divide 45 by 3 twice to get 5, which is prime. So 360 = 2 × 2 × 2 × 3 × 3 × 5. In exponent form, that is 2³ × 3² × 5.',
					'The calculator shows the answer in exponent form, and it lists the primes in a table so you can follow the steps.'
				]
			},
			{
				heading: 'How the calculator finds the factors',
				paragraphs: [
					'The calculator uses trial division. It tries each prime, starting from 2, and divides the number by it as many times as it goes in. It then moves to the next candidate.',
					'It can stop early. Once the square of the next candidate is bigger than what is left, the remaining number must be prime. For example, to check 91, you only need to test primes up to 9. Since 7 divides 91 as 7 × 13, the factors are 7 and 13.',
					'This method is quick for numbers up to a trillion, which is the limit on this page.'
				]
			},
			{
				heading: 'Using prime factors in everyday maths',
				paragraphs: [
					'Prime factors help you simplify fractions. For 12/18, write 12 as 2² × 3 and 18 as 2 × 3². They share 2 × 3 = 6, so the fraction simplifies to 2/3.',
					'They also help you find the greatest common factor and the least common multiple. For 12 and 18, the shared primes give 6 as the greatest common factor. Using the highest powers gives 2² × 3² = 36 as the least common multiple.',
					'For those tasks, the [GCF calculator](/gcf-calculator) and the [LCM calculator](/lcm-calculator) give the answers directly.'
				]
			},
			{
				heading: 'Why factoring large numbers is hard',
				paragraphs: [
					'Finding the prime factors of a small number is easy. For a large number with two big prime factors, it becomes very hard. That difficulty is why many internet security systems depend on it.',
					'This calculator stops at one trillion, which keeps every answer quick to find.',
					'For a list of factors rather than primes, use the [factor calculator](/factor-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Fundamental theorem of arithmetic',
				expression: 'n = p₁ᵃ × p₂ᵇ × … × pₖᶜ',
				variables: [
					{ symbol: 'p', meaning: 'a distinct prime number, listed from smallest to largest' },
					{ symbol: 'a, b, c', meaning: 'how many times each prime appears. Every whole number above 1 has exactly one such form' }
				]
			},
			{
				title: 'Trial division',
				expression: 'Divide n by 2, then 3, 5, 7 and so on, repeating each prime while it fits. Stop when p² is greater than what is left.',
				variables: [
					{ symbol: 'p', meaning: 'the candidate divisor' },
					{ symbol: 'p²', meaning: 'if no prime up to the square root of what is left divides it, what is left is itself prime' }
				]
			}
		],
		example: {
			title: 'Prime factors of 360',
			steps: [
				'360 ÷ 2 = 180, then 180 ÷ 2 = 90, then 90 ÷ 2 = 45.',
				'45 ÷ 3 = 15, then 15 ÷ 3 = 5.',
				'5 is prime, so the last division is 5 ÷ 5 = 1.',
				'Collect the primes: 2, 2, 2, 3, 3, 5. Write repeats as powers: 2³ × 3² × 5.'
			],
			result: '360 = 2³ × 3² × 5, which has 6 prime factors counted with repeats.'
		},
		faq: [
			{
				q: 'What is exponent form?',
				a: 'Exponent form writes each repeated prime as a power. For example, 2 × 2 × 2 is written 2³, which means 2 multiplied by itself three times.'
			},
			{
				q: 'Is the prime factorization of a number unique?',
				a: 'Yes. Apart from the order of the factors, every whole number above 1 has exactly one way to be written as a product of primes. That is the fundamental theorem of arithmetic.'
			},
			{
				q: 'What is a factor tree?',
				a: 'A factor tree splits a number into two factors, then splits each factor again until every branch ends in a prime. This calculator shows the same process as a list of divisions.'
			},
			{
				q: 'Why does the calculator not accept 1?',
				a: 'The number 1 is not prime, and it has no prime factors to list, so the calculator starts at 2.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Prime number', url: 'https://en.wikipedia.org/wiki/Prime_number' },
			{ title: 'Wikipedia — Fundamental theorem of arithmetic', url: 'https://en.wikipedia.org/wiki/Fundamental_theorem_of_arithmetic' }
		]
	}
});
