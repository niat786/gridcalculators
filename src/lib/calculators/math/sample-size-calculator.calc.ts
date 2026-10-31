import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './sample-size-calculator.meta';

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result', summary });

/** Standard normal density, φ(t). */
const phi = (t: number): number => Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI);

/**
 * Upper tail P(Z > t) for t ≥ 0. Below 4 it uses the power series
 * Φ(t) − ½ = φ(t) · Σ t²ⁿ⁺¹ ÷ (1·3·…·(2n+1)); above 4 it uses Laplace's continued fraction,
 * which keeps full relative accuracy far into the tail.
 */
function upperTail(t: number): number {
	if (t < 4) {
		let term = t;
		let sum = t;
		for (let n = 1; n < 500; n++) {
			term *= (t * t) / (2 * n + 1);
			sum += term;
			if (term < 1e-17 * sum) break;
		}
		return 0.5 - phi(t) * sum;
	}
	let f = t;
	for (let k = 300; k >= 1; k--) f = t + k / f;
	return phi(t) / f;
}

/** Standard normal CDF, Φ(z) = P(Z ≤ z). Accurate to about 1e-15 in both tails. */
function normCdf(z: number): number {
	return z >= 0 ? 1 - upperTail(z) : upperTail(-z);
}

// Acklam's rational approximation coefficients for the inverse normal CDF.
const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

/** Inverse standard normal Φ⁻¹(p): Acklam's approximation, then one Newton step. */
function normInv(p: number): number {
	if (!(p > 0 && p < 1)) return NaN;
	const pLow = 0.02425;
	let x: number;
	if (p < pLow) {
		const q = Math.sqrt(-2 * Math.log(p));
		x = (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
	} else if (p <= 1 - pLow) {
		const q = p - 0.5;
		const r = q * q;
		x = ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
	} else {
		const q = Math.sqrt(-2 * Math.log(1 - p));
		x = -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
	}
	// Newton step: x − (Φ(x) − p) ÷ φ(x)
	return x - (normCdf(x) - p) / phi(x);
}

const LEVELS = [
	{ label: '80%', value: '80' },
	{ label: '85%', value: '85' },
	{ label: '90%', value: '90' },
	{ label: '95%', value: '95' },
	{ label: '98%', value: '98' },
	{ label: '99%', value: '99' },
	{ label: '99.9%', value: '99.9' }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What to find',
			type: 'select',
			display: 'segmented',
			default: 'size',
			options: [
				{ label: 'Sample size', value: 'size' },
				{ label: 'Margin of error', value: 'moe' }
			]
		},
		{
			id: 'level',
			label: 'Confidence level',
			type: 'select',
			display: 'menu',
			default: '95',
			options: LEVELS
		},
		{
			id: 'p',
			label: 'Population proportion',
			type: 'number',
			default: 50,
			min: 0,
			max: 100,
			suffix: '%',
			help: 'Use 50% when you are unsure. It gives the largest sample size.'
		},
		{
			id: 'moe',
			label: 'Margin of error',
			type: 'number',
			default: 5,
			min: 0.01,
			max: 50,
			step: 0.1,
			suffix: '%',
			help: 'How far the true answer may be from your result, either way.',
			visibleWhen: (v: InputValues) => v.mode !== 'moe'
		},
		{
			id: 'sampleN',
			label: 'Sample size (n)',
			type: 'number',
			default: 400,
			min: 2,
			max: 1000000000,
			decimal: false,
			help: 'How many people or items you will sample.',
			visibleWhen: (v: InputValues) => v.mode === 'moe'
		},
		{
			id: 'pop',
			label: 'Population size (optional)',
			type: 'number',
			default: 0,
			min: 0,
			decimal: false,
			help: 'The total group you are sampling from. Enter 0 if it is very large or unknown.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const level = Number(v.level) / 100;
		const pr = Number(v.p) / 100;
		const N = Number(v.pop);
		if (!(level > 0 && level < 1)) return fail('Pick a confidence level.');
		if (!(pr > 0 && pr < 1)) return fail('Enter a population proportion above 0% and below 100%.');
		if (!Number.isInteger(N) || N < 0) return fail('The population size must be a whole number, or 0 if unknown.');

		const z = normInv((1 + level) / 2);
		const popText = N > 0 ? num(N, 0) : 'Not used (very large or unknown)';

		if (String(v.mode) === 'moe') {
			const n = Number(v.sampleN);
			if (!Number.isInteger(n) || n < 2) return fail('The sample size must be a whole number of at least 2.');
			if (N > 0 && (N < 2 || n > N)) return fail('The sample cannot be larger than the population.');
			let e = z * Math.sqrt((pr * (1 - pr)) / n);
			if (N > 0) e *= Math.sqrt((N - n) / (N - 1));
			return {
				primaryResult: `±${pct(e * 100, 4)}`,
				primaryLabel: 'Margin of error',
				summary: `Margin of error = z × √(p × (1 − p) ÷ n) = ${num(z, 4)} × √(${num(pr, 4)} × ${num(1 - pr, 4)} ÷ ${num(n, 0)})${N > 0 ? ', with the population correction' : ''}.`,
				secondaryMetrics: [
					{ label: 'Z value', value: num(z, 6) },
					{ label: 'Sample size (n)', value: num(n, 0) },
					{ label: 'Population size', value: popText }
				]
			};
		}

		const e = Number(v.moe) / 100;
		if (!(e > 0 && e < 1)) return fail('Enter a margin of error above 0% and below 100%.');
		const raw = (z * z * pr * (1 - pr)) / (e * e);
		const n0 = Math.ceil(raw);
		const n = N > 0 ? Math.ceil(n0 / (1 + (n0 - 1) / N)) : n0;
		return {
			primaryResult: num(n, 0),
			primaryLabel: 'Required sample size',
			summary:
				N > 0
					? `Start with ${num(n0, 0)}, then adjust for a population of ${num(N, 0)}: ${num(n0, 0)} ÷ (1 + (${num(n0, 0)} − 1) ÷ ${num(N, 0)}), rounded up.`
					: `z² × p × (1 − p) ÷ margin² = ${num(raw, 4)}, rounded up to ${num(n0, 0)}.`,
			secondaryMetrics: [
				{ label: 'Z value', value: num(z, 6) },
				{ label: 'Before population correction', value: num(n0, 0) },
				{ label: 'Population size', value: popText }
			]
		};
	},
	content: {
		intro:
			'This sample size calculator works out how many people or items you need to survey, for a chosen confidence level and margin of error. It can also work backwards, to show the margin of error for a sample you already have.',
		howTo: [
			'Choose what to find: the sample size, or the margin of error for a sample you already have.',
			'Pick a confidence level, such as 95%. Enter the margin of error you can accept, such as ±5%.',
			'Enter the expected proportion. Use 50% when you are unsure, because it gives the largest sample size.',
			'Enter the population size if it is small and known. Otherwise leave it at 0.'
		],
		about: [
			{
				heading: 'What is a sample size?',
				paragraphs: [
					'A sample is a subset of a group that you study in order to learn about the whole group. The sample size is the number of people or items in that subset. A larger sample usually gives more precise results.',
					'Sample size is not a share of the population. A survey of 400 people can be very accurate for a country of 60 million, if the sample is random. The size of the population matters much less than most people expect.',
					'The sample size is set by three choices: the confidence level, the margin of error and the variation in the data. Changing any one of them changes the answer.'
				]
			},
			{
				heading: 'Confidence level and margin of error',
				paragraphs: [
					'The confidence level, such as 95%, describes how often the method would capture the true value across repeated samples. Higher confidence needs a larger sample, because the range has to be wider or the sample bigger.',
					'The margin of error is the range either side of your result. A survey that finds 60% support with a margin of ±3% suggests the true value lies between 57% and 63%, at the chosen confidence level.',
					'Halving the margin of error needs about four times the sample size, because the margin shrinks with the square root of n. A tighter target can therefore become expensive quickly.'
				],
				table: {
					caption: 'Approximate sample sizes at 95% confidence, for a large population and p = 50%',
					columns: ['Margin of error', 'Sample size'],
					rows: [
						['±10%', '97'],
						['±5%', '385'],
						['±3%', '1,068'],
						['±2%', '2,401'],
						['±1%', '9,604']
					]
				}
			},
			{
				heading: 'Why 50% is the safe choice',
				paragraphs: [
					'The sample size formula includes p × (1 − p), the variation in a yes or no answer. This product is largest at p = 50%, where it equals 0.25. When the true proportion is closer to 0% or 100%, the variation is smaller and you need a smaller sample.',
					'Using 50% is therefore a safe, conservative choice when you do not know the answer in advance. You may end up with a slightly larger sample than strictly needed, which protects the margin of error.',
					'If a pilot study shows a proportion near 20%, you can enter that value. The required sample then falls, but you should still plan for the uncertainty in the pilot result.'
				]
			},
			{
				heading: 'Population size and practical limits',
				paragraphs: [
					'For a small, known population, the sample can be smaller than the basic formula suggests. This is the finite population correction. It matters most when the sample is a large share of the group, such as 10% or more.',
					'In practice, sample size is only one part of a good survey. Non-response, unclear questions and an unrepresentative sample can cause larger errors than a small margin of error. The standard margin describes random sampling error only.',
					'Plan the sample size before you collect data. The [confidence interval calculator](/confidence-interval-calculator) shows the range once you have results, and the [z-score calculator](/z-score-calculator) explains the z value used in the formula.'
				]
			},
			{
				heading: 'Tips for planning a sample',
				paragraphs: ['A good sample depends on the plan as much as the maths. These points help:'],
				list: [
					'**Decide the margin first.** Choose the smallest margin that the decision needs, not the smallest you can afford.',
					'**Allow for non-response.** If only half of contacted people reply, you may need to contact twice as many.',
					'**Use random selection.** The formula assumes every member has a known chance of being picked.',
					'**Check the percentage.** Convert proportions with the [percentage calculator](/percentage-calculator) if your target is in another format.',
					'**Look at the spread for numbers.** For a measured average rather than a proportion, check the [standard deviation calculator](/standard-deviation-calculator) on pilot data.'
				]
			}
		],
		formulas: [
			{
				title: 'Sample size for a proportion',
				expression: 'n = z² × p × (1 − p) ÷ E²',
				variables: [
					{ symbol: 'z', meaning: 'the critical z value for the confidence level, such as 1.96 for 95%' },
					{ symbol: 'p', meaning: 'the expected proportion, as a decimal' },
					{ symbol: 'E', meaning: 'the margin of error, as a decimal, such as 0.05 for ±5%' }
				]
			},
			{
				title: 'Finite population correction',
				expression: 'n = n₀ ÷ (1 + (n₀ − 1) ÷ N)',
				variables: [
					{ symbol: 'n₀', meaning: 'the sample size before the correction' },
					{ symbol: 'N', meaning: 'the population size' }
				]
			},
			{
				title: 'Margin of error',
				expression: 'E = z × √(p × (1 − p) ÷ n)',
				variables: [{ symbol: 'n', meaning: 'the sample size you have' }]
			}
		],
		example: {
			title: 'A survey of a town of 1,000 people at 95% confidence and ±5%',
			steps: [
				'Before correction: 1.959964² × 0.5 × 0.5 ÷ 0.05² = 384.1459, rounded up to 385.',
				'With the population correction: 385 ÷ (1 + 384 ÷ 1,000) = 278.2, rounded up.',
				'Result: 279 people.'
			],
			result: 'You need a sample of 279 people. Without the population correction you would need 385.'
		},
		faq: [
			{
				q: 'How many people do I need for a survey?',
				a: 'For a large population at 95% confidence and ±5%, you need about 385 people, using p = 50%. Enter your own margin and confidence level to get the exact figure for your study.'
			},
			{
				q: 'Does a bigger population need a bigger sample?',
				a: 'Not by much. For large populations, the needed sample barely changes. A population of 1,000 needs about 279 people at 95% and ±5%, while a much larger one needs about 385.'
			},
			{
				q: 'Why use 50% for the proportion?',
				a: 'At 50% the variation is largest, so the sample size is largest too. Using it gives a safe answer when you do not know the true proportion.'
			},
			{
				q: 'What confidence level should I use?',
				a: 'The most common choice is 95%. Higher levels need larger samples. Choose the level that suits the stakes of your study and follow any standards your field or organisation uses.'
			},
			{
				q: 'Does a margin of error cover every kind of error?',
				a: 'No. It covers random sampling error only. Biased questions, poor response rates and an unrepresentative sample can cause errors that a larger sample does not remove.'
			}
		],
		sources: [
			{ title: 'NIST/SEMATECH e-Handbook of Statistical Methods', url: 'https://www.itl.nist.gov/div898/handbook/' },
			{ title: 'Wolfram MathWorld: Confidence Interval', url: 'https://mathworld.wolfram.com/ConfidenceInterval.html' }
		]
	}
});
