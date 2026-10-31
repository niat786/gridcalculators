import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './percentage-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to find?',
			type: 'select',
			display: 'segmented',
			default: 'of',
			options: [
				{ label: '% of a number', value: 'of' },
				{ label: '% change', value: 'change' },
				{ label: 'X is what %', value: 'ratio' }
			]
		},
		{ id: 'p', label: 'Percent', type: 'number', default: 20, suffix: '%', visibleWhen: mode('of') },
		{ id: 'x', label: 'Of number', type: 'number', default: 150, visibleWhen: mode('of') },
		{ id: 'from', label: 'From (old value)', type: 'number', default: 80, visibleWhen: mode('change') },
		{ id: 'to', label: 'To (new value)', type: 'number', default: 100, visibleWhen: mode('change') },
		{ id: 'part', label: 'Value', type: 'number', default: 30, visibleWhen: mode('ratio') },
		{ id: 'whole', label: 'Is what percent of', type: 'number', default: 120, visibleWhen: mode('ratio') }
	],
	calculate(v): CalculationResult {
		if (v.mode === 'change') {
			const a = Number(v.from);
			const b = Number(v.to);
			if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) {
				return { primaryResult: DASH, primaryLabel: 'Percent change', summary: 'The old value can’t be zero.' };
			}
			const c = ((b - a) / Math.abs(a)) * 100;
			const sign = c > 0 ? '+' : '';
			return {
				primaryResult: `${sign}${pct(c, 4)}`,
				primaryLabel: 'Percent change',
				summary: `(${num(b, 4)} − ${num(a, 4)}) ÷ |${num(a, 4)}| × 100 = ${sign}${pct(c, 4)}`,
				secondaryMetrics: [
					{ label: 'Direction', value: c > 0 ? 'Increase' : c < 0 ? 'Decrease' : 'No change' },
					{ label: 'Difference', value: num(b - a, 4) }
				]
			};
		}
		if (v.mode === 'ratio') {
			const a = Number(v.part);
			const b = Number(v.whole);
			if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
				return { primaryResult: DASH, primaryLabel: 'Percentage', summary: 'The whole can’t be zero.' };
			}
			const q = (a / b) * 100;
			return {
				primaryResult: pct(q, 4),
				primaryLabel: 'Percentage',
				summary: `${num(a, 4)} ÷ ${num(b, 4)} × 100 = ${pct(q, 4)}`
			};
		}
		const p = Number(v.p);
		const x = Number(v.x);
		if (!Number.isFinite(p) || !Number.isFinite(x)) {
			return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Enter a percent and a number.' };
		}
		const r = (p / 100) * x;
		return {
			primaryResult: num(r, 4),
			primaryLabel: `${num(p, 4)}% of ${num(x, 4)}`,
			summary: `${num(p, 4)} ÷ 100 × ${num(x, 4)} = ${num(r, 4)}`,
			secondaryMetrics: [
				{ label: `${num(x, 4)} plus ${num(p, 4)}%`, value: num(x + r, 4) },
				{ label: `${num(x, 4)} minus ${num(p, 4)}%`, value: num(x - r, 4) }
			]
		};
	},
	content: {
		intro:
			'Solve the three everyday percentage problems: a percent of a number, the percent change between two values, and what percent one number is of another. Works in any currency or unit.',
		howTo: [
			'Pick the kind of problem at the top: % of a number, % change, or X is what % of Y.',
			'Enter your two numbers. For % of a number, enter the percent and the number.',
			'Read the answer. The working below it shows the sum, so you can check it by hand.'
		],
		about: [
			{
				heading: 'Three kinds of percentage problem',
				paragraphs: [
					'A percentage is a part of 100. So 25% means 25 out of every 100, or one quarter. The word comes from the Latin “per centum”, which means “by the hundred”.',
					'Most everyday questions fall into one of three types. You might want a percent of a number, such as a 15% tip. You might want to know how much a price has changed. Or you might want to know what share one number is of another, such as a test score.',
					'Each type uses a slightly different formula. This calculator handles all three, so you can choose the one that matches your question.'
				],
				list: [
					'**% of a number:** what is 20% of 150?',
					'**% change:** by what percent did the price go from 80 to 100?',
					'**X is what %:** 30 is what percent of 120?'
				]
			},
			{
				heading: 'How to find a percent of a number',
				paragraphs: [
					'First, turn the percent into a decimal by dividing by 100. Then multiply by the number. For example, 20% becomes 0.20, and 0.20 × 150 = 30. So 20% of 150 is 30.',
					'This also helps with money. A 15% tip on a $40 bill is 0.15 × 40 = $6. Your total becomes $46. For a quick check, 10% of any number is the same number with the decimal point moved one place left.',
					'Sometimes you need the new total, not just the part. For example, 150 plus 20% is 150 + 30 = 180. And 150 minus 20% is 150 − 30 = 120.'
				],
				list: [
					'Use the [tip calculator](/tip-calculator) when you want to split a bill.',
					'Use the [discount calculator](/discount-calculator) to see a sale price after a percent off.'
				]
			},
			{
				heading: 'How percent change is calculated',
				paragraphs: [
					'Percent change shows how much a value went up or down, compared with where it started. Subtract the old value from the new value. Then divide by the old value and multiply by 100.',
					'For example, a price rises from $80 to $100. The difference is 100 − 80 = 20. Then 20 ÷ 80 = 0.25, and 0.25 × 100 = 25. The price went up by 25%.',
					'A fall works the same way, and the answer is negative. If a price drops from $100 to $75, the change is (75 − 100) ÷ 100 × 100 = −25%. The minus sign tells you it went down.'
				]
			},
			{
				heading: 'What percent is one number of another?',
				paragraphs: [
					'To find what percent A is of B, divide A by B, then multiply by 100. For example, you score 36 out of 40 on a quiz. Then 36 ÷ 40 = 0.9, and 0.9 × 100 = 90%.',
					'The same method works for shares. If 30 people out of 120 chose tea, then 30 ÷ 120 = 0.25, so 25% chose tea. The whole, 120, always goes on the bottom of the division.'
				],
				list: [
					'If the whole is zero, the percent can’t be worked out, because you can’t divide by zero.',
					'Check the answer by taking the percent again. For 25% of 120, you get 30, which matches the first number.',
					'To compare two amounts as a ratio instead, use the [ratio calculator](/ratio-calculator).'
				]
			},
			{
				heading: 'Percent and percentage points',
				paragraphs: [
					'People often mix up percent and percentage points. A percentage point is the simple difference between two percentages. A percent change compares the new value with the starting value.',
					'For example, an interest rate that rises from 10% to 15% goes up by 5 percentage points. But compared with the starting rate, it is a 50% increase, because 5 ÷ 10 = 0.5.',
					'When you read news or adverts, check which one is meant. Both can be true at once, and they tell very different stories.'
				]
			}
		],
		formulas: [
			{
				title: 'Percent of a number',
				expression: 'Result = P ÷ 100 × X',
				variables: [
					{ symbol: 'P', meaning: 'the percent, such as 20' },
					{ symbol: 'X', meaning: 'the number you are taking the percent of' }
				]
			},
			{
				title: 'Percent change',
				expression: 'Change = (New − Old) ÷ |Old| × 100',
				variables: [
					{ symbol: 'New', meaning: 'the value after the change' },
					{ symbol: 'Old', meaning: 'the value before the change. It can’t be zero' }
				]
			},
			{
				title: 'What percent A is of B',
				expression: 'Percent = A ÷ B × 100',
				variables: [
					{ symbol: 'A', meaning: 'the part' },
					{ symbol: 'B', meaning: 'the whole' }
				]
			}
		],
		example: {
			title: 'A price rises from $80 to $100',
			steps: ['Difference: 100 − 80 = 20', 'Divide by the old value: 20 ÷ 80 = 0.25', 'Multiply by 100: 0.25 × 100 = 25'],
			result: 'The price went up by 25%.'
		},
		faq: [
			{
				q: 'How do I calculate a percentage of a number?',
				a: 'Divide the percent by 100, then multiply by the number. For example, 20% of 150 is 0.20 × 150 = 30. You can also write 20% as 20 ÷ 100.'
			},
			{
				q: 'What is the difference between percent change and percentage points?',
				a: 'Percent change compares a new value with the starting value. Percentage points are the simple difference between two percentages. Going from 10% to 15% is a rise of 5 percentage points, or a 50% increase in the rate.'
			},
			{
				q: 'Why is a 50% drop not undone by a 50% rise?',
				a: 'Each change is measured from a different starting value. $100 falls 50% to $50, but a 50% rise on $50 only brings it back to $75, not $100.'
			},
			{
				q: 'How do I work out a discount?',
				a: 'Find the discount amount, then subtract it from the price. For example, 25% off $80 is 0.25 × 80 = $20, so the sale price is $80 − $20 = $60.'
			},
			{
				q: 'Why can’t I calculate percent change from zero?',
				a: 'Percent change divides by the old value. Dividing by zero has no answer, so the calculator asks for a non-zero old value instead.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Percentage', url: 'https://en.wikipedia.org/wiki/Percentage' },
			{ title: 'Wikipedia — Percentage point', url: 'https://en.wikipedia.org/wiki/Percentage_point' }
		]
	}
});
