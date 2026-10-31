import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './average-calculator.meta';

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
		const label = 'Mean (average)';

		if (xs.length === 0 || xs.some((x) => !Number.isFinite(x))) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter one or more numbers, separated by commas.' };
		}

		const n = xs.length;
		const sum = xs.reduce((acc, x) => acc + x, 0);
		const mean = sum / n;
		const modes = modesOf(xs);

		return {
			primaryResult: num(mean, 6),
			primaryLabel: label,
			summary: `Sum ${num(sum, 6)} ÷ ${num(n, 0)} numbers = ${num(mean, 6)}.`,
			secondaryMetrics: [
				{ label: 'Count', value: num(n, 0) },
				{ label: 'Sum', value: num(sum, 6) },
				{ label: 'Median', value: num(median([...xs].sort((p, q) => p - q)), 6) },
				{ label: 'Mode', value: modes.length ? joinNames(modes.map((x) => num(x, 6))) : 'none' }
			]
		};
	},
	content: {
		intro:
			'Find the average of a list of numbers. The calculator gives you the mean, which adds the values and divides by how many there are, plus the sum, count, median and mode.',
		howTo: [
			'Type your numbers into the box, separated by commas or spaces. Negative numbers are fine.',
			'Read the mean. It is the average, and the count and sum show how it was worked out.',
			'Check the median and mode if you want the middle value or the most common value.',
			'Change one number to see how the average moves, which is a quick way to test an idea.'
		],
		about: [
			{
				heading: 'What is an average?',
				paragraphs: [
					'An average is a single number that describes a whole list. It gives you a typical value, so you don’t need to read every number to get the big picture.',
					'The most common average is the mean, also called the arithmetic mean. Say you score 70, 80 and 90 on three tests. You add the scores to get 240, then divide by 3. Your mean score is 80.',
					'Averages appear everywhere. Teachers use them for grades, and analysts use them for prices, sales and temperatures.'
				]
			},
			{
				heading: 'How the mean is calculated',
				paragraphs: [
					'To find the mean, add all the numbers together. Then divide the total by how many numbers you added. The mean always falls somewhere between the smallest and largest number in the list.',
					'Take the example in the calculator, 10, 2, 38, 23, 38, 23 and 21. The sum is 155. There are 7 numbers, so the mean is 155 ÷ 7 = 22.142857. The calculator shows this to six decimal places.',
					'A mean is often a fraction. That is normal, and it doesn’t mean the calculator is wrong. Round it only at the end, when you need a neat answer.'
				]
			},
			{
				heading: 'Median and mode in short',
				paragraphs: [
					'The median is the middle value after you sort the list from smallest to largest. If there is an even count, the median is the mean of the two middle values. The mode is the value that appears most often.',
					'In the example, the sorted list is 2, 10, 21, 23, 23, 38, 38. The median is 23, and both 23 and 38 appear twice, so they are both modes. For more detail, use the [mean, median, mode and range calculator](/mean-median-mode-range-calculator).'
				]
			},
			{
				heading: 'When an average can mislead',
				paragraphs: [
					'A single very large or very small value, called an outlier, can pull the mean a long way. Imagine five people earn $30,000, $32,000, $35,000, $38,000 and $1,000,000 a year. The mean is $227,000, which doesn’t describe most of the group.',
					'In that case, the median is more useful. It is $35,000, the middle earner. So when a list has an outlier, look at both numbers before you decide what the average says.',
					'The [standard deviation calculator](/standard-deviation-calculator) goes further. It measures how spread out the numbers are around the mean.'
				]
			},
			{
				heading: 'Averages of averages',
				paragraphs: [
					'You can’t average two averages and get the right answer, unless both groups are the same size. Instead, use a weighted average. Multiply each average by its group size, add the results, and divide by the total number of items.',
					'For example, one class of 10 students averages 80, and another class of 30 averages 70. The average of the two averages is 75, but that is wrong. The right answer is (80 × 10 + 70 × 30) ÷ 40 = 72.5, because the second class is bigger.'
				],
				list: [
					'Use the mean for values that are fairly even, such as test scores in one class.',
					'Use the median when a few very large or small values could mislead you.',
					'To see one value as a share of a total, use the [percentage calculator](/percentage-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Mean (average)',
				expression: 'Mean = (x₁ + x₂ + … + xₙ) ÷ n',
				variables: [
					{ symbol: 'xᵢ', meaning: 'each number in the list' },
					{ symbol: 'n', meaning: 'how many numbers there are' }
				]
			},
			{
				title: 'Median',
				expression: 'Sort the numbers. For an odd count, take the middle one. For an even count, take the mean of the two middle ones.',
				variables: []
			},
			{
				title: 'Mode',
				expression: 'The value that occurs most often. If every value occurs once, there is no mode.',
				variables: []
			}
		],
		example: {
			title: 'Average of 10, 2, 38, 23, 38, 23, 21',
			steps: [
				'Sum: 10 + 2 + 38 + 23 + 38 + 23 + 21 = 155',
				'Count: 7 numbers',
				'Mean: 155 ÷ 7 = 22.142857',
				'Median: sorted list 2, 10, 21, 23, 23, 38, 38, so the middle value is 23'
			],
			result: 'The mean is 22.142857, the median is 23 and the modes are 23 and 38.'
		},
		faq: [
			{
				q: 'What is the difference between mean, median and mode?',
				a: 'The mean is the arithmetic average: add everything and divide by the count. The median is the middle value when the numbers are sorted. The mode is the value that appears most often.'
			},
			{
				q: 'Can a list have more than one mode?',
				a: 'Yes. If two or more values tie for the most occurrences, they are all modes. A list where every value appears once has no mode.'
			},
			{
				q: 'Why is my mean not a whole number?',
				a: 'The mean is often a fraction of the list total. For example, 155 divided by 7 is 22.142857…, so the calculator shows six decimal places.'
			},
			{
				q: 'Can I average negative numbers?',
				a: 'Yes. Add them as normal, including the negative values, and divide by the count. For example, the mean of −5, 5 and 10 is 10 ÷ 3 = 3.333333.'
			},
			{
				q: 'How do I calculate a weighted average?',
				a: 'Multiply each value by its weight, such as the number of students in a class. Add those results and divide by the total weight. Use the mean only when every value counts the same.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Arithmetic mean', url: 'https://en.wikipedia.org/wiki/Arithmetic_mean' },
			{ title: 'Wikipedia — Median', url: 'https://en.wikipedia.org/wiki/Median' }
		]
	}
});
