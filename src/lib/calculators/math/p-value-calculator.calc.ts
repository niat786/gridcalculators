import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './p-value-calculator.meta';

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'P-value', summary });

/** Standard normal density, φ(t). */
const phi = (t: number): number => Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI);

/**
 * Upper tail P(Z > t) for t ≥ 0. Below 4 it uses the power series
 * Φ(t) − ½ = φ(t) · Σ t²ⁿ⁺¹ ÷ (1·3·…·(2n+1)); above 4 it uses Laplace's continued fraction.
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

/** Standard normal CDF, Φ(z) = P(Z ≤ z). */
function normCdf(z: number): number {
	return z >= 0 ? 1 - upperTail(z) : upperTail(-z);
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

/** Continued fraction for the incomplete beta function (modified Lentz method, Numerical Recipes betacf). */
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

/** Regularized incomplete beta function I_x(a, b) (Numerical Recipes betai). */
function betaInc(x: number, a: number, b: number): number {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
	if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
	return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Power series for the regularized lower incomplete gamma P(a, x), used when x < a + 1. */
function gammaSeries(a: number, x: number): number {
	let ap = a;
	let del = 1 / a;
	let sum = del;
	for (let n = 0; n < 1000; n++) {
		ap += 1;
		del *= x / ap;
		sum += del;
		if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
	}
	return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** Continued fraction for the regularized upper incomplete gamma Q(a, x), used when x ≥ a + 1. */
function gammaCF(a: number, x: number): number {
	const FPMIN = 1e-300;
	let b = x + 1 - a;
	let c = 1 / FPMIN;
	let d = 1 / b;
	let h = d;
	for (let i = 1; i <= 1000; i++) {
		const an = -i * (i - a);
		b += 2;
		d = an * d + b;
		if (Math.abs(d) < FPMIN) d = FPMIN;
		c = b + an / c;
		if (Math.abs(c) < FPMIN) c = FPMIN;
		d = 1 / d;
		const del = d * c;
		h *= del;
		if (Math.abs(del - 1) < 1e-16) break;
	}
	return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Regularized incomplete gamma: returns the lower P(a, x) and upper Q(a, x) = 1 − P. */
function gammaPQ(a: number, x: number): { p: number; q: number } {
	if (x <= 0) return { p: 0, q: 1 };
	if (x < a + 1) {
		const p = gammaSeries(a, x);
		return { p, q: 1 - p };
	}
	const q = gammaCF(a, x);
	return { p: 1 - q, q };
}

type Tail = 'left' | 'right' | 'two';

const TAIL_NAME: Record<Tail, string> = { left: 'Left-tailed', right: 'Right-tailed', two: 'Two-tailed' };

/** Small p-values keep their scale in scientific notation so they never show as 0. */
const fmtP = (p: number): string => (p > 0 && p < 0.0001 ? p.toExponential(3) : num(p, 6));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'type',
			label: 'Test statistic',
			type: 'select',
			display: 'segmented',
			default: 'z',
			options: [
				{ label: 'z', value: 'z' },
				{ label: 't', value: 't' },
				{ label: 'Chi-square', value: 'chi2' },
				{ label: 'F', value: 'f' }
			]
		},
		{
			id: 'stat',
			label: 'Test statistic value',
			type: 'number',
			default: 1.96,
			help: 'Chi-square and F values must be 0 or more.'
		},
		{
			id: 'df',
			label: 'Degrees of freedom',
			type: 'number',
			default: 10,
			min: 0.01,
			decimal: true,
			visibleWhen: (v: InputValues) => v.type === 't' || v.type === 'chi2'
		},
		{
			id: 'df1',
			label: 'Numerator degrees of freedom (df1)',
			type: 'number',
			default: 1,
			min: 1,
			decimal: false,
			visibleWhen: (v: InputValues) => v.type === 'f'
		},
		{
			id: 'df2',
			label: 'Denominator degrees of freedom (df2)',
			type: 'number',
			default: 10,
			min: 1,
			decimal: false,
			visibleWhen: (v: InputValues) => v.type === 'f'
		},
		{
			id: 'tail',
			label: 'Tail',
			type: 'select',
			display: 'segmented',
			default: 'right',
			options: [
				{ label: 'Left', value: 'left' },
				{ label: 'Right', value: 'right' },
				{ label: 'Two-tailed', value: 'two' }
			],
			help: 'Two-tailed applies to z and t only.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const type = String(v.type);
		const x = Number(v.stat);
		const tail = String(v.tail) as Tail;
		const df = Number(v.df);
		const df1 = Number(v.df1);
		const df2 = Number(v.df2);

		if (!Number.isFinite(x)) return fail('Enter a test statistic value.');
		if (!(tail in TAIL_NAME) || !['z', 't', 'chi2', 'f'].includes(type)) return fail('Choose a test and a tail.');
		if ((type === 'chi2' || type === 'f') && tail === 'two') {
			return fail('Two-tailed p-values do not apply to chi-square or F tests. Choose left or right.');
		}

		let p: number;
		let distribution: string;
		if (type === 'z') {
			distribution = 'standard normal (z)';
			const left = normCdf(x);
			const right = normCdf(-x);
			p = tail === 'left' ? left : tail === 'right' ? right : Math.min(1, 2 * normCdf(-Math.abs(x)));
		} else if (type === 't') {
			if (!(df > 0)) return fail('Enter degrees of freedom above 0.');
			distribution = `Student t, df = ${num(df, 4)}`;
			// I = P(|T| > |t|); each side of the tail is half of it.
			const twoSided = Math.min(1, betaInc(df / (df + x * x), df / 2, 0.5));
			const half = 0.5 * twoSided;
			const left = x <= 0 ? half : 1 - half;
			const right = x >= 0 ? half : 1 - half;
			p = tail === 'left' ? left : tail === 'right' ? right : twoSided;
		} else if (type === 'chi2') {
			if (x < 0) return fail('A chi-square value cannot be negative.');
			if (!(df > 0)) return fail('Enter degrees of freedom above 0.');
			distribution = `Chi-square, df = ${num(df, 4)}`;
			const { p: lower, q: upper } = gammaPQ(df / 2, x / 2);
			p = tail === 'left' ? lower : upper;
		} else {
			if (x < 0) return fail('An F value cannot be negative.');
			if (!(df1 >= 1 && df2 >= 1)) return fail('Enter both degrees of freedom as 1 or more.');
			distribution = `F, df1 = ${num(df1, 0)}, df2 = ${num(df2, 0)}`;
			// Upper tail P(F > f) = I(df2 ÷ (df2 + df1·f); df2/2, df1/2); lower tail is its complement.
			const upper = betaInc(df2 / (df2 + df1 * x), df2 / 2, df1 / 2);
			const lower = betaInc((df1 * x) / (df1 * x + df2), df1 / 2, df2 / 2);
			p = tail === 'left' ? lower : upper;
		}
		p = Math.min(1, Math.max(0, p));

		const sig05 = p < 0.05;
		const sig01 = p < 0.01;
		const verdict = sig01
			? 'Below 0.01, so the result is significant at both α = 0.05 and α = 0.01.'
			: sig05
				? 'Below 0.05 but not below 0.01, so the result is significant at α = 0.05 only.'
				: 'Not below 0.05, so the result is not significant at α = 0.05 or α = 0.01.';

		return {
			primaryResult: fmtP(p),
			primaryLabel: `P-value, ${TAIL_NAME[tail].toLowerCase()}`,
			summary: `${TAIL_NAME[tail]} p-value for the ${distribution} distribution. ${verdict}`,
			secondaryMetrics: [
				{ label: 'Significant at α = 0.05', value: sig05 ? 'Yes' : 'No' },
				{ label: 'Significant at α = 0.01', value: sig01 ? 'Yes' : 'No' },
				{ label: 'Distribution', value: distribution }
			]
		};
	},
	content: {
		intro:
			'This p-value calculator turns a test statistic into a p-value. Choose a z, t, chi-square or F statistic, enter its value and degrees of freedom, pick the tail of the test, and read the probability and whether it passes common significance levels.',
		howTo: [
			'Choose the test statistic you calculated: z, t, chi-square or F.',
			'Enter the test statistic value. For t, chi-square and F, also enter the degrees of freedom.',
			'Pick the tail: left, right or two-tailed. Use the tail that matches the question your test asks.',
			'Read the p-value, then compare it with your significance level, such as 0.05.'
		],
		about: [
			{
				heading: 'What is a p-value?',
				paragraphs: [
					'A p-value is the probability of seeing data at least as extreme as yours, if a null hypothesis were true. The null hypothesis is the default claim, such as “this drug has no effect”. The p-value measures how surprising your result would be under that claim.',
					'A small p-value means the result would be unlikely if the null hypothesis were true. A large p-value means the data fits the null hypothesis well enough. It does not prove the null hypothesis is true.',
					'The p-value is not the probability that the null hypothesis is true. That is a common mistake. It is a statement about the data, given the null hypothesis, not a statement about the hypothesis itself.'
				]
			},
			{
				heading: 'Which test statistic and tail to use',
				paragraphs: [
					'The statistic depends on your test. A z statistic is used for large samples or when the population spread is known. A t statistic is used for means with a small sample. A chi-square statistic is used for counts and tables, and an F statistic compares variances or models.',
					'The tail depends on your question. A two-tailed test asks whether the value is different in either direction. A right-tailed test asks whether it is larger, and a left-tailed test asks whether it is smaller. Choose the tail before you look at the data, to avoid bias.',
					'For a two-sided test with a t statistic, the p-value is twice the area in the tail beyond the statistic. The calculator does this for you, using the correct distribution for your degrees of freedom.'
				],
				table: {
					caption: 'Common significance levels',
					columns: ['Significance level (α)', 'Typical use'],
					rows: [
						['0.10', 'Early or exploratory checks'],
						['0.05', 'The most common default in many fields'],
						['0.01', 'Stronger evidence required'],
						['0.001', 'Very strong evidence required']
					]
				}
			},
			{
				heading: 'Reading the result',
				paragraphs: [
					'Compare the p-value with the significance level you chose before the test. If the p-value is below it, the result is called statistically significant. If not, the data does not provide strong enough evidence against the null hypothesis.',
					'A result just above 0.05 is not the same as no effect. It means the evidence falls short of the threshold. The size of the effect, the sample size and the confidence interval often tell you more. To describe your data first, the [standard deviation calculator](/standard-deviation-calculator) gives its spread.',
					'The American Statistical Association warned that p-values should not be used alone to decide whether a finding matters. Report the p-value with the effect size, and be clear about how the test was planned.'
				]
			},
			{
				heading: 'Tips for using p-values',
				paragraphs: ['Good testing practice matters more than the number itself. These habits help:'],
				list: [
					'**Decide the test first.** Choose the statistic, tail and α before you see the result.',
					'**Check the degrees of freedom.** For a t test, this is usually the sample size minus one.',
					'**Report the exact value.** Write p = 0.032 rather than p < 0.05 when you can.',
					'**Look at the confidence interval too.** It shows the range of plausible effect sizes. The [confidence interval calculator](/confidence-interval-calculator) gives one for a mean.',
					'**Convert a z-score first.** If you have a value and a mean, the [z-score calculator](/z-score-calculator) turns it into a z statistic.'
				]
			}
		],
		formulas: [
			{
				title: 'Two-tailed p-value for a z statistic',
				expression: 'p = 2 × P(Z > |z|)',
				variables: [
					{ symbol: 'Z', meaning: 'a standard normal random variable' },
					{ symbol: '|z|', meaning: 'the absolute value of the test statistic' }
				]
			},
			{
				title: 't distribution',
				expression: 'p = P(T > |t|) × 2 for a two-tailed test, with df = n − 1 for a one-sample mean',
				variables: [{ symbol: 'df', meaning: 'degrees of freedom, which depend on the sample size and test design' }]
			},
			{
				title: 'Significance decision',
				expression: 'Significant if p < α',
				variables: [{ symbol: 'α', meaning: 'the significance level chosen before the test, such as 0.05' }]
			}
		],
		example: {
			title: 't = 2.228 with 10 degrees of freedom, two-tailed',
			steps: [
				'Compute x = df ÷ (df + t²) = 10 ÷ (10 + 4.964) = 0.668',
				'Evaluate the regularized incomplete beta I(0.668; 5, 0.5), which is about 0.050012',
				'The two-tailed p-value is that value, 0.050012'
			],
			result: 'p = 0.050012. This is just above 0.05, so the result is not significant at α = 0.05.'
		},
		faq: [
			{
				q: 'What is a p-value in simple words?',
				a: 'It is the chance of getting a result at least as extreme as yours if the null hypothesis were true. A small p-value suggests the data is unusual under that assumption.'
			},
			{
				q: 'Is a p-value of 0.05 significant?',
				a: 'It is significant at the 0.05 level only if the p-value is below 0.05. A value of exactly 0.05 is on the line, so many people report it as borderline. The threshold is a convention, not a fixed law.'
			},
			{
				q: 'What is the difference between one-tailed and two-tailed?',
				a: 'A one-tailed test checks for an effect in one direction. A two-tailed test checks both directions and is more cautious. Pick the one that matches your question before you run the test.'
			},
			{
				q: 'Does a p-value tell me how big the effect is?',
				a: 'No. A p-value depends on the sample size as well as the effect. Look at the size of the difference and its confidence interval to judge how important it is.'
			},
			{
				q: 'Why does this calculator ask for degrees of freedom?',
				a: 'The t, chi-square and F distributions change shape with the degrees of freedom, so the same statistic gives a different p-value for different sample sizes.'
			}
		],
		sources: [
			{
				title: 'Wasserstein and Lazar (2016), The ASA Statement on p-Values: Context, Process, and Purpose',
				url: 'https://www.tandfonline.com/doi/full/10.1080/00031305.2016.1154108'
			},
			{ title: 'NIST/SEMATECH e-Handbook of Statistical Methods', url: 'https://www.itl.nist.gov/div898/handbook/' }
		]
	}
});
