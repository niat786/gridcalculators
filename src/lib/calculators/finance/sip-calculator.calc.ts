import { defineCalculator, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './sip-calculator.meta';

/**
 * Future value of a monthly SIP (systematic investment plan) with contributions at the START of each month:
 * FV = P × ((1 + i)ⁿ − 1) ÷ i × (1 + i), where i = annual rate ÷ 12 and n = months. i = 0 → P × n.
 * Checked against Bajaj AMC's documented example (₹15,000 a month, 12%, 15 years → ₹75,68,640)
 * and against the same formula evaluated by hand for ₹10,000 a month, 12%, 10 years (₹23,23,391).
 */
export function sipFutureValue(monthly: number, annualPct: number, months: number): number {
	const i = annualPct / 100 / 12;
	if (i === 0) return monthly * months;
	return monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'monthly', label: 'Monthly investment', type: 'number', default: 10000, min: 100, max: 10_000_000, step: 500, prefix: '$', suffix: '/mo' },
		{ id: 'rate', label: 'Expected annual return', type: 'number', default: 12, min: 0, max: 50, step: 0.1, suffix: '%', help: 'Average yearly return you expect' },
		{ id: 'years', label: 'Investment period', type: 'number', default: 10, min: 1, max: 50, step: 1, decimal: false, suffix: 'years' }
	],
	calculate(v: InputValues) {
		const monthly = Number(v.monthly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		if (!(monthly > 0) || !Number.isFinite(monthly) || !(rate >= 0 && rate <= 50) || !(years >= 1 && years <= 50) || !Number.isInteger(years)) {
			return { primaryResult: DASH, primaryLabel: 'Maturity value', summary: 'Enter a monthly amount above zero, a return from 0% to 50%, and 1 to 50 years.' };
		}

		const months = years * 12;
		const maturity = Math.round(sipFutureValue(monthly, rate, months));
		const invested = Math.round(monthly * months);
		const returns = maturity - invested;

		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [{ year: 0, invested: 0, value: 0 }];
		for (let y = 1; y <= years; y++) {
			const yInvested = Math.round(monthly * 12 * y);
			const yValue = Math.round(sipFutureValue(monthly, rate, 12 * y));
			chartData.push({ year: y, invested: yInvested, value: yValue });
			rows.push({
				year: String(y),
				invested: money(yInvested, true),
				value: money(yValue, true),
				returns: money(yValue - yInvested, true)
			});
		}

		return {
			primaryResult: money(maturity, true),
			primaryLabel: 'Estimated maturity value',
			summary: `${money(monthly, true)} a month for ${plural(years, 'year')} at ${num(rate, 2)}% a year.`,
			secondaryMetrics: [
				{ label: 'Amount invested', value: money(invested, true) },
				{ label: 'Estimated returns', value: money(returns, true) },
				{ label: 'Number of instalments', value: plural(months, 'instalment') },
				{ label: 'Returns as % of invested', value: `${num((returns / invested) * 100, 1)}%` }
			],
			chart: {
				type: 'line',
				title: 'Amount invested and maturity value over time',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'invested', label: 'Amount invested' },
					{ key: 'value', label: 'Estimated value' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Year-by-year growth',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'invested', label: 'Invested', align: 'end' },
					{ key: 'value', label: 'Value', align: 'end' },
					{ key: 'returns', label: 'Returns', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this SIP calculator to estimate how much a monthly systematic investment plan could grow into. Enter the amount you invest each month, the yearly return you expect and the number of years. The maths works in any currency.',
		howTo: [
			'Enter the amount you plan to invest every month.',
			'Enter the average yearly return you expect. Use a realistic figure, not the best year you have seen.',
			'Enter the number of years you will keep investing.',
			'Read the maturity value, then open the year-by-year table to see how it builds up.'
		],
		about: [
			{
				heading: 'What is a SIP?',
				paragraphs: [
					'A systematic investment plan (SIP) lets you invest a fixed amount in a mutual fund at regular intervals, usually every month. Instead of putting in one large sum, you buy a little at a time.',
					'This spreads your purchases over many market prices. As a result, you don’t have to guess the best day to invest. It also builds a habit, because the money leaves your account on a set date.',
					'A SIP is a method, not a product. Your actual return depends on the fund you choose and on the market. For a one-time investment, use the [lumpsum calculator](/lumpsum-calculator) instead.'
				]
			},
			{
				heading: 'How the SIP maturity value is calculated',
				paragraphs: [
					'Each monthly instalment grows at the monthly return, which is the yearly return divided by 12. The first instalment grows the longest, and the last one grows for just one month.',
					'The calculator adds up all of these growing instalments with the standard SIP formula shown below. It assumes each instalment goes in at the start of the month. That matches how most SIPs are debited.',
					'The yearly return is an average. Real funds go up and down, so your own result will not follow a straight line.'
				]
			},
			{
				heading: 'How the rate changes your result',
				paragraphs: [
					'Small changes in the expected return make a big difference over ten years. The table below uses ₹10,000 a month for 10 years, so you invest ₹12,00,000 in every row.'
				],
				table: {
					caption: '₹10,000 a month for 10 years',
					columns: ['Expected return', 'Maturity value', 'Estimated returns'],
					rows: [
						['8% a year', '₹18,41,657', '₹6,41,657'],
						['10% a year', '₹20,65,520', '₹8,65,520'],
						['12% a year', '₹23,23,391', '₹11,23,391'],
						['15% a year', '₹27,86,573', '₹15,86,573']
					]
				}
			},
			{
				heading: 'Why time matters more than the amount',
				paragraphs: [
					'Compounding means your returns earn returns of their own. This effect is small in the first few years and large in the last few. So the length of your SIP often matters more than its size.',
					'For example, ₹5,000 a month for 20 years at 12% grows to ₹49,95,740. By contrast, ₹10,000 a month for 10 years grows to ₹23,23,391. Both invest ₹12,00,000, but the longer plan ends up more than twice as large.'
				],
				table: {
					caption: '₹10,000 a month at 12% a year',
					columns: ['Years', 'Amount invested', 'Maturity value'],
					rows: [
						['5', '₹6,00,000', '₹8,24,864'],
						['10', '₹12,00,000', '₹23,23,391'],
						['15', '₹18,00,000', '₹50,45,760'],
						['20', '₹24,00,000', '₹99,91,479'],
						['30', '₹36,00,000', '₹3,52,99,138']
					]
				}
			},
			{
				heading: 'Tips for planning a SIP',
				paragraphs: ['A calculator gives you a target. These habits help you reach it:'],
				list: [
					'**Start early.** At 12%, starting 10 years sooner turns ₹99,91,479 (20 years) into ₹3,52,99,138 (30 years) for the same ₹10,000 a month.',
					'**Raise the amount as your pay rises.** The [step-up SIP calculator](/step-up-sip-calculator) shows how a yearly increase changes the result.',
					'**Test a lower return too.** If a plan only works at 15%, it isn’t a safe plan.',
					'**Plan the exit.** When the goal is near, the [SWP calculator](/swp-calculator) shows how a lump sum can pay you every month.',
					'**Remember tax.** Gains on equity funds are taxed when you sell. Estimate it with the [capital gains tax calculator](/capital-gains-tax-calculator-india).',
					'**Compare with safer options.** A [PPF account](/ppf-calculator) or an [FD](/fd-calculator) has lower, steadier returns.'
				]
			}
		],
		formulas: [
			{
				title: 'SIP future value',
				expression: 'FV = P × ((1 + i)ⁿ − 1) ÷ i × (1 + i)',
				variables: [
					{ symbol: 'FV', meaning: 'maturity value at the end of the period' },
					{ symbol: 'P', meaning: 'amount invested each month' },
					{ symbol: 'i', meaning: 'monthly return (annual return ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly instalments (years × 12)' }
				]
			},
			{
				title: 'Returns',
				expression: 'Estimated returns = maturity value − amount invested, where amount invested = P × n',
				variables: []
			}
		],
		example: {
			title: '₹10,000 a month for 10 years at 12% a year',
			steps: [
				'Monthly return: i = 12 ÷ 12 ÷ 100 = 0.01',
				'Number of instalments: n = 10 × 12 = 120',
				'Growth factor: (1.01)¹²⁰ ≈ 3.300387, so (3.300387 − 1) ÷ 0.01 ≈ 230.0387',
				'Start-of-month adjustment: 230.0387 × 1.01 ≈ 232.3391',
				'FV = ₹10,000 × 232.3391 ≈ ₹23,23,391',
				'Amount invested = ₹10,000 × 120 = ₹12,00,000'
			],
			result: 'Maturity value ₹23,23,391. Amount invested ₹12,00,000. Estimated returns ₹11,23,391.'
		},
		faq: [
			{
				q: 'How is the SIP return calculated?',
				a: 'The calculator grows each monthly instalment at the yearly return divided by 12, for as many months as it stays invested. It then adds them all up. The formula is shown above.'
			},
			{
				q: 'Why does the calculator assume contributions at the start of the month?',
				a: 'SIP instalments are usually debited at the start of the month, so each one earns a full month of growth. This matches the standard SIP formula used by Indian fund houses.'
			},
			{
				q: 'What return should I expect from a SIP?',
				a: 'Nobody can say for sure. Equity funds can swing a lot from year to year. Try a low, a middle and a high figure, such as 8%, 10% and 12%, and plan around the low one.'
			},
			{
				q: 'Are SIP returns guaranteed?',
				a: 'No. The expected return is an assumption. Market-linked returns can be higher or lower in any period, and a SIP does not protect you from losses.'
			},
			{
				q: 'Can I use this SIP calculator outside India?',
				a: 'Yes. The formula is the same for any monthly investing plan, and you can switch the currency at the top of the calculator. Local rules for tax and fees will differ.'
			},
			{
				q: 'What is the difference between a SIP and a lumpsum?',
				a: 'A SIP invests a fixed amount every month. A lumpsum invests everything at once. Compare both with the [lumpsum calculator](/lumpsum-calculator).'
			}
		],
		sources: [
			{
				title: 'Bajaj AMC — SIP calculator: estimate the future value of your SIP investments',
				url: 'https://www.bajajamc.com/knowledge-centre/sip-calculator-estimate-the-future-value-of-your-sip-investments'
			},
			{
				title: 'Aditya Birla Capital — SIP calculator (investor education)',
				url: 'https://mutualfund.adityabirlacapital.com/investor-education/sip-calculator'
			},
			{ title: 'AMFI — Association of Mutual Funds in India', url: 'https://www.amfiindia.com/' }
		],
		disclaimer:
			'This is an estimate for illustration only. It is not investment advice, and mutual fund returns are not guaranteed. Tax, fund charges and exit loads are not included.'
	}
});
