import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './future-value-calculator.meta';

const timingOptions = [
	{ label: 'End', value: 'end' },
	{ label: 'Beginning', value: 'beginning' }
];

/**
 * Standard time-value-of-money future value. Payments are amounts added each period.
 * Timing "beginning" (annuity due) grows each payment by one extra period.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'pv', label: 'Present value', type: 'number', default: 1000, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'The amount you start with.' },
		{ id: 'rate', label: 'Interest rate per period', type: 'number', default: 0.5, min: 0, max: 100, step: 0.01, suffix: '%' },
		{ id: 'periods', label: 'Number of periods', type: 'number', default: 120, min: 1, max: 10_000, step: 1, decimal: false },
		{
			id: 'pmt',
			label: 'Payment per period',
			type: 'number',
			default: 0,
			min: 0,
			max: 1_000_000_000,
			step: 10,
			prefix: '$',
			help: 'Amount you add each period. Leave at 0 for none.'
		},
		{ id: 'timing', label: 'Payment timing', type: 'select', display: 'segmented', default: 'end', options: timingOptions }
	],
	calculate(v): CalculationResult {
		const pv = Number(v.pv);
		const rate = Number(v.rate);
		const n = Number(v.periods);
		const pmt = Number(v.pmt);
		const timing = String(v.timing);
		if (
			!(pv >= 0) ||
			!(pmt >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(Number.isInteger(n) && n >= 1 && n <= 10_000) ||
			(timing !== 'end' && timing !== 'beginning')
		) {
			return { primaryResult: DASH, primaryLabel: 'Future value', summary: 'Check the amounts, rate and periods.' };
		}

		const r = rate / 100;
		const due = timing === 'beginning' ? 1 + r : 1;
		const growth = Math.pow(1 + r, n);
		const annuity = r === 0 ? n : ((growth - 1) / r) * due;
		const fv = pv * growth + pmt * annuity;
		const paid = pv + pmt * n;

		return {
			primaryResult: money(fv),
			primaryLabel: 'Future value',
			summary: `Your money grows ${num(growth, 4)} times over ${plural(n, 'period')} at ${num(rate, 2)}% per period.`,
			secondaryMetrics: [
				{ label: 'Total you put in', value: money(paid) },
				{ label: 'Growth from interest', value: money(fv - paid) },
				{ label: 'Payment annuity factor', value: num(annuity, 4) }
			]
		};
	},
	content: {
		intro:
			'Use this future value calculator to find what a sum of money, with or without regular payments, will be worth after a number of periods. It works for months, years or any other period.',
		howTo: [
			'Enter the present value, which is the amount you start with. Use 0 if you start from nothing.',
			'Enter the interest rate for one period and the number of periods. For monthly periods, use the monthly rate.',
			'If you add money each period, enter the payment and choose whether it comes at the end or the beginning.',
			'Read the future value, then check how much came from your own money and how much from interest.'
		],
		about: [
			{
				heading: 'What is future value?',
				paragraphs: [
					'Future value is what money today will be worth later, after it earns interest. It is a core idea in the time value of money. A dollar today can grow, so it is worth more than a dollar you get later.',
					'For example, $5,000 growing at 6% per year would be worth about $8,954 after 10 years. Use future value to check a savings goal, compare offers, or see how much a regular deposit builds over time.'
				]
			},
			{
				heading: 'How future value is calculated',
				paragraphs: [
					'The starting amount is multiplied by (1 + rate) once for every period. That is compound growth. If you also add a payment each period, those payments grow too, and the formula adds their total.',
					'The rate and the periods must use the same unit. If you enter 120 monthly periods, enter the rate per month. A yearly rate of 6% is roughly 0.5% per month. For yearly rates and monthly saving, the [compound interest calculator](/compound-interest-calculator) does the conversion for you.'
				]
			},
			{
				heading: 'End of period or beginning of period?',
				paragraphs: [
					'A payment made at the end of each period is called an ordinary annuity. A payment made at the beginning is an annuity due. The beginning payment earns one extra period of interest.',
					'The difference is small but real. With $1,000 to start, $100 a payment, 0.5% per period and 120 periods, end payments give $18,207.33. Beginning payments give $18,289.27.'
				]
			},
			{
				heading: 'How time changes future value',
				paragraphs: [
					'Time does more of the work than most people expect. The table below grows a single $5,000 at 6% per period, with no extra payments.'
				],
				table: {
					caption: '$5,000 at 6% per period, no payments',
					columns: ['Periods', 'Growth factor', 'Future value'],
					rows: [
						['10', '1.7908', '$8,954.24'],
						['20', '3.2071', '$16,035.68'],
						['30', '5.7435', '$28,717.46']
					]
				}
			},
			{
				heading: 'Tips and limits',
				paragraphs: ['A future value is only as reliable as the rate behind it. Keep these points in mind:'],
				list: [
					'**Returns are not guaranteed.** Test a few rates, and be careful with high ones.',
					'**Prices rise too.** A future sum buys less than the same sum today. Check it with the [inflation calculator](/inflation-calculator).',
					'**Work backwards.** To find how much you need today for a goal, use the [present value calculator](/present-value-calculator).',
					'**Use yearly inputs for real-world plans.** The [savings calculator](/savings-calculator) takes a yearly rate and monthly deposits.',
					'**This tool ignores tax and fees.** Both lower what you keep.'
				]
			}
		],
		formulas: [
			{
				title: 'Future value of a lump sum',
				expression: 'FV = PV × (1 + r)ⁿ',
				variables: [
					{ symbol: 'FV', meaning: 'future value' },
					{ symbol: 'PV', meaning: 'present value, the amount you start with' },
					{ symbol: 'r', meaning: 'interest rate per period as a decimal (0.5% is 0.005)' },
					{ symbol: 'n', meaning: 'number of periods' }
				]
			},
			{
				title: 'Future value with regular payments',
				expression: 'FV = PV × (1 + r)ⁿ + PMT × ((1 + r)ⁿ − 1) ÷ r × d',
				variables: [
					{ symbol: 'PMT', meaning: 'payment added each period' },
					{ symbol: 'd', meaning: '1 for payments at the end of a period, or (1 + r) for payments at the beginning' }
				]
			}
		],
		example: {
			title: '$1,000 today plus $100 at the end of each month, 0.5% per month for 120 months',
			steps: [
				'Growth factor: 1.005¹²⁰ ≈ 1.819397',
				'Present value part: $1,000 × 1.819397 ≈ $1,819.40',
				'Annuity factor: (1.819397 − 1) ÷ 0.005 ≈ 163.8793',
				'Payment part: $100 × 163.8793 ≈ $16,387.93',
				'Future value: $1,819.40 + $16,387.93 ≈ $18,207.33'
			],
			result: 'Future value ≈ $18,207.33.'
		},
		faq: [
			{
				q: 'What is the future value formula?',
				a: 'For a lump sum, FV = PV × (1 + r)ⁿ. With regular payments, add PMT × ((1 + r)ⁿ − 1) ÷ r. The calculator applies both for you.'
			},
			{
				q: 'What is the difference between present value and future value?',
				a: 'Present value is what a sum is worth today. Future value is what it grows to later. They are two sides of the same calculation, so the present value calculator reverses this one.'
			},
			{
				q: 'What rate and periods should I enter?',
				a: 'Use the rate for a single period and the number of those periods. For monthly saving over 10 years, enter 120 periods and the monthly rate, which is the yearly rate divided by 12.'
			},
			{
				q: 'Should payments be at the beginning or the end?',
				a: 'Choose the one that matches your plan. Most deposits and loan payments come at the end of a period. Rent and some insurance payments come at the beginning.'
			},
			{
				q: 'Does future value include inflation?',
				a: 'No. The result is in future money, not in the buying power of today’s money. Prices usually rise, so the same sum buys less later.'
			},
			{
				q: 'Can I use a rate of 0%?',
				a: 'Yes. The future value is then just your starting amount plus all the payments, with no growth.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. This tool ignores tax, fees and inflation and is not financial advice.'
	}
});
