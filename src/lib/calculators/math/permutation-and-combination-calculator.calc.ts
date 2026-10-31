import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './permutation-and-combination-calculator.meta';

const LIMIT = 1000;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number) =>
	String(n)
		.split('')
		.map((d) => SUP[Number(d)])
		.join('');

/** nPr = n! ÷ (n − r)!, the product of the r largest factors of n. Exact. */
function perm(n: number, r: number): bigint {
	let p = BigInt(1);
	for (let i = 0; i < r; i++) p *= BigInt(n - i);
	return p;
}

/** nCr = n! ÷ (r! × (n − r)!), built up step by step so every step stays a whole number. */
function choose(m: number, k: number): bigint {
	if (k < 0 || k > m) return BigInt(0);
	const j = Math.min(k, m - k);
	let c = BigInt(1);
	for (let i = 1; i <= j; i++) c = (c * BigInt(m - j + i)) / BigInt(i);
	return c;
}

/** base^exp for whole numbers, exact. */
function power(base: number, exp: number): bigint {
	let p = BigInt(1);
	const b = BigInt(base);
	for (let i = 0; i < exp; i++) p *= b;
	return p;
}

/** Scientific form with four significant figures, e.g. 2.4329 × 10¹⁸. */
function sci(x: bigint): string {
	const s = x.toString();
	const frac = s.slice(1, 5).replace(/0+$/, '');
	return `${s[0]}${frac ? `.${frac}` : ''} × 10${sup(s.length - 1)}`;
}

/** Plain digits with commas up to 15 digits; scientific form beyond that. */
function show(x: bigint): string {
	const s = x.toString();
	return s.length > 15 ? sci(x) : num(Number(s), 0);
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'kind',
			label: 'Count',
			type: 'select',
			display: 'menu',
			default: 'perm',
			options: [
				{ label: 'Permutations, nPr (order matters, no repeats)', value: 'perm' },
				{ label: 'Combinations, nCr (order ignored, no repeats)', value: 'comb' },
				{ label: 'Permutations with repetition, nʳ', value: 'permRep' },
				{ label: 'Combinations with repetition', value: 'combRep' }
			]
		},
		{
			id: 'n',
			label: 'Total items n',
			type: 'number',
			default: 10,
			min: 0,
			max: LIMIT,
			decimal: false,
			help: 'A whole number from 0 to 1,000.'
		},
		{
			id: 'r',
			label: 'Items chosen r',
			type: 'number',
			default: 3,
			min: 0,
			max: LIMIT,
			decimal: false,
			help: 'A whole number from 0 up to n.'
		}
	],
	calculate(v): CalculationResult {
		const kind = String(v.kind);
		const n = Number(v.n);
		const r = Number(v.r);
		const labels: Record<string, string> = {
			perm: 'Permutations (nPr)',
			comb: 'Combinations (nCr)',
			permRep: 'Permutations with repetition (nʳ)',
			combRep: 'Combinations with repetition'
		};
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: labels[kind] ?? labels.perm,
			summary
		});

		if (!(kind in labels)) return fail('Pick a kind of count.');
		const repeats = kind === 'permRep' || kind === 'combRep';
		if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || n > LIMIT || r < 0 || r > LIMIT)
			return fail(`Enter whole numbers from 0 to ${num(LIMIT, 0)}.`);
		// Without repetition you can't pick more items than exist; with repetition you can.
		if (r > n && !repeats) return fail('Without repetition, r can’t be larger than n. Choose a “with repetition” option to pick items more than once.');

		const values = {
			perm: r > n ? BigInt(0) : perm(n, r),
			comb: r > n ? BigInt(0) : choose(n, r),
			permRep: power(n, r),
			combRep: r === 0 ? BigInt(1) : n === 0 ? BigInt(0) : choose(n + r - 1, r)
		};
		const working: Record<string, string> = {
			perm: `${num(n, 0)}! ÷ (${num(n, 0)} − ${num(r, 0)})!`,
			comb: `${num(n, 0)}! ÷ (${num(r, 0)}! × (${num(n, 0)} − ${num(r, 0)})!)`,
			permRep: `${num(n, 0)}^${num(r, 0)}`,
			combRep: `C(${num(n, 0)} + ${num(r, 0)} − 1, ${num(r, 0)})`
		};

		const chosen = values[kind as keyof typeof values];
		const exact = chosen.toString();
		const big = exact.length > 15;

		return {
			primaryResult: big ? exact : show(chosen),
			primaryLabel: labels[kind],
			...(big ? { long: true } : {}),
			summary: big ? `${working[kind]} is about ${sci(chosen)}` : `${working[kind]} = ${show(chosen)}`,
			secondaryMetrics: [
				{ label: 'Permutations nPr', value: show(values.perm) },
				{ label: 'Combinations nCr', value: show(values.comb) },
				{ label: 'With repetition nʳ', value: show(values.permRep) },
				{ label: 'With repetition C(n + r − 1, r)', value: show(values.combRep) }
			]
		};
	},
	content: {
		intro:
			'This permutation and combination calculator counts the ways to choose r items from n. Pick permutations when the order matters, combinations when it does not, and whether items can repeat. Results up to 1,000 items are exact, and very large numbers appear in scientific form.',
		howTo: [
			'Choose the kind of count: permutations or combinations, with or without repetition.',
			'Enter n, the total number of items, as a whole number.',
			'Enter r, the number of items you choose, as a whole number. Without repetition, r cannot be larger than n.',
			'Read the number of ways, and the formula with its working below it.'
		],
		about: [
			{
				heading: 'Permutations or combinations?',
				paragraphs: [
					'The key question is whether order matters. A permutation counts ordered arrangements. A combination counts groups, where the order is ignored. For example, the same three friends sitting in a different order is a new permutation, but the same group of three is one combination.',
					'Take a race with 10 runners. The gold, silver and bronze positions depend on order, so there are 10 × 9 × 8 = 720 ways to fill the podium. A committee of 3 chosen from the same 10 people has no order, so there are only 120 committees.',
					'Permutations are always at least as large as combinations for the same n and r. Each group of r items can be arranged in r! ways, so the permutation count is the combination count times r!.'
				]
			},
			{
				heading: 'What “with repetition” means',
				paragraphs: [
					'Without repetition, each item can be picked only once. Once a runner has a medal, that runner cannot take another. With repetition, the same item can be picked again, as in a multi-digit PIN where a digit like 7 can appear twice.',
					'For permutations with repetition, each of the r positions has n choices, so the count is nʳ. For example, a four-digit PIN made from the digits 0 to 9 has 10⁴ = 10,000 options.',
					'For combinations with repetition, the calculator uses the formula C(n + r − 1, r). It counts ways to pick r items from n types when the same type can be taken more than once and the order is ignored.'
				],
				table: {
					caption: 'Counts for n = 10 and r = 3',
					columns: ['Type', 'Formula', 'Result'],
					rows: [
						['Permutations (order matters, no repeats)', '10 × 9 × 8', '720'],
						['Combinations (order ignored, no repeats)', '10 × 9 × 8 ÷ 3!', '120'],
						['Permutations with repetition', '10³', '1,000'],
						['Combinations with repetition', 'C(12, 3)', '220']
					]
				}
			},
			{
				heading: 'Why the numbers grow so fast',
				paragraphs: [
					'Counts climb quickly, because each extra item multiplies the total. Choosing 20 items from 40 in order gives a number with more than 20 digits. For very large results, the [big number calculator](/big-number-calculator) keeps every digit accurate.',
					'This is why lottery odds and password strengths can look huge. Each extra character or ball multiplies the number of possible outcomes. To turn a count into a probability, divide the favourable outcomes by the total, using the [probability calculator](/probability-calculator).',
					'For very large counts, the result is shown in scientific notation, so the leading digits stay easy to read. The [exponent calculator](/exponent-calculator) can help with the powers used by repetition counts.'
				]
			},
			{
				heading: 'Tips for counting correctly',
				paragraphs: ['Most mistakes come from using the wrong formula for the question. These checks help:'],
				list: [
					'**Ask if the order matters.** Seating, rankings and codes depend on order. Teams and committees usually do not.',
					'**Ask if items can repeat.** Locks and PINs often allow repeats. Draws from a bag without replacement do not.',
					'**Check that r is not larger than n.** Without repetition, you cannot pick more items than exist.',
					'**Use the working line.** It shows the formula, so you can rebuild the count by hand.',
					'**Check small cases by listing them.** For n = 3 and r = 2, list the ordered pairs to confirm the rule.'
				]
			}
		],
		formulas: [
			{
				title: 'Permutations (nPr)',
				expression: 'nPr = n! ÷ (n − r)!',
				variables: [
					{ symbol: 'n', meaning: 'total number of items' },
					{ symbol: 'r', meaning: 'number of items chosen, in order' },
					{ symbol: '!', meaning: 'factorial, the product of all whole numbers up to that number, so 4! = 4 × 3 × 2 × 1 = 24' }
				]
			},
			{
				title: 'Combinations (nCr)',
				expression: 'nCr = n! ÷ (r! × (n − r)!)',
				variables: [{ symbol: 'nCr', meaning: 'the number of groups of r items from n, with order ignored' }]
			},
			{
				title: 'Permutations with repetition',
				expression: 'nʳ',
				variables: [{ symbol: 'nʳ', meaning: 'n multiplied by itself r times' }]
			},
			{
				title: 'Combinations with repetition',
				expression: 'C(n + r − 1, r) = (n + r − 1)! ÷ (r! × (n − 1)!)',
				variables: []
			}
		],
		example: {
			title: 'Choosing 3 from 10 items, order matters and order does not',
			steps: [
				'Permutations: 10P3 = 10! ÷ 7! = 10 × 9 × 8 = 720.',
				'Combinations: 10C3 = 10! ÷ (3! × 7!) = 720 ÷ 6 = 120.',
				'Check: each group of 3 can be arranged in 3! = 6 ways, so 120 × 6 = 720.'
			],
			result: 'There are 720 ordered podiums and 120 unordered committees of 3 from 10 people.'
		},
		faq: [
			{
				q: 'What is the difference between a permutation and a combination?',
				a: 'A permutation counts ordered arrangements, so ABC and BAC are different. A combination counts groups, so ABC and BAC are the same. The permutation count is always the combination count times r!.'
			},
			{
				q: 'How do I calculate nCr?',
				a: 'Divide n! by r! times (n − r)!. For 10C3, that is 10! ÷ (3! × 7!) = 120. The calculator also shows the working, so you can check each step.'
			},
			{
				q: 'What is 0 factorial?',
				a: 'By definition, 0! equals 1. This keeps the formulas working when r equals 0 or when r equals n.'
			},
			{
				q: 'Why can r not be larger than n without repetition?',
				a: 'You cannot choose more distinct items than exist. Once every item is used, there is nothing left to pick, so the count is zero for that case.'
			},
			{
				q: 'What is the largest count this calculator can show?',
				a: 'Inputs go up to 1,000. Results with more than 15 digits are shown in scientific notation, so the leading digits remain clear.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Permutation', url: 'https://mathworld.wolfram.com/Permutation.html' },
			{ title: 'Wolfram MathWorld: Combination', url: 'https://mathworld.wolfram.com/Combination.html' }
		]
	}
});
