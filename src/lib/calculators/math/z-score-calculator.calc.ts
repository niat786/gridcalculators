import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './z-score-calculator.meta';

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

/** Probability (0 to 1) as a percentage. Tiny tails keep enough digits to stay non-zero. */
const fmtP = (p: number): string => pct(p * 100, p * 100 < 0.0001 ? 10 : 4);

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result', summary });

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What to find',
			type: 'select',
			display: 'segmented',
			default: 'fromValue',
			options: [
				{ label: 'Z from value', value: 'fromValue' },
				{ label: 'Value from percentile', value: 'fromPercentile' },
				{ label: 'Between two z', value: 'between' }
			]
		},
		{
			id: 'x',
			label: 'Value (x)',
			type: 'number',
			default: 85,
			help: 'The value you want to place on the distribution.',
			visibleWhen: (v: InputValues) => v.mode === 'fromValue'
		},
		{
			id: 'percentile',
			label: 'Percentile',
			type: 'number',
			default: 95,
			min: 0,
			max: 100,
			suffix: '%',
			help: 'The share of values expected to fall below the result.',
			visibleWhen: (v: InputValues) => v.mode === 'fromPercentile'
		},
		{
			id: 'mean',
			label: 'Mean (μ)',
			type: 'number',
			default: 100,
			visibleWhen: (v: InputValues) => v.mode !== 'between'
		},
		{
			id: 'sd',
			label: 'Standard deviation (σ)',
			type: 'number',
			default: 15,
			min: 0,
			visibleWhen: (v: InputValues) => v.mode !== 'between'
		},
		{
			id: 'zLow',
			label: 'Lower z-score',
			type: 'number',
			default: -1,
			step: 0.1,
			visibleWhen: (v: InputValues) => v.mode === 'between'
		},
		{
			id: 'zHigh',
			label: 'Upper z-score',
			type: 'number',
			default: 1,
			step: 0.1,
			visibleWhen: (v: InputValues) => v.mode === 'between'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const mode = String(v.mode);

		if (mode === 'between') {
			const lo = Number(v.zLow);
			const hi = Number(v.zHigh);
			const label = 'Probability between the two z-scores';
			if (!Number.isFinite(lo) || !Number.isFinite(hi)) return fail('Enter two z-scores.');
			if (lo >= hi) {
				return { primaryResult: DASH, primaryLabel: label, summary: 'The lower z-score must be smaller than the upper one.' };
			}
			// Use the tail that keeps precision when both limits sit above the mean.
			const p = lo >= 0 ? normCdf(-lo) - normCdf(-hi) : normCdf(hi) - normCdf(lo);
			return {
				primaryResult: fmtP(p),
				primaryLabel: label,
				summary: `The share of the normal curve between z = ${num(lo, 4)} and z = ${num(hi, 4)}.`,
				secondaryMetrics: [
					{ label: 'Below the lower z-score', value: fmtP(normCdf(lo)) },
					{ label: 'Above the upper z-score', value: fmtP(normCdf(-hi)) },
					{ label: 'Lower z-score', value: num(lo, 6) },
					{ label: 'Upper z-score', value: num(hi, 6) }
				]
			};
		}

		const mean = Number(v.mean);
		const sd = Number(v.sd);

		if (mode === 'fromPercentile') {
			const pc = Number(v.percentile);
			if (!(pc > 0 && pc < 100)) return fail('Enter a percentile above 0 and below 100.');
			if (!Number.isFinite(mean) || !(sd > 0)) return fail('Enter a mean and a standard deviation above 0.');
			const z = normInv(pc / 100);
			const x = mean + z * sd;
			return {
				primaryResult: num(x, 6),
				primaryLabel: 'Value (x)',
				summary: `z = Φ⁻¹(${num(pc / 100, 6)}) = ${num(z, 6)}, so x = ${num(mean, 6)} + ${num(z, 6)} × ${num(sd, 6)}.`,
				secondaryMetrics: [
					{ label: 'Z-score', value: num(z, 6) },
					{ label: 'Percentile', value: pct(pc, 4) },
					{ label: 'Mean (μ)', value: num(mean, 6) },
					{ label: 'Standard deviation (σ)', value: num(sd, 6) }
				]
			};
		}

		const x = Number(v.x);
		if (!Number.isFinite(x) || !Number.isFinite(mean)) return fail('Enter a value and a mean.');
		if (!(sd > 0)) return fail('The standard deviation must be greater than 0.');
		const z = (x - mean) / sd;
		const below = normCdf(z);
		const above = normCdf(-z);
		const side = z === 0 ? 'exactly at the mean' : `${num(Math.abs(z), 4)} standard deviations ${z < 0 ? 'below' : 'above'} the mean`;
		return {
			primaryResult: num(z, 4),
			primaryLabel: 'Z-score',
			summary: `The value is ${side}, so about ${fmtP(below)} of values fall below it.`,
			secondaryMetrics: [
				{ label: 'Percentile, P(X < x)', value: fmtP(below) },
				{ label: 'P(X > x)', value: fmtP(above) },
				{ label: 'Distance from mean (x − μ)', value: num(x - mean, 6) },
				{ label: 'Standard deviation (σ)', value: num(sd, 6) }
			]
		};
	},
	content: {
		intro:
			'This z-score calculator shows where a value sits on a normal distribution. Enter a value with its mean and standard deviation to get the z-score and percentile, or work backwards from a percentile to a value, or find the share between two z-scores.',
		howTo: [
			'Choose what to find: a z-score from a value, a value from a percentile, or the share between two z-scores.',
			'Enter the value, or the percentile, or the two z-scores. For the first two options, also enter the mean and standard deviation.',
			'Read the z-score, the percentile and the share of values above or below your result.'
		],
		about: [
			{
				heading: 'What is a z-score?',
				paragraphs: [
					'A z-score tells you how many standard deviations a value is from the mean. A z-score of 0 means the value is exactly the mean. A z-score of 2 means the value is two standard deviations above it, and −2 means two below.',
					'Z-scores also put different measurements on one scale. A score of 85 on a test with a mean of 100 and a standard deviation of 15 has a z-score of −1. A height of 180 cm with a mean of 175 cm and a standard deviation of 7 cm has a z-score of about 0.71. The two numbers can then be compared directly.',
					'The z-score is the basis for many statistical tests, including tests for a sample mean and for a difference between proportions.'
				]
			},
			{
				heading: 'The normal distribution and percentiles',
				paragraphs: [
					'A normal distribution is a bell-shaped curve that is symmetrical around the mean. Many natural measurements, such as heights and measurement errors, are roughly normal. The curve is fully described by its mean and standard deviation.',
					'Also, the percentile is the share of values below a given point. Because the curve is symmetrical, a z-score of 0 is at the 50th percentile. A z-score of +1.645 is at about the 95th percentile, and −1.645 is at about the 5th.',
					'Between z = −1 and z = 1, about 68.27% of values fall. Between −2 and 2, about 95.45% fall. These shares are why a z-score beyond ±3 is rare for normal data.'
				],
				table: {
					caption: 'Common z-scores and their percentiles',
					columns: ['Z-score', 'Percentile (below)', 'Share above'],
					rows: [
						['−2', 'about 2.28%', 'about 97.72%'],
						['−1', 'about 15.87%', 'about 84.13%'],
						['0', '50%', '50%'],
						['1', 'about 84.13%', 'about 15.87%'],
						['1.645', 'about 95%', 'about 5%'],
						['2', 'about 97.72%', 'about 2.28%']
					]
				}
			},
			{
				heading: 'When the z-score is useful',
				paragraphs: [
					'For example, use a z-score when you want to compare a value with its group. A runner may finish faster than most of the field in one race and slower than most in another. The z-score for each race shows where the runner stands within that race.',
					'It is also used for quality control, so a factory can check parts. A factory checks whether a part measures within a set number of standard deviations of the target. For a related idea that estimates a range around a sample mean, see the [confidence interval calculator](/confidence-interval-calculator).',
					'However, the z-score only works well when the data is roughly normal. For skewed data, such as incomes, a percentile from the real data is often more accurate than a normal-curve estimate.'
				]
			},
			{
				heading: 'Tips for correct z-scores',
				paragraphs: ['Most z-score errors come from mixing up the mean and the standard deviation. Keep these points in mind:'],
				list: [
					'**Check the standard deviation.** It must be above zero, and it must use the same units as the value.',
					'**Use the right mean.** Use the mean of the group you compare with, not the mean of a different group.',
					'**Read the sign.** A negative z-score is below the mean, so the sign matters.',
					'**Start with the standard deviation.** If you are unsure of it, the [standard deviation calculator](/standard-deviation-calculator) can compute it from your data.',
					'**Compare p-values with care.** A z-score can feed a [p-value calculator](/p-value-calculator), but the test must match your question.'
				]
			}
		],
		formulas: [
			{
				title: 'Z-score from a value',
				expression: 'z = (x − μ) ÷ σ',
				variables: [
					{ symbol: 'x', meaning: 'the value you are checking' },
					{ symbol: 'μ', meaning: 'the mean of the distribution' },
					{ symbol: 'σ', meaning: 'the standard deviation' }
				]
			},
			{
				title: 'Value from a percentile',
				expression: 'x = μ + z × σ, where z = Φ⁻¹(p)',
				variables: [
					{ symbol: 'p', meaning: 'the percentile as a share, such as 0.95 for the 95th percentile' },
					{ symbol: 'Φ⁻¹', meaning: 'the inverse of the standard normal cumulative distribution' }
				]
			},
			{
				title: 'Share below a z-score',
				expression: 'P(Z ≤ z) = Φ(z)',
				variables: [{ symbol: 'Φ', meaning: 'the cumulative distribution of the standard normal curve' }]
			}
		],
		example: {
			title: 'A value of 85 with mean 100 and standard deviation 15',
			steps: [
				'z-score: (85 − 100) ÷ 15 = −1.',
				'Percentile: Φ(−1) = 0.158655, which is 15.8655%.',
				'Share above: P(X > 85) = 1 − 0.158655 = 84.1345%.'
			],
			result: 'The z-score is −1. About 15.8655% of values fall below 85, and 84.1345% fall above it.'
		},
		faq: [
			{
				q: 'How do I calculate a z-score?',
				a: 'Subtract the mean from the value, then divide by the standard deviation. For a value of 85 with mean 100 and standard deviation 15, the z-score is (85 − 100) ÷ 15 = −1.'
			},
			{
				q: 'What z-score is the 95th percentile?',
				a: 'About 1.645 for a one-sided 95% percentile. The value is 1.96 for a two-sided 95% range, which leaves 2.5% in each tail. Check which one your problem uses.'
			},
			{
				q: 'Is a z-score the same as a percentile?',
				a: 'No. The z-score is a distance in standard deviations. The percentile is the share of values below that point. For normal data, each z-score maps to one percentile, so you can convert between them.'
			},
			{
				q: 'Can I use a z-score for data that is not normal?',
				a: 'You can calculate the number, but the percentile from the normal curve may be wrong. For skewed or unusual data, look at the actual share of values, or use a method that does not assume a normal shape.'
			}
		],
		sources: [
			{ title: 'NIST/SEMATECH e-Handbook of Statistical Methods', url: 'https://www.itl.nist.gov/div898/handbook/' },
			{ title: 'Wolfram MathWorld: Normal Distribution', url: 'https://mathworld.wolfram.com/NormalDistribution.html' }
		]
	}
});
