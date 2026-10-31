import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './mean-median-mode-range-calculator.meta';

/** "1", "1 and 2", or "1, 2 and 3". */
const joinNames = (items: string[]) =>
	items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** Values that occur most often. Empty when every value occurs only once. */
function modesOf(xs: number[]): number[] {
	const counts = new Map<number, number>();
	for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
	const top = Math.max(...Array.from(counts.values()));
	if (top === 1) return [];
	return Array.from(counts.entries())
		.filter(([, count]) => count === top)
		.map(([x]) => x)
		.sort((p, q) => p - q);
}

function median(sorted: number[]): number {
	const n = sorted.length;
	const mid = Math.floor(n / 2);
	return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'values',
			label: 'Numbers',
			type: 'list',
			default: '10, 2, 38, 23, 38, 23, 21',
			minCount: 1,
			placeholder: 'e.g. 4, 8, 15, 16',
			help: 'Separate the numbers with commas or spaces.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const xs = v.values as number[];
		const label = 'Mean';

		if (xs.length === 0 || xs.some((x) => !Number.isFinite(x))) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter one or more numbers, separated by commas.' };
		}

		const sorted = [...xs].sort((p, q) => p - q);
		const n = xs.length;
		const sum = xs.reduce((acc, x) => acc + x, 0);
		const mean = sum / n;
		const modes = modesOf(xs);
		const min = sorted[0];
		const max = sorted[n - 1];

		return {
			primaryResult: num(mean, 6),
			primaryLabel: label,
			summary: `Sum ${num(sum, 6)} ÷ ${num(n, 0)} numbers = ${num(mean, 6)}.`,
			secondaryMetrics: [
				{ label: 'Median', value: num(median(sorted), 6) },
				{ label: 'Mode(s)', value: modes.length ? joinNames(modes.map((x) => num(x, 6))) : 'none' },
				{ label: 'Range', value: num(max - min, 6) },
				{ label: 'Minimum', value: num(min, 6) },
				{ label: 'Maximum', value: num(max, 6) },
				{ label: 'Count', value: num(n, 0) },
				{ label: 'Sum', value: num(sum, 6) }
			]
		};
	},
	content: {
		intro:
			'Describe a list of numbers with its mean, median, mode, range, minimum, maximum, count and sum, all from one list. Each measure shows a different side of the data, so you see the full picture.',
		howTo: [
			'Type your numbers into the box, separated by commas or spaces.',
			'Read the mean first. It is the main average of the list.',
			'Check the median and mode for the middle and most common values.',
			'Look at the range, minimum and maximum to see how spread out the numbers are.'
		],
		about: [
			{
				heading: 'Five ways to describe a list',
				paragraphs: [
					'A single number rarely tells the whole story. A list can have the same mean as another list and still look very different. So it helps to check several measures together.',
					'Each measure answers a different question. The mean asks for the typical total per item. The median asks for the middle value. The mode asks which value is most common. The range asks how wide the spread is.'
				],
				table: {
					caption: 'What each measure tells you',
					columns: ['Measure', 'What it shows', 'How it is found'],
					rows: [
						['Mean', 'The average', 'Add all values, divide by the count'],
						['Median', 'The middle value', 'Sort the values, then take the middle one'],
						['Mode', 'The most common value', 'Count how often each value appears'],
						['Range', 'How wide the spread is', 'Largest value minus smallest value']
					]
				}
			},
			{
				heading: 'Median: the middle value',
				paragraphs: [
					'To find the median, put the numbers in order from smallest to largest. If there is an odd number of values, the median is the one in the middle. For example, the median of 4, 9 and 6 is 6, because the sorted list is 4, 6, 9.',
					'If there is an even number of values, the median is halfway between the two middle values. The median of 2, 4, 6 and 8 is (4 + 6) ÷ 2 = 5.',
					'The median is useful because one unusually large value does not move it much. For more on averages, see the [average calculator](/average-calculator).'
				]
			},
			{
				heading: 'Mode: the most common value',
				paragraphs: [
					'The mode is the value that appears most often. Suppose seven students have these shoe sizes: 7, 8, 8, 9, 9, 9 and 10. The mode is 9, because it appears three times.',
					'A list can have more than one mode. In 2, 2, 5, 5 and 7, both 2 and 5 appear twice, so both are modes. And if every value appears only once, there is no mode.',
					'Mode is most useful for things that are not numbers you can add, such as favourite colours or sizes.'
				]
			},
			{
				heading: 'Range, minimum and maximum',
				paragraphs: [
					'The minimum is the smallest value and the maximum is the largest. The range is the gap between them: range = maximum − minimum. In the example list, the minimum is 2 and the maximum is 38, so the range is 36.',
					'A small range means the values are close together. A large range means they are spread out. The range uses only the two end values, so it can’t show how the values are arranged in between. For that, see the [standard deviation calculator](/standard-deviation-calculator).'
				]
			},
			{
				heading: 'Which measure should you use?',
				paragraphs: [
					'Use the mean when the values are fairly even, and you want the total shared out equally. Use the median when one or two values are far from the rest, because the median is less affected by them.',
					'For example, five test scores are 60, 62, 65, 70 and 98. The mean is 71, but the median is 65. Four of the five scores are between 60 and 70, and the 98 pulls the mean up. So the median gives a more typical picture here.'
				],
				list: [
					'Mean: good for even data, such as heights or prices of similar items.',
					'Median: good for incomes, house prices and other data with big outliers.',
					'Mode: good for the most common choice, such as a shirt size.',
					'Range: good for a quick check of how spread out the values are.'
				]
			},
			{
				heading: 'Tips for reliable results',
				paragraphs: [
					'Check your data before you calculate. A typing error, such as 380 instead of 38, can change every measure. The calculator can only work with the numbers you enter.',
					'Read the count as well. A list of 3 numbers tells you far less than a list of 300. For rounding the results, see the [rounding calculator](/rounding-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Mean',
				expression: 'Mean = (x₁ + x₂ + … + xₙ) ÷ n',
				variables: [{ symbol: 'n', meaning: 'how many numbers there are' }]
			},
			{
				title: 'Median',
				expression: 'Sort the numbers. For an odd count, take the middle one. For an even count, take the mean of the two middle ones.',
				variables: []
			},
			{
				title: 'Mode',
				expression: 'The value that occurs most often. If every value occurs once, the list has no mode.',
				variables: []
			},
			{
				title: 'Range',
				expression: 'Range = maximum − minimum',
				variables: [{ symbol: 'max, min', meaning: 'the largest and smallest values in the list' }]
			}
		],
		example: {
			title: 'Describe 10, 2, 38, 23, 38, 23, 21',
			steps: [
				'Sum: 155, count: 7, so mean = 155 ÷ 7 = 22.142857',
				'Sorted: 2, 10, 21, 23, 23, 38, 38. The middle value is 23, so the median is 23.',
				'38 and 23 each appear twice, so the modes are 23 and 38.',
				'Range: 38 − 2 = 36'
			],
			result: 'Mean 22.142857, median 23, modes 23 and 38, range 36.'
		},
		faq: [
			{
				q: 'When is the median better than the mean?',
				a: 'The median is less affected by a few very large or very small values. Incomes and house prices often have a median that shows a typical value better than the mean does.'
			},
			{
				q: 'What does it mean when there is no mode?',
				a: 'It means every value appears only once, so no value repeats. The calculator shows “none” in that case.'
			},
			{
				q: 'How is the range different from the standard deviation?',
				a: 'The range uses only the largest and smallest values. The standard deviation uses every value and shows how far the values typically sit from the mean.'
			},
			{
				q: 'Do I need to sort the numbers first?',
				a: 'No. The calculator sorts the list for you before it finds the median. Sorting by hand is a good way to check the middle value yourself.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Median', url: 'https://en.wikipedia.org/wiki/Median' },
			{ title: 'Wikipedia — Mode (statistics)', url: 'https://en.wikipedia.org/wiki/Mode_(statistics)' }
		]
	}
});
