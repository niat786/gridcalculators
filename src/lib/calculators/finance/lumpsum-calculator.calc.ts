import { defineCalculator, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './lumpsum-calculator.meta';

/**
 * Lumpsum future value with annual compounding: FV = P × (1 + r)ⁿ.
 * Bajaj AMC's documented example: ₹1,00,000 for 5 years at 12% → about ₹1.76 lakh (₹1,76,234 exact).
 */
export function lumpsumFutureValue(principal: number, annualPct: number, years: number): number {
	return principal * Math.pow(1 + annualPct / 100, years);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount invested', type: 'number', default: 100000, min: 1, max: 1_000_000_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Expected annual return', type: 'number', default: 12, min: 0, max: 50, step: 0.1, suffix: '%', help: 'Assumed yearly return, compounded once a year' },
		{ id: 'years', label: 'Investment period', type: 'number', default: 10, min: 1, max: 50, step: 1, decimal: false, suffix: 'years' }
	],
	calculate(v: InputValues) {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const years = Number(v.years);
		if (!(amount > 0) || !Number.isFinite(amount) || !(rate >= 0 && rate <= 50) || !(years >= 1 && years <= 50) || !Number.isInteger(years)) {
			return { primaryResult: DASH, primaryLabel: 'Value at maturity', summary: 'Enter an amount above zero, a return from 0% to 50%, and 1 to 50 years.' };
		}

		const value = Math.round(lumpsumFutureValue(amount, rate, years));
		const invested = Math.round(amount);
		const gain = value - invested;

		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [];
		let prev = invested;
		for (let y = 0; y <= years; y++) {
			const yValue = y === 0 ? invested : Math.round(lumpsumFutureValue(amount, rate, y));
			chartData.push({ year: y, invested, value: yValue });
			if (y > 0) {
				rows.push({
					year: String(y),
					value: money(yValue, true),
					growth: money(yValue - prev, true)
				});
			}
			prev = yValue;
		}

		return {
			primaryResult: money(value, true),
			primaryLabel: 'Value at maturity',
			summary: `${money(invested, true)} left to grow for ${plural(years, 'year')} at ${num(rate, 2)}% a year.`,
			secondaryMetrics: [
				{ label: 'Amount invested', value: money(invested, true) },
				{ label: 'Estimated gain', value: money(gain, true) },
				{ label: 'Growth multiple', value: `${num(value / invested, 2)}×` },
				{ label: 'Total return', value: `${num((gain / invested) * 100, 1)}%` }
			],
			chart: {
				type: 'line',
				title: 'Amount invested and value over time',
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
					{ key: 'value', label: 'Value at year end', align: 'end' },
					{ key: 'growth', label: 'Growth in year', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this lumpsum calculator to estimate what a one-time investment could be worth after a number of years at a steady yearly return. It suits a single deposit or fund purchase, not monthly payments. The maths works in any currency.',
		howTo: [
			'Enter the amount you invest once, at the start.',
			'Enter the average yearly return you expect.',
			'Enter how many years the money will stay invested.',
			'Read the value at maturity, then open the table to see the growth each year.'
		],
		about: [
			{
				heading: 'What is a lumpsum investment?',
				paragraphs: [
					'A lumpsum investment is a single payment made all at once. For example, you might put a bonus, an inheritance or the sale money from a property into a mutual fund or a deposit.',
					'Because the whole amount is invested from day one, it has the most time to grow. However, you also take the market risk at one price, instead of spreading it over many months.'
				]
			},
			{
				heading: 'How the lumpsum value is calculated',
				paragraphs: [
					'The calculator grows your money once a year. Each year, the balance is multiplied by one plus the yearly return. After n years, the balance is the starting amount times that factor, n times over.',
					'For example, ₹1,00,000 at 12% becomes ₹1,12,000 after one year. In the second year, the 12% is earned on ₹1,12,000, not on ₹1,00,000. That is compounding.',
					'The formula is shown below. It has no monthly payments, so it differs from the [SIP calculator](/sip-calculator).'
				]
			},
			{
				heading: 'How time changes your result',
				paragraphs: [
					'Compounding rewards patience. The table below shows ₹1,00,000 at 12% a year. The money roughly doubles in about 6 years, and the growth speeds up after that.'
				],
				table: {
					caption: '₹1,00,000 at 12% a year',
					columns: ['Years', 'Value at maturity', 'Growth multiple'],
					rows: [
						['5', '₹1,76,234', '1.76×'],
						['10', '₹3,10,585', '3.11×'],
						['15', '₹5,47,357', '5.47×'],
						['20', '₹9,64,629', '9.65×'],
						['30', '₹29,95,992', '29.96×']
					]
				}
			},
			{
				heading: 'How the rate changes your result',
				paragraphs: [
					'The yearly return matters just as much. Over 10 years, a few extra points of return add a lot. Use a cautious rate when you plan, because past returns don’t guarantee future ones.'
				],
				table: {
					caption: '₹1,00,000 for 10 years',
					columns: ['Yearly return', 'Value at maturity', 'Estimated gain'],
					rows: [
						['8%', '₹2,15,892', '₹1,15,892'],
						['10%', '₹2,59,374', '₹1,59,374'],
						['12%', '₹3,10,585', '₹2,10,585'],
						['15%', '₹4,04,556', '₹3,04,556']
					]
				}
			},
			{
				heading: 'Lumpsum or SIP?',
				paragraphs: [
					'Both can reach a goal. A lumpsum needs money you already have. A SIP uses your monthly income, so it fits most salaried people.',
					'The results are not comparable rupee for rupee. For example, ₹12,00,000 invested once for 10 years at 12% grows to ₹37,27,018. The same ₹12,00,000 paid as ₹10,000 a month grows to ₹23,23,391, because later instalments have less time to grow.',
					'If you have a large sum, you can also split it into parts. For more on the monthly route, see the [SIP calculator](/sip-calculator), the [step-up SIP calculator](/step-up-sip-calculator), or the [PPF calculator](/ppf-calculator) for a tax-free option.'
				]
			},
			{
				heading: 'Things to check before you invest a lump sum',
				paragraphs: ['A calculator shows the best case. Before you commit a large amount, think about these points:'],
				list: [
					'**Your time horizon.** Money you need within a few years is better in a deposit than in a fund that can fall.',
					'**Your emergency fund.** Keep enough cash aside first, so you never have to sell in a bad year.',
					'**Tax on the gain.** Equity funds, debt funds and property are taxed differently. Check the rate before you compare options.',
					'**Charges.** Fund fees and exit loads reduce your return a little every year.',
					'**A safe floor.** A [fixed deposit](/fd-calculator) shows what you would earn with little risk, so you can judge if extra risk is worth it.'
				]
			}
		],
		formulas: [
			{
				title: 'Lumpsum future value',
				expression: 'FV = P × (1 + r)ⁿ',
				variables: [
					{ symbol: 'FV', meaning: 'value at the end of the period' },
					{ symbol: 'P', meaning: 'amount invested once' },
					{ symbol: 'r', meaning: 'annual return as a decimal (12% = 0.12)' },
					{ symbol: 'n', meaning: 'number of years' }
				]
			}
		],
		example: {
			title: '₹1,00,000 invested for 5 years at 12% a year',
			steps: [
				'Growth factor: (1 + 0.12)⁵ = 1.12⁵ ≈ 1.762342',
				'Value: FV = ₹1,00,000 × 1.762342 ≈ ₹1,76,234',
				'Estimated gain = ₹1,76,234 − ₹1,00,000 = ₹76,234'
			],
			result: 'Value at maturity ₹1,76,234. Estimated gain ₹76,234.'
		},
		faq: [
			{
				q: 'How do I calculate the future value of a lumpsum investment?',
				a: 'Multiply the amount by (1 + yearly return) raised to the number of years. For ₹1,00,000 at 12% for 5 years, that is ₹1,00,000 × 1.12⁵, which is about ₹1,76,234.'
			},
			{
				q: 'What is the difference between a lumpsum and a SIP?',
				a: 'A lumpsum is one investment made at the start. A SIP invests a smaller amount at regular intervals. A lumpsum has more time in the market from day one, while a SIP spreads the entry price over time.'
			},
			{
				q: 'Why is the return compounded once a year here?',
				a: 'The formula uses one yearly rate and whole years, so each year the value grows by the full return. Investments that compound more often can end slightly higher at the same rate. For deposits, use the [FD calculator](/fd-calculator).'
			},
			{
				q: 'Does this include tax or fees?',
				a: 'No. The calculator does not deduct taxes, exit loads, charges or inflation. Subtract those yourself if you need a net figure. For tax on fund gains, try the [capital gains tax calculator](/capital-gains-tax-calculator-india).'
			},
			{
				q: 'Can I use this lumpsum calculator outside India?',
				a: 'Yes. The formula is the same everywhere. Switch the currency at the top of the calculator. Local tax rules and fees will differ.'
			}
		],
		sources: [
			{
				title: 'Bajaj AMC — Everything you must know about a lumpsum calculator',
				url: 'https://www.bajajamc.com/knowledge-centre/articles/everything-you-must-know-about-a-lumpsum-calculator'
			},
			{ title: 'AMFI — Association of Mutual Funds in India', url: 'https://www.amfiindia.com/' }
		],
		disclaimer:
			'This is an estimate for illustration only. It is not investment advice, and returns are not guaranteed.'
	}
});
