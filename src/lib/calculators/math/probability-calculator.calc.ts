import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct, plural } from '../format';
import meta from './probability-calculator.meta';

/** Probabilities are entered and shown as percentages (30 means 30%). */
const P = (p: number): string => pct(p * 100, p * 100 < 0.0001 ? 10 : 4);

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result', summary });

/**
 * Binomial probability P(X = k) for n trials with success chance p, computed in log space
 * so large n does not overflow. Log factorials are passed in as a table.
 */
function binomPmf(n: number, k: number, p: number, logFact: number[]): number {
	if (p === 0) return k === 0 ? 1 : 0;
	if (p === 1) return k === n ? 1 : 0;
	return Math.exp(logFact[n] - logFact[k] - logFact[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Type of problem',
			type: 'select',
			display: 'segmented',
			default: 'events',
			options: [
				{ label: 'Two events', value: 'events' },
				{ label: 'Repeated trials', value: 'trials' }
			]
		},
		{
			id: 'pA',
			label: 'Probability of A',
			type: 'number',
			default: 30,
			min: 0,
			max: 100,
			suffix: '%',
			help: 'Enter a percentage, such as 30 for 30%.',
			visibleWhen: (v: InputValues) => v.mode === 'events'
		},
		{
			id: 'pB',
			label: 'Probability of B',
			type: 'number',
			default: 50,
			min: 0,
			max: 100,
			suffix: '%',
			visibleWhen: (v: InputValues) => v.mode === 'events'
		},
		{
			id: 'pTrial',
			label: 'Probability per trial',
			type: 'number',
			default: 10,
			min: 0,
			max: 100,
			suffix: '%',
			help: 'The chance of success on each trial. Each trial is assumed independent.',
			visibleWhen: (v: InputValues) => v.mode === 'trials'
		},
		{
			id: 'trials',
			label: 'Number of trials (n)',
			type: 'number',
			default: 5,
			min: 1,
			max: 1000,
			decimal: false,
			visibleWhen: (v: InputValues) => v.mode === 'trials'
		},
		{
			id: 'k',
			label: 'Number of successes (k)',
			type: 'number',
			default: 2,
			min: 0,
			max: 1000,
			decimal: false,
			visibleWhen: (v: InputValues) => v.mode === 'trials'
		}
	],
	calculate(v: InputValues): CalculationResult {
		if (String(v.mode) === 'trials') {
			const p = Number(v.pTrial) / 100;
			const n = Number(v.trials);
			const k = Number(v.k);
			const label = 'Probability of exactly k successes';
			if (!(p >= 0 && p <= 1) || !Number.isFinite(n) || !Number.isFinite(k)) {
				return fail('Enter a chance between 0% and 100%, and whole numbers for trials and successes.');
			}
			if (!Number.isInteger(n) || n < 1 || n > 1000) return fail('Enter a whole number of trials from 1 to 1,000.');
			if (!Number.isInteger(k) || k < 0 || k > n) return fail('Successes must be a whole number from 0 up to the number of trials.');

			const logFact = [0];
			for (let i = 1; i <= n; i++) logFact[i] = logFact[i - 1] + Math.log(i);

			const exactly = binomPmf(n, k, p, logFact);
			const none = Math.pow(1 - p, n);
			const atLeastOne = 1 - none;
			let atMost = 0;
			for (let i = 0; i <= k; i++) atMost += binomPmf(n, i, p, logFact);

			return {
				primaryResult: P(exactly),
				primaryLabel: `Probability of exactly ${plural(k, 'success', 'successes')}`,
				summary: `${num(n, 0)} independent trials, each with a ${P(p)} chance of success.`,
				secondaryMetrics: [
					{ label: 'P(at least one success)', value: P(atLeastOne) },
					{ label: 'P(no successes)', value: P(none) },
					{ label: 'P(at most k successes)', value: P(atMost) },
					{ label: 'Expected successes (n × p)', value: num(n * p, 4) }
				]
			};
		}

		const pa = Number(v.pA) / 100;
		const pb = Number(v.pB) / 100;
		if (!(pa >= 0 && pa <= 1) || !(pb >= 0 && pb <= 1)) {
			return fail('Enter a probability from 0% to 100% for both A and B.');
		}
		const both = pa * pb;
		return {
			primaryResult: P(both),
			primaryLabel: 'P(A and B)',
			summary: `For independent events, P(A and B) = P(A) × P(B) = ${P(pa)} × ${P(pb)}.`,
			secondaryMetrics: [
				{ label: 'P(A or B)', value: P(pa + pb - both) },
				{ label: 'P(A but not B)', value: P(pa * (1 - pb)) },
				{ label: 'P(neither A nor B)', value: P((1 - pa) * (1 - pb)) },
				{ label: 'P(not A)', value: P(1 - pa) },
				{ label: 'P(not B)', value: P(1 - pb) }
			]
		};
	},
	content: {
		intro:
			'This probability calculator finds the chance of combined events. Enter two probabilities to get the chance that both happen, either happens, or neither happens. Or enter a chance per trial to find the odds of a number of successes in repeated trials.',
		howTo: [
			'Choose the type of problem: two events, or repeated trials.',
			'For two events, enter the probability of A and of B as percentages. For repeated trials, enter the chance per trial, the number of trials and the number of successes.',
			'Read the combined probabilities. The working line shows the formula used.',
			'Check that the events are independent, as the two-events mode assumes.'
		],
		about: [
			{
				heading: 'What is probability?',
				paragraphs: [
					'Probability measures how likely an event is. It is a number from 0 to 1, where 0 means impossible and 1 means certain. Percentages are the same idea scaled to 0 to 100%, so 0.3 is 30%. The [percentage calculator](/percentage-calculator) converts between the two.',
					'A fair coin gives heads with probability 0.5. A fair six-sided die gives a 6 with probability 1/6, which is about 0.1667. The probabilities of all possible outcomes always add up to 1.',
					'For example, if the chance of rain tomorrow is 30%, the chance of no rain is 70%. The two always add up to 100%, because one of them must happen.'
				]
			},
			{
				heading: 'Two events: and, or, and not',
				paragraphs: [
					'If events A and B are independent, the chance that both happen is the product of their chances. For example, with P(A) = 0.30 and P(B) = 0.50, both happen with probability 0.30 × 0.50 = 0.15.',
					'The chance that either happens is found by adding the two probabilities and subtracting the overlap, so you do not count the overlap twice. Here that gives 0.30 + 0.50 − 0.15 = 0.65.',
					'The chance that A happens without B is P(A) × (1 − P(B)), because B must fail to happen. Complement rules, such as “not A”, come from subtracting from 1.'
				],
				table: {
					caption: 'Combined events for P(A) = 0.30 and P(B) = 0.50',
					columns: ['Event', 'Calculation', 'Probability'],
					rows: [
						['A and B', '0.30 × 0.50', '0.15'],
						['A or B', '0.30 + 0.50 − 0.15', '0.65'],
						['A but not B', '0.30 × (1 − 0.50)', '0.15'],
						['Neither A nor B', '(1 − 0.30) × (1 − 0.50)', '0.35']
					]
				}
			},
			{
				heading: 'Repeated trials and at least one success',
				paragraphs: [
					'When the same trial is repeated, and each trial has the same chance p of success, the number of successes follows a binomial distribution. The chance of exactly k successes in n trials is C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ.',
					'A common question is “at least one success”. It is easier to find the chance of no success and subtract it from 1. For 5 trials at 10% each, the chance of no success is 0.9⁵ = 0.59049, so the chance of at least one is 1 − 0.59049 = 0.40951, or about 41%.',
					'The calculator also shows the expected number of successes, which is n × p. For 5 trials at 10%, that is 0.5. The expected value is an average over many repeats, so it does not tell you what will happen in one set of trials. To judge whether observed results differ from what chance predicts, see the [p-value calculator](/p-value-calculator).'
				]
			},
			{
				heading: 'Tips for correct probabilities',
				paragraphs: ['Probability mistakes often come from assuming independence when events are linked. Keep these points in mind:'],
				list: [
					'**Check independence.** Two draws from a bag without replacement are not independent, because the first draw changes the second.',
					'**Use the same units.** Enter percentages and check that the answers match, or convert everything to decimals first.',
					'**Count the overlap.** When events can happen together, subtract the overlap in the “or” rule.',
					'**Use complements for “at least”.** Find the chance of none and subtract it from 1.',
					'**Count the outcomes first.** When outcomes are equally likely, the [permutation and combination calculator](/permutation-and-combination-calculator) counts the favourable and total results.'
				]
			}
		],
		formulas: [
			{
				title: 'Both events (independent)',
				expression: 'P(A and B) = P(A) × P(B)',
				variables: [{ symbol: 'P(A)', meaning: 'the probability that A happens' }]
			},
			{
				title: 'Either event',
				expression: 'P(A or B) = P(A) + P(B) − P(A and B)',
				variables: [{ symbol: 'P(A and B)', meaning: 'the overlap, counted once' }]
			},
			{
				title: 'Repeated trials',
				expression: 'P(k successes) = C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ',
				variables: [
					{ symbol: 'n', meaning: 'number of trials' },
					{ symbol: 'k', meaning: 'number of successes wanted' },
					{ symbol: 'p', meaning: 'probability of success in one trial' }
				]
			},
			{
				title: 'Expected successes',
				expression: 'E = n × p',
				variables: [{ symbol: 'E', meaning: 'the long-run average number of successes' }]
			}
		],
		example: {
			title: 'A = 30% and B = 50%, two independent events',
			steps: [
				'Both: 0.30 × 0.50 = 0.15.',
				'Either: 0.30 + 0.50 − 0.15 = 0.65.',
				'A but not B: 0.30 × (1 − 0.50) = 0.15.'
			],
			result: 'P(A and B) is 15%, and P(A or B) is 65%.'
		},
		faq: [
			{
				q: 'How do I calculate the probability of two events both happening?',
				a: 'If the events are independent, multiply their probabilities. For 30% and 50%, the answer is 0.30 × 0.50 = 0.15, or 15%. If they are not independent, you need the conditional probability instead.'
			},
			{
				q: 'What does “at least one” mean in probability?',
				a: 'It means one or more successes. Find the probability of zero successes, then subtract it from 1. For 5 trials at 10% each, the answer is 1 − 0.9⁵ = 0.40951.'
			},
			{
				q: 'What is the difference between “and” and “or”?',
				a: '“And” means both events happen, so the chance is usually smaller. “Or” means at least one happens, so the chance is larger, but you must not count the overlap twice.'
			},
			{
				q: 'Can a probability be more than 100%?',
				a: 'No. A probability is always between 0% and 100%. If your working gives a larger number, check the formula, because one of the inputs or steps is likely wrong.'
			},
			{
				q: 'Why does the expected value not match what happens in a few trials?',
				a: 'The expected value is a long-run average. In a small number of trials, the actual count can vary a lot from it, so it is best read as the average over many repeats.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Probability', url: 'https://mathworld.wolfram.com/Probability.html' },
			{ title: 'Wolfram MathWorld: Binomial Distribution', url: 'https://mathworld.wolfram.com/BinomialDistribution.html' }
		]
	}
});
