import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './present-value-calculator.meta';

/**
 * Inverse of the future value calculator: solve PV from FV = PV × (1 + r)ⁿ + PMT × annuity.
 * Payments you add each period reduce the lump sum needed today.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'fv', label: 'Future value', type: 'number', default: 10000, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'The amount you want to reach.' },
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
		{
			id: 'timing',
			label: 'Payment timing',
			type: 'select',
			display: 'segmented',
			default: 'end',
			options: [
				{ label: 'End', value: 'end' },
				{ label: 'Beginning', value: 'beginning' }
			]
		}
	],
	calculate(v): CalculationResult {
		const fv = Number(v.fv);
		const rate = Number(v.rate);
		const n = Number(v.periods);
		const pmt = Number(v.pmt);
		const timing = String(v.timing);
		if (
			!(fv >= 0) ||
			!(pmt >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(Number.isInteger(n) && n >= 1 && n <= 10_000) ||
			(timing !== 'end' && timing !== 'beginning')
		) {
			return { primaryResult: DASH, primaryLabel: 'Present value', summary: 'Check the amounts, rate and periods.' };
		}

		const r = rate / 100;
		const due = timing === 'beginning' ? 1 + r : 1;
		const growth = Math.pow(1 + r, n);
		const annuity = r === 0 ? n : ((growth - 1) / r) * due;
		const pv = (fv - pmt * annuity) / growth;
		const paymentsTotal = pmt * n;

		return {
			primaryResult: money(pv),
			primaryLabel: 'Present value',
			summary:
				pv >= 0
					? `You need ${money(pv)} today to reach ${money(fv)} in ${plural(n, 'period')}.`
					: `Your payments alone pass the goal, so no lump sum is needed.`,
			secondaryMetrics: [
				{ label: 'Payments you add', value: money(paymentsTotal) },
				{ label: 'Growth from interest', value: money(fv - pv - paymentsTotal) },
				{ label: 'Discount factor', value: num(1 / growth, 6) }
			]
		};
	},
	content: {
		intro:
			'Use this present value calculator to find how much a future sum of money is worth today. It also shows how much you need to put in now to reach a goal, with or without regular payments along the way.',
		howTo: [
			'Enter the future value, which is the amount you want or expect to have.',
			'Enter the interest rate for one period (also called the discount rate) and the number of periods.',
			'If you will add money each period, enter the payment and choose end or beginning of the period.',
			'Read the present value, which is the lump sum needed today.'
		],
		about: [
			{
				heading: 'What is present value?',
				paragraphs: [
					'Present value is what a future amount is worth today. Money you receive later is worth less than the same money now, because money you have now can earn interest.',
					'Finance people call this the time value of money. Present value turns a future sum into a number you can compare with a price you pay today.'
				]
			},
			{
				heading: 'How present value is calculated',
				paragraphs: [
					'The calculator divides the future value by (1 + rate) once for each period. This is called discounting. The rate you use is the discount rate.',
					'If you plan to add a payment every period, those payments also grow. They cover part of the goal, so the lump sum you need today is smaller. The formulas below show both steps. To go the other way, use the [future value calculator](/future-value-calculator).'
				]
			},
			{
				heading: 'How the rate and time change present value',
				paragraphs: [
					'A higher rate or a longer wait makes the future amount worth less today. The table below discounts $10,000 over different rates and periods, with no payments.'
				],
				table: {
					caption: '$10,000 in the future, no payments',
					columns: ['Rate per period', 'Periods', 'Present value'],
					rows: [
						['3%', '10', '$7,440.94'],
						['6%', '10', '$5,583.95'],
						['10%', '10', '$3,855.43'],
						['6%', '20', '$3,118.05']
					]
				}
			},
			{
				heading: 'What regular payments do',
				paragraphs: [
					'Say your goal is $10,000 in 10 periods at 6%. With no payments, you need $5,583.95 today. If you add $500 each period, you need only $1,903.90 today.',
					'If your payments alone pass the goal, the result is negative. The calculator then tells you that no lump sum is needed.'
				]
			},
			{
				heading: 'Choosing a discount rate',
				paragraphs: [
					'The rate is the most important input, and it is your choice. A common approach is to use the return you could earn elsewhere on money with a similar level of risk. A safe savings rate gives a higher present value. A hopeful investment rate gives a lower one.',
					'Because nobody knows future returns, it is wise to run the calculator at two or three rates. If the answer changes a lot, the decision is sensitive to the rate.'
				]
			},
			{
				heading: 'Where present value is used',
				paragraphs: ['The idea shows up in many money decisions:'],
				list: [
					'**Setting a savings goal.** Find how much to put aside now, then check the monthly route with the [savings calculator](/savings-calculator).',
					'**Comparing payment offers.** A lump sum now can be worth more than larger payments later. Choose a rate that reflects your own alternatives.',
					'**Judging an investment.** Discount future cash flows, or use the [IRR calculator](/irr-calculator) and [payback period calculator](/payback-period-calculator).',
					'**Seeing the effect of prices.** The [inflation calculator](/inflation-calculator) shows how buying power changes over time.'
				]
			}
		],
		formulas: [
			{
				title: 'Present value of a lump sum',
				expression: 'PV = FV ÷ (1 + r)ⁿ',
				variables: [
					{ symbol: 'PV', meaning: 'present value, the amount needed today' },
					{ symbol: 'FV', meaning: 'future value, the amount you want later' },
					{ symbol: 'r', meaning: 'rate per period as a decimal (6% is 0.06)' },
					{ symbol: 'n', meaning: 'number of periods' }
				]
			},
			{
				title: 'With regular payments',
				expression: 'PV = (FV − PMT × ((1 + r)ⁿ − 1) ÷ r × d) ÷ (1 + r)ⁿ',
				variables: [
					{ symbol: 'PMT', meaning: 'payment added each period' },
					{ symbol: 'd', meaning: '1 for payments at the end of a period, or (1 + r) for payments at the beginning' }
				]
			}
		],
		example: {
			title: 'A $10,000 goal in 120 months at 0.5% per month, with no payments',
			steps: [
				'Growth factor: 1.005¹²⁰ ≈ 1.819397',
				'Discount factor: 1 ÷ 1.819397 ≈ 0.549633',
				'Present value: $10,000 × 0.549633 ≈ $5,496.33'
			],
			result: 'Present value ≈ $5,496.33. Invest that amount today and it grows to $10,000 in 120 months.'
		},
		faq: [
			{
				q: 'What is the present value formula?',
				a: 'PV = FV ÷ (1 + r)ⁿ. Divide the future amount by the growth factor for the rate and the number of periods. With extra payments, subtract their future value first.'
			},
			{
				q: 'What discount rate should I use?',
				a: 'Use the return you could expect from a similar alternative with similar risk. A higher rate lowers present value. Returns are not guaranteed, so try a few rates.'
			},
			{
				q: 'Why is present value lower than future value?',
				a: 'Because money today can earn interest. To reach a future amount you only need to invest a smaller sum now.'
			},
			{
				q: 'What is the difference between present value and net present value?',
				a: 'Present value discounts one amount or a series. Net present value (NPV) adds up the discounted cash flows of a project and subtracts the cost. It tells you whether a project beats your required rate.'
			},
			{
				q: 'Why is my result negative?',
				a: 'Your regular payments already grow to more than the goal. You do not need a starting sum. The tool shows the negative figure for reference.'
			},
			{
				q: 'Does the rate match my period?',
				a: 'It must. If you enter monthly periods, use the monthly rate. For yearly periods, use the yearly rate.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. The result depends on the rate you choose and is not financial advice.'
	}
});
