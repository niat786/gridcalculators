import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './standard-deviation-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'values',
			label: 'Numbers',
			type: 'list',
			default: '10, 2, 38, 23, 38, 23, 21',
			minCount: 2,
			placeholder: 'e.g. 4, 8, 15, 16',
			help: 'Separate the numbers with commas or spaces.'
		},
		{
			id: 'kind',
			label: 'Type of data',
			type: 'select',
			display: 'segmented',
			default: 'sample',
			options: [
				{ label: 'Sample (n − 1)', value: 'sample' },
				{ label: 'Population (n)', value: 'population' }
			],
			help: 'Use sample when your numbers are a subset of a larger group.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		const isSample = v.kind !== 'population';
		const label = isSample ? 'Standard deviation (sample)' : 'Standard deviation (population)';
		const n = xs.length;

		if (xs.some((x) => !Number.isFinite(x))) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter numbers only, separated by commas.' };
		}
		if (n === 0 || (isSample && n < 2)) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: isSample
					? 'A sample needs at least two numbers. Add one more, or choose population.'
					: 'Enter at least one number.'
			};
		}

		const sum = xs.reduce((acc, x) => acc + x, 0);
		const mean = sum / n;
		const squares = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0);
		const divisor = isSample ? n - 1 : n;
		const variance = squares / divisor;
		const sd = Math.sqrt(variance);
		// The standard error always uses the sample standard deviation, so it needs two or more numbers.
		const sem = n >= 2 ? Math.sqrt(squares / (n - 1)) / Math.sqrt(n) : NaN;

		return {
			primaryResult: num(sd, 6),
			primaryLabel: label,
			summary: `Sum of squared differences ${num(squares, 6)} ÷ ${isSample ? `(${n} − 1)` : n} = variance ${num(variance, 6)}, then take the square root.`,
			secondaryMetrics: [
				{ label: 'Variance', value: num(variance, 6) },
				{ label: 'Mean', value: num(mean, 6) },
				{ label: 'Count', value: num(n, 0) },
				{ label: 'Sum', value: num(sum, 6) },
				{ label: 'Standard error of the mean', value: num(sem, 6) }
			]
		};
	},
	content: {
		intro:
			'This standard deviation calculator measures how spread out a list of numbers is around its mean. Choose sample if your numbers are part of a larger group, or population if they are every value in the group.',
		howTo: [
			'Type your numbers, separated by commas or spaces. You need at least two for a sample.',
			'Choose Sample (n − 1) or Population (n).',
			'Read the standard deviation. The variance, mean, count, sum and standard error show the working below it.'
		],
		about: [
			{
				heading: 'What is standard deviation?',
				paragraphs: [
					'Standard deviation tells you how far a typical value sits from the mean, which is the average. A small standard deviation means the numbers cluster tightly around the mean. A large one means they are spread out.',
					'For example, two classes can have the same mean test score of 70. In one class, most scores are between 65 and 75. In the other, scores range from 40 to 100. The standard deviation shows that difference clearly.',
					'It is measured in the same units as your data, which makes it easy to read. Scores in points, heights in centimetres and prices in dollars all give a standard deviation in their own unit.'
				]
			},
			{
				heading: 'How the standard deviation is calculated',
				paragraphs: [
					'First, find the mean by adding the numbers and dividing by how many there are. Next, find how far each number is from the mean, square each difference, and add the squares together.',
					'Then divide the total by n for a population, or by n − 1 for a sample. This result is the variance. Finally, take the square root of the variance to get the standard deviation. Squaring and then taking the root keeps the answer in the original units.',
					'Dividing by n − 1 for a sample is called Bessel’s correction. A sample usually sits a little closer to its own mean than the full group does, so dividing by n − 1 gives a slightly larger, fairer estimate of the spread.'
				],
				table: {
					caption: 'Worked example: the numbers 1, 2, 3, 4, 5',
					columns: ['Step', 'Calculation', 'Result'],
					rows: [
						['Mean', '(1 + 2 + 3 + 4 + 5) ÷ 5', '3'],
						['Sum of squared differences', '4 + 1 + 0 + 1 + 4', '10'],
						['Sample variance', '10 ÷ (5 − 1)', '2.5'],
						['Sample standard deviation', '√2.5', '1.581139']
					]
				}
			},
			{
				heading: 'Sample, population and standard error',
				paragraphs: [
					'Use population when your list is every member of the group you care about, such as the scores of all students in one class. Use sample when your list is a subset, such as a survey of some of the people in a city.',
					'The standard error of the mean estimates how much the sample mean would vary between samples. It equals the sample standard deviation divided by the square root of n. Larger samples give a smaller standard error, which is why bigger studies give more reliable averages.',
					'If you want a range that is likely to contain the true mean, the [confidence interval calculator](/confidence-interval-calculator) builds one from the same ideas. To see how many values you need for a study, the [sample size calculator](/sample-size-calculator) helps.'
				]
			},
			{
				heading: 'Reading the result',
				paragraphs: [
					'For data that follows a bell-shaped normal curve, about 68% of values lie within one standard deviation of the mean, and about 95% lie within two. Many real datasets are close to this pattern, but not all of them are.',
					'To see how far one value is from the mean, in standard deviations, use the [z-score calculator](/z-score-calculator). Compare the spread of two datasets by their standard deviations, and always look at the mean too.'
				],
				list: [
					'**Compare like with like.** Standard deviations are only comparable when the units and the typical size of the data are similar.',
					'**Watch for outliers.** One extreme value can raise the standard deviation a lot.'
				]
			},
			{
				heading: 'Tips for accurate results',
				paragraphs: ['Mistakes usually come from the data entry or the choice of formula. These checks help:'],
				list: [
					'**Check every number.** A missing or extra value changes both the mean and the spread.',
					'**Pick the right type.** Use sample for a subset and population for the whole group.',
					'**Use the mean from the same list.** The calculator finds it for you, so do not average the results of different lists.',
					'**Read the working.** Check the sum of squares and the count, then compare them with a quick mental estimate.',
					'**Use the average tool for the mean alone.** The [statistics calculator](/statistics-calculator) also gives the mean, median and other summary values.'
				]
			}
		],
		formulas: [
			{
				title: 'Mean',
				expression: 'μ = (x₁ + x₂ + … + xₙ) ÷ n',
				variables: [{ symbol: 'μ', meaning: 'the mean of the numbers' }]
			},
			{
				title: 'Variance',
				expression: 'Sample: s² = Σ(xᵢ − μ)² ÷ (n − 1).   Population: σ² = Σ(xᵢ − μ)² ÷ n',
				variables: [
					{ symbol: 'Σ', meaning: 'add up over all the numbers' },
					{ symbol: 'n − 1', meaning: 'used for a sample to correct for estimating the mean from the same data' }
				]
			},
			{
				title: 'Standard deviation',
				expression: 's = √s²   or   σ = √σ²',
				variables: [{ symbol: '√', meaning: 'the square root' }]
			},
			{
				title: 'Standard error of the mean',
				expression: 'SEM = s ÷ √n',
				variables: [
					{ symbol: 's', meaning: 'the sample standard deviation' },
					{ symbol: 'n', meaning: 'the number of values' }
				]
			}
		],
		example: {
			title: 'Sample standard deviation of 1, 2, 3, 4, 5',
			steps: [
				'Mean: (1 + 2 + 3 + 4 + 5) ÷ 5 = 3.',
				'Squared differences: (1 − 3)² + (2 − 3)² + (3 − 3)² + (4 − 3)² + (5 − 3)² = 4 + 1 + 0 + 1 + 4 = 10.',
				'Variance: 10 ÷ (5 − 1) = 2.5.',
				'Standard deviation: √2.5 = 1.581139.'
			],
			result: 'The sample standard deviation is 1.581139. The standard error of the mean is 0.707107.'
		},
		faq: [
			{
				q: 'How do I calculate the standard deviation?',
				a: 'Find the mean, then the squared distance of each value from it. Add those squares, divide by n or n − 1, and take the square root. For 1, 2, 3, 4, 5 the sample standard deviation is 1.581139.'
			},
			{
				q: 'When should I use sample or population?',
				a: 'Use population when your list includes every member of the group you care about. Use sample when the list is a subset, such as survey answers from some of the people you wanted to study. The sample version divides by n − 1, which gives a fairer estimate of the spread.'
			},
			{
				q: 'What is a good standard deviation?',
				a: 'There is no single good value. A small standard deviation means the data is consistent, and a large one means it varies more. Judge it against the mean and the purpose of your study.'
			},
			{
				q: 'What is the difference between standard deviation and variance?',
				a: 'Variance is the average of the squared distances from the mean, so its units are squared. Standard deviation is the square root of the variance, so it is in the original units.'
			}
		],
		sources: [
			{ title: 'NIST/SEMATECH e-Handbook of Statistical Methods', url: 'https://www.itl.nist.gov/div898/handbook/' },
			{ title: 'Wolfram MathWorld: Standard Deviation', url: 'https://mathworld.wolfram.com/StandardDeviation.html' }
		]
	}
});
