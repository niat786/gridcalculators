import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './confidence-interval-calculator.meta';

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

/** Log of the gamma function: Stirling's series after shifting x up to at least 20. */
function lnGamma(x: number): number {
	let acc = 0;
	let y = x;
	while (y < 20) {
		acc += Math.log(y);
		y += 1;
	}
	const y2 = y * y;
	const series = 1 / (12 * y) - 1 / (360 * y * y2) + 1 / (1260 * y * y2 * y2) - 1 / (1680 * y * y2 * y2 * y2);
	return (y - 0.5) * Math.log(y) - y + 0.5 * Math.log(2 * Math.PI) + series - acc;
}

/** Continued fraction for the incomplete beta function (modified Lentz method). */
function betacf(a: number, b: number, x: number): number {
	const FPMIN = 1e-300;
	const qab = a + b;
	const qap = a + 1;
	const qam = a - 1;
	let c = 1;
	let d = 1 - (qab * x) / qap;
	if (Math.abs(d) < FPMIN) d = FPMIN;
	d = 1 / d;
	let h = d;
	for (let m = 1; m <= 1000; m++) {
		const m2 = 2 * m;
		let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
		d = 1 + aa * d;
		if (Math.abs(d) < FPMIN) d = FPMIN;
		c = 1 + aa / c;
		if (Math.abs(c) < FPMIN) c = FPMIN;
		d = 1 / d;
		h *= d * c;
		aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
		d = 1 + aa * d;
		if (Math.abs(d) < FPMIN) d = FPMIN;
		c = 1 + aa / c;
		if (Math.abs(c) < FPMIN) c = FPMIN;
		d = 1 / d;
		const del = d * c;
		h *= del;
		if (Math.abs(del - 1) < 1e-15) break;
	}
	return h;
}

/** Regularized incomplete beta function I_x(a, b). */
function betaInc(x: number, a: number, b: number): number {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
	if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
	return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Student t CDF with df degrees of freedom, through the incomplete beta function. */
function tCdf(t: number, df: number): number {
	const x = df / (df + t * t);
	const tail = 0.5 * betaInc(x, df / 2, 0.5);
	return t >= 0 ? 1 - tail : tail;
}

/** Inverse Student t, T⁻¹(p; df), by bisection on tCdf. */
function tInv(p: number, df: number): number {
	let lo = 0;
	let hi = 1e4;
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		if (tCdf(mid, df) < p) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
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
		{ id: 'mean', label: 'Sample mean', type: 'number', default: 50, help: 'The average of your sample.' },
		{
			id: 'sd',
			label: 'Sample standard deviation',
			type: 'number',
			default: 12,
			min: 0,
			help: 'The spread of your sample, from the sample standard deviation.'
		},
		{
			id: 'n',
			label: 'Sample size (n)',
			type: 'number',
			default: 25,
			min: 2,
			max: 1000000,
			decimal: false,
			help: 'How many values are in the sample.'
		},
		{
			id: 'level',
			label: 'Confidence level',
			type: 'select',
			display: 'menu',
			default: '95',
			options: LEVELS
		}
	],
	calculate(v: InputValues): CalculationResult {
		const mean = Number(v.mean);
		const sd = Number(v.sd);
		const n = Number(v.n);
		const level = Number(v.level) / 100;
		if (!Number.isFinite(mean) || !Number.isFinite(sd) || sd < 0) {
			return fail('Enter a sample mean and a standard deviation of 0 or more.');
		}
		if (!Number.isInteger(n) || n < 2) return fail('The sample size must be a whole number of at least 2.');
		if (!(level > 0 && level < 1)) return fail('Pick a confidence level.');

		const z = normInv((1 + level) / 2);
		const se = sd / Math.sqrt(n);
		const margin = z * se;
		const lo = mean - margin;
		const hi = mean + margin;
		const levelText = num(level * 100, 1);

		const metrics = [
			{ label: 'Critical z', value: num(z, 6) },
			{ label: 'Standard error (s ÷ √n)', value: num(se, 6) },
			{ label: 'Margin of error', value: num(margin, 6) },
			{ label: 'Lower limit', value: num(lo, 6) },
			{ label: 'Upper limit', value: num(hi, 6) }
		];
		if (n < 30) {
			// Small samples: the t interval is the standard answer, so it becomes the headline.
			const t = tInv((1 + level) / 2, n - 1);
			const tMargin = t * se;
			return {
				primaryResult: `${num(mean - tMargin, 4)} to ${num(mean + tMargin, 4)}`,
				primaryLabel: `${levelText}% confidence interval (t, df = ${n - 1})`,
				summary: `t interval for a small sample: margin ${num(tMargin, 4)} = ${num(t, 4)} × ${num(sd, 4)} ÷ √${num(n, 0)}.`,
				secondaryMetrics: [
					{ label: 'Critical t (df = n − 1)', value: num(t, 6) },
					{ label: 'Standard error (s ÷ √n)', value: num(se, 6) },
					{ label: 'Margin of error (t)', value: num(tMargin, 6) },
					{ label: 'Lower limit', value: num(mean - tMargin, 6) },
					{ label: 'Upper limit', value: num(mean + tMargin, 6) },
					{ label: 'z interval, for comparison', value: `${num(lo, 6)} to ${num(hi, 6)}` }
				]
			};
		}

		return {
			primaryResult: `${num(lo, 4)} to ${num(hi, 4)}`,
			primaryLabel: `${levelText}% confidence interval (z)`,
			summary: `Z interval: margin of error ${num(margin, 4)} = ${num(z, 4)} × ${num(sd, 4)} ÷ √${num(n, 0)}.`,
			secondaryMetrics: metrics
		};
	},
	content: {
		intro:
			'This confidence interval calculator gives a range of values likely to contain the true population mean. Enter your sample mean, standard deviation and sample size, choose a confidence level, and read the lower and upper limits.',
		howTo: [
			'Enter the sample mean, which is the average of your sample.',
			'Enter the sample standard deviation and the sample size, n.',
			'Choose a confidence level, such as 95%.',
			'Read the lower and upper limits. For samples under 30, the calculator uses a t interval and shows the z interval for comparison.'
		],
		about: [
			{
				heading: 'What is a confidence interval?',
				paragraphs: [
					'A confidence interval is a range of values built from a sample. It estimates a value you cannot measure directly, such as the average height of every adult in a country. The range is centred on your sample mean.',
					'The confidence level, such as 95%, describes the method. If you took many random samples and built an interval from each, about 95% of those intervals would contain the true mean. Any single interval either contains it or does not.',
					'A wider interval means more uncertainty. A higher confidence level makes the interval wider, because you want a better chance of catching the true value.'
				]
			},
			{
				heading: 'How the margin of error is found',
				paragraphs: [
					'The margin of error is the amount added and subtracted from the sample mean. It is the critical value times the standard error. The standard error is the sample standard deviation divided by the square root of n.',
					'The critical value depends on the confidence level. For 95%, the z value is about 1.96. This is why the calculator shows the critical z in the working. As a result, a 99% interval uses a larger z and is wider than a 95% interval from the same data.',
					'The square root of n means that more data makes the interval narrower, but only slowly. To cut the margin of error in half, you need about four times as many values.'
				],
				table: {
					caption: 'Critical z values for common confidence levels',
					columns: ['Confidence level', 'Critical z (two-sided)'],
					rows: [
						['90%', '1.645'],
						['95%', '1.960'],
						['98%', '2.326'],
						['99%', '2.576']
					]
				}
			},
			{
				heading: 'When to use a t interval',
				paragraphs: [
					'The z value assumes you know the true standard deviation of the population. In practice, you usually estimate it from the sample. When the sample is small, that estimate is less reliable, so the t distribution gives a wider, more honest interval.',
					'For this reason, the calculator switches to a t interval when n is below 30. It uses n − 1 degrees of freedom for the critical value. For larger samples, the difference between t and z becomes small, so the z interval is a good estimate.',
					'Either way, the method assumes random sampling. If the sample is biased, a narrow interval can still miss the true mean. A careful study design matters more than any formula.'
				]
			},
			{
				heading: 'Tips for using confidence intervals',
				paragraphs: ['Confidence intervals are easy to misread. Keep these points in mind when you report one:'],
				list: [
					'**Describe the method, not the chance.** Say “this method captures the true mean 95% of the time”, rather than “there is a 95% chance the mean is in this range”.',
					'**Report the level.** Always say which confidence level you used.',
					'**Check the standard deviation.** If you are unsure of it, the [standard deviation calculator](/standard-deviation-calculator) can compute it from your data.',
					'**Plan the sample size first.** If the margin is too wide, the [sample size calculator](/sample-size-calculator) shows how many values you need.',
					'**Use the z-score for context.** To see how far a single value is from the mean, try the [z-score calculator](/z-score-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Standard error',
				expression: 'SE = s ÷ √n',
				variables: [
					{ symbol: 's', meaning: 'the sample standard deviation' },
					{ symbol: 'n', meaning: 'the sample size' }
				]
			},
			{
				title: 'Margin of error and interval',
				expression: 'Margin = z × SE,   Interval = x̄ ± z × SE',
				variables: [
					{ symbol: 'x̄', meaning: 'the sample mean' },
					{ symbol: 'z', meaning: 'the critical z value for the confidence level, such as 1.96 for 95%' }
				]
			},
			{
				title: 't interval (n below 30)',
				expression: 'Interval = x̄ ± t × SE, with n − 1 degrees of freedom',
				variables: [{ symbol: 't', meaning: 'the critical value from the t distribution' }]
			}
		],
		example: {
			title: 'Mean 50, standard deviation 12, sample size 100, 95% confidence',
			steps: [
				'Standard error: 12 ÷ √100 = 1.2.',
				'Margin of error: 1.959964 × 1.2 = 2.351957.',
				'Interval: 50 ± 2.351957, from 47.648043 to 52.351957.'
			],
			result: 'The 95% confidence interval for the mean is 47.648 to 52.352. With only 25 values, the t interval (45.0466 to 54.9534) is used instead.'
		},
		faq: [
			{
				q: 'How do I calculate a confidence interval?',
				a: 'Divide the standard deviation by the square root of n to get the standard error. Multiply it by the critical value for your level, then add and subtract the result from the mean.'
			},
			{
				q: 'What does a 95% confidence interval mean?',
				a: 'It means the method captures the true mean in about 95% of repeated samples. It does not mean there is a 95% chance that this one interval contains the mean.'
			},
			{
				q: 'Why does a higher confidence level give a wider interval?',
				a: 'To be more sure of catching the true value, the interval must cover a wider range. A 99% interval uses a larger critical value than a 95% interval, so it is wider.'
			},
			{
				q: 'When should I use the t interval?',
				a: 'Use it when the sample is small, usually under 30, and you estimate the standard deviation from the same sample. The calculator switches to it automatically for those samples.'
			},
			{
				q: 'What sample size do I need for a narrow interval?',
				a: 'It depends on how much spread the data has and how narrow you want the margin. Because the margin shrinks with the square root of n, doubling your precision needs about four times as many values.'
			}
		],
		sources: [
			{ title: 'NIST/SEMATECH e-Handbook of Statistical Methods', url: 'https://www.itl.nist.gov/div898/handbook/' },
			{ title: 'Wolfram MathWorld: Confidence Interval', url: 'https://mathworld.wolfram.com/ConfidenceInterval.html' }
		]
	}
});
