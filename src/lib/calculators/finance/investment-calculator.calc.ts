import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, plural } from '../format';
import meta from './investment-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'start', label: 'Starting amount', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'monthly',
			label: 'Monthly contribution',
			type: 'number',
			default: 500,
			min: 0,
			max: 1_000_000,
			step: 10,
			prefix: '$',
			suffix: '/mo',
			help: 'Added at the end of each month.'
		},
		{
			id: 'rate',
			label: 'Expected annual return',
			type: 'number',
			default: 7,
			min: -50,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'Applied monthly as one-twelfth of the yearly rate.'
		},
		{ id: 'years', label: 'Years', type: 'number', default: 20, min: 1, max: 100, step: 1, suffix: 'years', decimal: false },
		{
			id: 'raise',
			label: 'Yearly increase in contributions',
			type: 'number',
			default: 0,
			min: 0,
			max: 50,
			step: 0.1,
			suffix: '%',
			help: 'Raises your monthly contribution once a year.'
		}
	],
	calculate(v): CalculationResult {
		const start = Number(v.start);
		const monthly = Number(v.monthly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const raise = Number(v.raise);
		if (
			!(start >= 0) ||
			!(monthly >= 0) ||
			!(rate >= -50 && rate <= 100) ||
			!(Number.isInteger(years) && years >= 1 && years <= 100) ||
			!(raise >= 0 && raise <= 50)
		) {
			return { primaryResult: DASH, primaryLabel: 'Ending value', summary: 'Check the amounts, return and years.' };
		}

		const monthRate = rate / 100 / 12;
		const raiseFactor = 1 + raise / 100;
		let value = start;
		let contributed = start;
		let finalMonthly = monthly;
		const chartData: Record<string, number>[] = [{ year: 0, value, contributed }];
		const rows: Record<string, string>[] = [];

		for (let y = 1; y <= years; y++) {
			const yearlyMonthly = monthly * Math.pow(raiseFactor, y - 1);
			finalMonthly = yearlyMonthly;
			for (let m = 0; m < 12; m++) value = value * (1 + monthRate) + yearlyMonthly;
			contributed += yearlyMonthly * 12;
			const growth = value - contributed;
			chartData.push({ year: y, value, contributed });
			rows.push({
				year: String(y),
				contributed: money(contributed, true),
				growth: money(growth, true),
				value: money(value, true)
			});
		}

		const growth = value - contributed;

		return {
			primaryResult: money(value),
			primaryLabel: 'Ending value',
			summary: `${money(contributed, true)} of contributions grows by ${money(growth, true)} over ${plural(years, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Total contributions', value: money(contributed) },
				{ label: 'Investment growth', value: money(growth) },
				{ label: 'Final-year monthly contribution', value: money(finalMonthly) }
			],
			chart: {
				type: 'line',
				title: 'Portfolio value compared with contributions',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'value', label: 'Portfolio value' },
					{ key: 'contributed', label: 'Total contributed' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Yearly breakdown',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'contributed', label: 'Contributed', align: 'end' },
					{ key: 'growth', label: 'Growth', align: 'end' },
					{ key: 'value', label: 'Value', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this investment calculator to project how a starting amount and regular monthly contributions could grow. You can also raise your contributions each year to see how much that adds.',
		howTo: [
			'Enter the amount you start with and the amount you plan to add each month.',
			'Enter the annual return you expect and the number of years you will invest.',
			'If you plan to save more as your pay rises, enter a yearly increase in your contributions.',
			'Read the ending value, then open the yearly breakdown to compare growth with what you paid in.'
		],
		about: [
			{
				heading: 'What does an investment calculator do?',
				paragraphs: [
					'It shows what a pot of money could be worth in the future if it earns the same return every year. You choose the starting amount, the monthly contribution, the return and the time.',
					'The tool splits the ending value into two parts. The first is what you paid in. The second is the growth on top.',
					'This is a projection, not a promise. Real returns go up and down from year to year, and some years are negative. So treat the result as one possible path.'
				]
			},
			{
				heading: 'How the ending value is calculated',
				paragraphs: [
					'The calculator divides your yearly return by 12 and applies it every month. After each month of growth, it adds your contribution. When you set a yearly increase, your monthly amount goes up by that percentage once a year.',
					'Because the rate is applied monthly, a 7% yearly return behaves like about 7.23% over a full year. This is the same as monthly compounding. If you want to test other schedules, try the [compound interest calculator](/compound-interest-calculator).'
				]
			},
			{
				heading: 'How return and contributions change the result',
				paragraphs: [
					'The return you assume matters a lot over long periods. The table below uses $10,000 to start, $500 a month and 20 years, with no yearly raise.'
				],
				table: {
					caption: '$10,000 start, $500 a month, 20 years',
					columns: ['Annual return', 'Ending value', 'Growth'],
					rows: [
						['4%', '$205,613', '$75,613'],
						['7%', '$300,851', '$170,851'],
						['10%', '$452,965', '$322,965']
					]
				}
			},
			{
				heading: 'What a yearly increase adds',
				paragraphs: [
					'Many people can save a little more as their income grows. The next table uses the same example at 7%, with the monthly amount rising once a year.'
				],
				table: {
					caption: '$10,000 start, $500 a month at first, 7%, 20 years',
					columns: ['Yearly increase', 'Total you pay in', 'Ending value'],
					rows: [
						['0%', '$130,000', '$300,851'],
						['3%', '$171,222', '$367,509'],
						['5%', '$208,396', '$425,518']
					]
				}
			},
			{
				heading: 'Tips for using projections wisely',
				paragraphs: ['Returns are never guaranteed, and past returns do not predict future ones. These tips help you plan with that in mind:'],
				list: [
					'**Test a low return as well as a hopeful one.** Plan around the lower result, so a bad year does not surprise you.',
					'**Remember fees and tax.** Both reduce what you keep, and this tool does not include them.',
					'**Allow for inflation.** Prices rise, so a future balance buys less. See the effect with the [inflation calculator](/inflation-calculator).',
					'**Set a goal first.** The [future value calculator](/future-value-calculator) and [savings calculator](/savings-calculator) work well for a fixed target.',
					'**Check the profit on a single purchase.** For one deal, use the [ROI calculator](/roi-calculator) instead.'
				]
			}
		],
		formulas: [
			{
				title: 'Ending value with no yearly raise',
				expression: 'FV = S × (1 + i)ᴺ + C × ((1 + i)ᴺ − 1) ÷ i',
				variables: [
					{ symbol: 'FV', meaning: 'ending value' },
					{ symbol: 'S', meaning: 'starting amount' },
					{ symbol: 'C', meaning: 'monthly contribution, added at the end of each month' },
					{ symbol: 'i', meaning: 'monthly return (annual return ÷ 12 ÷ 100)' },
					{ symbol: 'N', meaning: 'number of months (years × 12)' }
				]
			},
			{
				title: 'Contribution with a yearly raise',
				expression: 'Cᵧ = C × (1 + g)^(y − 1)',
				variables: [
					{ symbol: 'Cᵧ', meaning: 'monthly contribution during year y' },
					{ symbol: 'g', meaning: 'yearly increase as a decimal (3% is 0.03)' },
					{ symbol: 'y', meaning: 'the year number, starting at 1' }
				]
			}
		],
		example: {
			title: '$10,000 to start, $500 a month, 7% for 20 years, no yearly raise',
			steps: [
				'Monthly return: 0.07 ÷ 12 ≈ 0.0058333',
				'Months: 20 × 12 = 240',
				'Starting amount grows to: 10,000 × 1.0058333²⁴⁰ ≈ $40,387.39',
				'Contributions grow to: 500 × (1.0058333²⁴⁰ − 1) ÷ 0.0058333 ≈ $260,463.33',
				'Ending value: $40,387.39 + $260,463.33 ≈ $300,850.72',
				'Total contributions: $10,000 + $500 × 240 = $130,000, so growth is $170,850.72'
			],
			result: 'Ending value ≈ $300,850.72 from $130,000.00 of contributions.'
		},
		faq: [
			{
				q: 'How do I calculate the growth of an investment?',
				a: 'Grow the starting amount and each monthly contribution at the monthly return, then add them together. This calculator does that for you and shows the total you paid in next to the growth.'
			},
			{
				q: 'What return should I enter?',
				a: 'Nobody can know future returns. Use a cautious figure and try a few values. Long-term averages for different kinds of investments vary a lot and can be higher or lower in any given period.'
			},
			{
				q: 'What does the yearly increase in contributions do?',
				a: 'It raises your monthly amount by a set percentage once a year. At a 3% raise, a $500 monthly contribution becomes about $877 in year 20. That adds a lot to the final value over time.'
			},
			{
				q: 'Can I enter a negative return?',
				a: 'Yes. You can enter any return from −50% to 100%. A negative return shows how a falling market would cut the value, which is useful for planning a worst case.'
			},
			{
				q: 'Does this calculator include fees, tax or inflation?',
				a: 'No. Fund fees, trading costs, tax and inflation all lower your real result. Subtract a rough allowance from your expected return to include them.'
			},
			{
				q: 'What is the difference between the investment and compound interest calculators?',
				a: 'The compound interest calculator lets you choose the compounding schedule. This one is built for investment returns and adds a yearly increase in contributions.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
			{ title: 'Investor.gov (U.S. SEC) — Beginners’ guide to investing', url: 'https://www.investor.gov/introduction-investing' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. You can lose money. This tool ignores fees, tax and inflation and is not financial advice.'
	}
});
