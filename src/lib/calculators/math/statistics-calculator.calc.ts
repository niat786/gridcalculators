import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './statistics-calculator.meta';

/** Median of an already sorted array. */
function medianSorted(xs: number[]): number {
	const n = xs.length;
	const mid = Math.floor(n / 2);
	return n % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

/**
 * Inclusive median-of-halves quartiles. The lower half is the first ⌈n ÷ 2⌉ sorted values and the
 * upper half is the last ⌈n ÷ 2⌉ values. When n is odd the median sits in both halves.
 * Q1 is the median of the lower half and Q3 is the median of the upper half.
 */
function quartiles(sorted: number[]): { q1: number; q3: number } {
	const n = sorted.length;
	const lower = sorted.slice(0, Math.ceil(n / 2));
	const upper = sorted.slice(Math.floor(n / 2));
	return { q1: medianSorted(lower), q3: medianSorted(upper) };
}

/** Most common value(s). Returns null when every value occurs once. */
function modes(xs: number[]): number[] | null {
	const counts = new Map<number, number>();
	for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
	let best = 0;
	for (const c of counts.values()) best = Math.max(best, c);
	if (best <= 1) return null;
	return [...counts.entries()]
		.filter(([, c]) => c === best)
		.map(([x]) => x)
		.sort((a, b) => a - b);
}

const fmt = (x: number): string => (Number.isFinite(x) ? num(x, 6) : DASH);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'values',
			label: 'Numbers',
			type: 'list',
			default: '4, 8, 15, 16, 23, 42',
			minCount: 1,
			maxCount: 10000,
			placeholder: 'e.g. 4, 8, 15, 16',
			help: 'Separate the numbers with commas or spaces.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		const label = 'Mean';
		if (xs.some((x) => !Number.isFinite(x))) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter numbers only, separated by commas.' };
		}
		const n = xs.length;
		if (n === 0) return { primaryResult: DASH, primaryLabel: label, summary: 'Enter at least one number.' };

		const sorted = [...xs].sort((a, b) => a - b);
		const sum = sorted.reduce((acc, x) => acc + x, 0);
		const mean = sum / n;
		const median = medianSorted(sorted);
		const mode = modes(sorted);
		const min = sorted[0];
		const max = sorted[n - 1];
		const range = max - min;
		const { q1, q3 } = quartiles(sorted);
		const iqr = q3 - q1;

		const squares = sorted.reduce((acc, x) => acc + (x - mean) ** 2, 0);
		const popVar = squares / n;
		const popSd = Math.sqrt(popVar);
		const sampleVar = n >= 2 ? squares / (n - 1) : NaN;
		const sampleSd = Math.sqrt(sampleVar);
		const sem = n >= 2 ? sampleSd / Math.sqrt(n) : NaN;

		// Adjusted Fisher–Pearson sample skewness G1 and sample excess kurtosis G2 (the Excel SKEW and KURT forms).
		let m3 = 0;
		let m4 = 0;
		for (const x of sorted) {
			const d = x - mean;
			m3 += d ** 3;
			m4 += d ** 4;
		}
		m3 /= n;
		m4 /= n;
		const skew =
			n >= 3 && popVar > 0 ? ((m3 / popVar ** 1.5) * Math.sqrt(n * (n - 1))) / (n - 2) : NaN;
		const kurt =
			n >= 4 && popVar > 0
				? ((n + 1) * (m4 / (popVar * popVar) - 3) + 6) * ((n - 1) / ((n - 2) * (n - 3)))
				: NaN;

		const modeText = mode === null ? 'None (every value occurs once)' : mode.map((x) => num(x, 6)).join(', ');
		const rows: Record<string, string>[] = [
			{ measure: 'Count (n)', value: num(n, 0) },
			{ measure: 'Sum', value: fmt(sum) },
			{ measure: 'Mean', value: fmt(mean) },
			{ measure: 'Median', value: fmt(median) },
			{ measure: 'Mode', value: modeText },
			{ measure: 'Minimum', value: fmt(min) },
			{ measure: 'Maximum', value: fmt(max) },
			{ measure: 'Range (max − min)', value: fmt(range) },
			{ measure: 'Q1 (lower quartile)', value: fmt(q1) },
			{ measure: 'Q3 (upper quartile)', value: fmt(q3) },
			{ measure: 'Interquartile range (Q3 − Q1)', value: fmt(iqr) },
			{ measure: 'Sample variance (n − 1)', value: fmt(sampleVar) },
			{ measure: 'Sample standard deviation', value: fmt(sampleSd) },
			{ measure: 'Population variance (n)', value: fmt(popVar) },
			{ measure: 'Population standard deviation', value: fmt(popSd) },
			{ measure: 'Standard error of the mean', value: fmt(sem) },
			{ measure: 'Skewness (sample, adjusted)', value: fmt(skew) },
			{ measure: 'Excess kurtosis (sample, adjusted)', value: fmt(kurt) }
		];
		const table: Table = {
			title: 'All statistics (quartiles by the inclusive median-of-halves method)',
			columns: [
				{ key: 'measure', label: 'Measure' },
				{ key: 'value', label: 'Value', align: 'end' }
			],
			rows
		};

		return {
			primaryResult: fmt(mean),
			primaryLabel: label,
			summary: `Sum ${fmt(sum)} ÷ count ${num(n, 0)} = mean. Skewness and kurtosis need at least 3 and 4 values.`,
			secondaryMetrics: [
				{ label: 'Median', value: fmt(median) },
				{ label: 'Sample standard deviation', value: fmt(sampleSd) },
				{ label: 'Count', value: num(n, 0) },
				{ label: 'Range', value: fmt(range) }
			],
			table
		};
	},
	content: {
		intro:
			'This statistics calculator summarises a list of numbers in one go. It gives the mean, median, mode, range, quartiles, spread, skewness and kurtosis, so you can describe your data before you analyse it.',
		howTo: [
			'Type your numbers, separated by commas or spaces.',
			'Read the mean, median and sample standard deviation in the result cards.',
			'Open the full table to see the mode, quartiles, interquartile range, skewness and kurtosis.'
		],
		about: [
			{
				heading: 'Which summary should I use?',
				paragraphs: [
					'A summary statistic describes a whole list with one number. Measures of centre say where the middle of the data is. Measures of spread say how far the values range around that centre.',
					'The mean and median are the two main measures of centre. The mean is the average, and the median is the middle value when the numbers are sorted. When a few extreme values pull the mean away, the median is often the better guide.',
					'Also, the range, interquartile range and standard deviation measure spread. The range is simply the largest value minus the smallest. The interquartile range covers the middle half of the data, so a few outliers do not affect it much.'
				]
			},
			{
				heading: 'Mean, median and mode',
				paragraphs: [
					'The mean is the sum of all the values divided by the count. For the numbers 4, 8, 15, 16, 23 and 42, the sum is 108 and the mean is 18.',
					'The median is, in short, the middle value after sorting. With an even count, it is the average of the two middle values. For the same six numbers, the middle pair is 15 and 16, so the median is 15.5.',
					'For example, the mode is the value that occurs most often. A list can have no mode, one mode, or several. If every value occurs once, the calculator reports that there is no mode.'
				]
			},
			{
				heading: 'Spread, skewness and kurtosis',
				paragraphs: [
					'The standard deviation measures the typical distance from the mean. The calculator reports the sample version, which divides by n − 1, so it suits a sample. The [standard deviation calculator](/standard-deviation-calculator) shows each step of that calculation.',
					'Skewness measures how lopsided the data is. A value near zero suggests the data is roughly symmetrical. A positive value means a longer tail on the right, as with incomes, where a few high earners stretch the scale.',
					'Excess kurtosis describes how heavy the tails are compared with a normal curve. A value near zero matches a normal curve. Higher values mean more extreme values than a normal curve would produce.'
				],
				table: {
					caption: 'Reading the main summary values',
					columns: ['Measure', 'What it tells you', 'Use it when'],
					rows: [
						['Mean', 'The average value', 'The data is roughly symmetrical'],
						['Median', 'The middle value', 'There are outliers or skew'],
						['Mode', 'The most common value', 'Counting categories or repeats'],
						['Standard deviation', 'Typical distance from the mean', 'You need a spread for normal-like data'],
						['Interquartile range', 'Spread of the middle half', 'You want a spread that resists outliers']
					]
				}
			},
			{
				heading: 'Tips for summarising data',
				paragraphs: ['Summaries can hide problems, so look at the raw numbers as well. These habits help:'],
				list: [
					'**Check for typing errors.** A misplaced decimal point changes the mean and the spread a lot.',
					'**Compare mean and median.** A large gap between them suggests skew or outliers.',
					'**Use the simple version for quick work.** The [mean, median, mode and range calculator](/mean-median-mode-range-calculator) is a faster choice for a basic summary.',
					'**Plan the next step.** To judge how unusual one value is, use the [z-score calculator](/z-score-calculator). To estimate a range for the mean, use the [confidence interval calculator](/confidence-interval-calculator).',
					'**Do not over-read small samples.** Skewness and kurtosis are unstable with only a few values.'
				]
			}
		],
		formulas: [
			{
				title: 'Mean',
				expression: 'x̄ = (x₁ + x₂ + … + xₙ) ÷ n',
				variables: [{ symbol: 'x̄', meaning: 'the mean, or average' }]
			},
			{
				title: 'Median',
				expression: 'Middle value of the sorted list, or the average of the two middle values when n is even',
				variables: []
			},
			{
				title: 'Sample standard deviation',
				expression: 's = √(Σ(xᵢ − x̄)² ÷ (n − 1))',
				variables: [{ symbol: 'Σ', meaning: 'add up over all the values' }]
			},
			{
				title: 'Interquartile range',
				expression: 'IQR = Q3 − Q1',
				variables: [
					{ symbol: 'Q1', meaning: 'the lower quartile, the value below which a quarter of the data lies' },
					{ symbol: 'Q3', meaning: 'the upper quartile, the value above which a quarter of the data lies' }
				]
			}
		],
		example: {
			title: 'Mean of 4, 8, 15, 16, 23, 42',
			steps: [
				'Sum: 4 + 8 + 15 + 16 + 23 + 42 = 108.',
				'Mean: 108 ÷ 6 = 18.',
				'Median: (15 + 16) ÷ 2 = 15.5.',
				'Sample variance: 910 ÷ 5 = 182, so the sample standard deviation is 13.490738.'
			],
			result: 'The mean is 18. The median is 15.5, the sample standard deviation is 13.490738, and the skewness is 1.242611.'
		},
		faq: [
			{
				q: 'What is the difference between mean and median?',
				a: 'The mean is the average, found by adding all values and dividing by the count. The median is the middle value. Extreme values pull the mean much more than the median.'
			},
			{
				q: 'What is the difference between sample and population standard deviation?',
				a: 'Use the population version when your list is every member of the group. Use the sample version when the list is a subset, because dividing by n − 1 gives a better estimate of the spread.'
			},
			{
				q: 'What does a skewness of zero mean?',
				a: 'It means the data is symmetrical around its mean, in a rough sense. Values on each side are balanced. Real data is rarely exactly zero, so a value close to zero is what you want to see.'
			},
			{
				q: 'What is a mode if every number is different?',
				a: 'There is no mode when every value occurs only once. The calculator reports that, rather than picking one value at random.'
			},
			{
				q: 'Why do quartiles sometimes differ between tools?',
				a: 'Different software uses different rules to split the data into quarters, especially for small lists. The results can differ slightly, so state the method when you report them.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Skewness', url: 'https://mathworld.wolfram.com/Skewness.html' },
			{ title: 'Wolfram MathWorld: Kurtosis', url: 'https://mathworld.wolfram.com/Kurtosis.html' }
		]
	}
});
