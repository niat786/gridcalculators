import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './real-estate-calculator.meta';

/** Fixed-rate monthly payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n; P = 0 → 0. */
function payment(principal: number, annualRatePct: number, months: number): number {
	if (principal <= 0) return 0;
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

/** Net present value with the first flow at time 0 and each later flow one year further on. */
function npv(flows: number[], rate: number): number {
	let total = 0;
	for (let t = 0; t < flows.length; t++) total += flows[t] / Math.pow(1 + rate, t);
	return total;
}

/** Yearly IRR by bisection. Returns null when the flows never change sign. */
function irrOf(flows: number[]): number | null {
	let lo = -0.99;
	let hi = 10;
	let fLo = npv(flows, lo);
	const fHi = npv(flows, hi);
	if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || (fLo > 0) === (fHi > 0)) return null;
	for (let i = 0; i < 300; i++) {
		const mid = (lo + hi) / 2;
		const fMid = npv(flows, mid);
		if (fMid === 0) return mid;
		if ((fMid > 0) === (fLo > 0)) {
			lo = mid;
			fLo = fMid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Purchase price', type: 'number', default: 300000, min: 0, max: 1_000_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 25, min: 0, max: 100, step: 0.5, suffix: '%' },
		{ id: 'rate', label: 'Mortgage interest rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'term', label: 'Loan term', type: 'number', default: 30, min: 1, max: 40, step: 1, suffix: 'years', decimal: false, width: 'half' },
		{ id: 'closing', label: 'Closing costs', type: 'number', default: 3, min: 0, max: 20, step: 0.1, suffix: '%', help: 'Share of the price, paid at purchase.', width: 'half' },
		{ id: 'rent', label: 'Monthly rent', type: 'number', default: 2800, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo' },
		{ id: 'rentGrowth', label: 'Rent increase per year', type: 'number', default: 3, min: -20, max: 30, step: 0.1, suffix: '%', width: 'half' },
		{ id: 'vacancy', label: 'Vacancy allowance', type: 'number', default: 5, min: 0, max: 100, step: 0.5, suffix: '%', help: 'Share of gross rent lost to empty months.', width: 'half' },
		{ id: 'expenses', label: 'Operating expenses', type: 'number', default: 35, min: 0, max: 100, step: 0.5, suffix: '%', help: 'Taxes, insurance, repairs and management, as a share of collected rent.' },
		{ id: 'appreciation', label: 'Property value growth per year', type: 'number', default: 3, min: -50, max: 50, step: 0.1, suffix: '%', width: 'half' },
		{ id: 'sellingCosts', label: 'Selling costs', type: 'number', default: 6, min: 0, max: 20, step: 0.1, suffix: '%', help: 'Share of the sale price.', width: 'half' },
		{ id: 'years', label: 'Years held', type: 'number', default: 10, min: 1, max: 40, step: 1, suffix: 'years', decimal: false }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const downPct = Number(v.down);
		const rate = Number(v.rate);
		const term = Number(v.term);
		const closingPct = Number(v.closing);
		const rent = Number(v.rent);
		const rentGrowth = Number(v.rentGrowth);
		const vacancyPct = Number(v.vacancy);
		const expensePct = Number(v.expenses);
		const appreciation = Number(v.appreciation);
		const sellPct = Number(v.sellingCosts);
		const years = Number(v.years);
		const primaryLabel = 'Annualized return (IRR)';
		const invalid = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel, summary });

		if (
			!(price > 0) || !Number.isFinite(price) ||
			!(downPct >= 0 && downPct <= 100) ||
			!(rate >= 0 && rate <= 30) ||
			!Number.isInteger(term) || term < 1 || term > 40 ||
			!(closingPct >= 0 && closingPct <= 20) ||
			!(rent >= 0) ||
			!(rentGrowth > -100 && rentGrowth <= 100) ||
			!(vacancyPct >= 0 && vacancyPct <= 100) ||
			!(expensePct >= 0 && expensePct <= 100) ||
			!(appreciation > -100 && appreciation <= 100) ||
			!(sellPct >= 0 && sellPct <= 20) ||
			!Number.isInteger(years) || years < 1 || years > 40
		) {
			return invalid('Check the price, loan, rent, rates and holding period. Years held must be a whole number from 1 to 40.');
		}

		const loan = price * (1 - downPct / 100);
		const equity0 = (price * downPct) / 100 + (price * closingPct) / 100;
		if (!(equity0 > 0)) return invalid('Enter a down payment or closing costs above zero, so there is cash invested to measure a return on.');

		const monthly = payment(loan, rate, term * 12);
		const monthlyRate = rate / 1200;
		const loanMonths = term * 12;
		let balance = loan;
		const flows: number[] = [-equity0];
		const rows: Record<string, string>[] = [];
		let sumCoC = 0;

		for (let t = 1; t <= years; t++) {
			const gross = rent * 12 * Math.pow(1 + rentGrowth / 100, t - 1);
			const effective = gross * (1 - vacancyPct / 100);
			const operating = effective * (expensePct / 100);
			const noi = effective - operating;

			let debt = 0;
			for (let m = 0; m < 12; m++) {
				const month = (t - 1) * 12 + m + 1;
				if (month <= loanMonths && balance > 0) {
					const interest = balance * monthlyRate;
					const principal = Math.min(monthly - interest, balance);
					balance -= principal;
					debt += interest + principal;
				}
			}

			const cashFlow = noi - debt;
			const coc = cashFlow / equity0;
			sumCoC += coc;
			const value = price * Math.pow(1 + appreciation / 100, t);
			const equity = value * (1 - sellPct / 100) - balance;
			rows.push({
				year: String(t),
				cash: money(cashFlow),
				value: money(value),
				balance: money(Math.max(0, balance)),
				equity: money(equity),
				coc: pct(coc * 100, 2)
			});
			flows.push(cashFlow);
		}

		const finalValue = price * Math.pow(1 + appreciation / 100, years);
		const proceeds = finalValue * (1 - sellPct / 100) - balance;
		flows[years] += proceeds;

		const irr = irrOf(flows);
		if (irr === null) return invalid('The return could not be calculated from these inputs. Check the price, rent and loan.');

		const rawProfit = flows.slice(1).reduce((s, x) => s + x, 0) - equity0;
		const profit = Math.abs(rawProfit) < 0.005 ? 0 : rawProfit;
		const avgCoC = (sumCoC / years) * 100;

		// Anything smaller than the displayed precision is shown as exactly zero, never as −0%.
		const irrPct = Math.abs(irr * 100) < 0.005 ? 0 : irr * 100;

		return {
			primaryResult: pct(irrPct, 2),
			primaryLabel,
			summary: `Over ${plural(years, 'year')} the total ${profit >= 0 ? 'profit' : 'loss'} is ${money(Math.abs(profit))}, including the sale.`,
			secondaryMetrics: [
				{ label: 'Total profit', value: money(profit) },
				{ label: 'Equity at sale (after loan and selling costs)', value: money(proceeds) },
				{ label: 'Average cash-on-cash return', value: pct(avgCoC, 2) },
				{ label: 'Cash invested up front', value: money(equity0) },
				{ label: 'Monthly mortgage payment', value: money(monthly) }
			],
			table: {
				title: 'Year by year (sale proceeds are added in the last year for the IRR)',
				collapsed: false,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'cash', label: 'Cash flow', align: 'end' },
					{ key: 'value', label: 'Property value', align: 'end' },
					{ key: 'balance', label: 'Loan balance', align: 'end' },
					{ key: 'equity', label: 'Equity if sold', align: 'end' },
					{ key: 'coc', label: 'Cash-on-cash', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this real estate investment calculator to estimate the return on a rental property over the years you hold it. It combines rent, mortgage payments, costs and the sale, and shows the annualized return (IRR) and the cash-on-cash return.',
		howTo: [
			'Enter the purchase price, down payment, mortgage rate, loan term and closing costs.',
			'Enter the monthly rent, how fast it rises, the vacancy allowance and your operating expenses as a share of rent.',
			'Enter how fast you expect the property value to grow, the selling costs and the years you plan to hold it.',
			'Read the annualized return, the total profit and the equity at sale. Then open the year-by-year table.'
		],
		about: [
			{
				heading: 'What does this calculator measure?',
				paragraphs: [
					'It treats a rental property as an investment with cash flows over time. First, you pay the down payment and closing costs. Then, each year, you collect rent and pay expenses and the mortgage. At the end, you sell, repay the loan and keep what is left.',
					'Next, it finds the single yearly rate that fits all of those cash flows. This is the internal rate of return (IRR), and it is a good way to compare a property with other investments, because it counts timing and the sale.'
				]
			},
			{
				heading: 'How the return is built',
				paragraphs: [
					'Each year, the tool takes the rent, removes the vacancy allowance, and then takes off operating expenses as a share of the rent. What is left is the net operating income (NOI). After that, it subtracts the mortgage payments to give the cash flow.',
					'Also, in the last year, the sale adds more cash. That is the sale price, less selling costs, less the remaining loan. For the maths behind IRR, see the [IRR calculator](/irr-calculator).'
				]
			},
			{
				heading: 'Two kinds of return',
				paragraphs: ['The calculator shows two measures, but they answer different questions:'],
				list: [
					'**Annualized return (IRR).** The yearly return on the cash you put in, including rent, loan paydown, value growth and the sale.',
					'**Cash-on-cash return.** The yearly cash flow divided by the cash you invested up front. It ignores value growth and the sale.'
				]
			},
			{
				heading: 'What changes the result most',
				paragraphs: [
					'Property value growth often matters most, but nobody knows it in advance. The table below uses a $300,000 property, 25% down, 6.5% over 30 years, $2,800 rent and a 10-year hold. Rent rises 3% a year, and costs follow the defaults. Only the value growth changes.'
				],
				table: {
					caption: 'Value growth per year compared with the result',
					columns: ['Value growth', 'Annualized return', 'Total profit'],
					rows: [
						['0%', '8.07%', '$74,447.92'],
						['3%', '13.67%', '$171,432.34'],
						['6%', '18.35%', '$297,466.97']
					]
				}
			},
			{
				heading: 'How long you hold the property',
				paragraphs: [
					'The same property gives a different return over different hold times. For example, closing and selling costs weigh more on a short hold. The table uses the default inputs with 3% yearly growth.'
				],
				table: {
					caption: 'Years held compared with the result',
					columns: ['Years held', 'Annualized return', 'Average cash-on-cash', 'Total profit'],
					rows: [
						['5', '11.81%', '5.91%', '$57,115.36'],
						['10', '13.67%', '8%', '$171,432.34'],
						['20', '13.44%', '12.87%', '$516,266.28']
					]
				}
			},
			{
				heading: 'Limits and tips',
				paragraphs: ['A property is a large, risky purchase. Returns are not guaranteed, and values can fall. So keep these points in mind:'],
				list: [
					'**Test a cautious case.** Try zero or negative value growth, higher vacancy and higher costs.',
					'**Rely less on growth.** If the deal only works with high growth, then it is risky.',
					'**This tool ignores tax.** Income tax, capital gains tax and any property depreciation benefits vary a lot by country. See the [depreciation calculator](/depreciation-calculator) for the accounting side.',
					'**Check the monthly numbers.** The [rental property calculator](/rental-property-calculator) shows cash flow and cap rate. The [mortgage calculator](/mortgage-calculator) shows the loan in detail.',
					'**Compare with renting.** If you are weighing a home for yourself, use the [rent vs buy calculator](/rent-vs-buy-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Net operating income and cash flow',
				expression: 'NOI = Rent × (1 − vacancy) × (1 − expenses);  Cash flow = NOI − mortgage payments',
				variables: [
					{ symbol: 'Rent', meaning: 'yearly rent for that year (it grows by the rent increase each year)' },
					{ symbol: 'vacancy, expenses', meaning: 'shares of rent, as decimals' }
				]
			},
			{
				title: 'Cash from the sale',
				expression: 'Proceeds = Value × (1 − selling costs) − loan balance',
				variables: [{ symbol: 'Value', meaning: 'price × (1 + growth)^years' }]
			},
			{
				title: 'Annualized return (IRR)',
				expression: '0 = −Cash invested + Σ Cash flowₜ ÷ (1 + IRR)ᵗ + Proceeds ÷ (1 + IRR)ⁿ',
				variables: [
					{ symbol: 'Cash invested', meaning: 'down payment plus closing costs' },
					{ symbol: 'n', meaning: 'years held' }
				]
			}
		],
		example: {
			title: 'A $300,000 rental with 25% down, rented at $2,800 a month and sold after 10 years',
			steps: [
				'Cash invested: 25% down ($75,000) plus 3% closing ($9,000) = $84,000. Loan: $225,000 at 6.5% over 30 years, so M ≈ $1,422.15',
				'Year 1 rent: 2,800 × 12 = $33,600, less 5% vacancy = $31,920, less 35% expenses = $20,748 of NOI',
				'Year 1 cash flow: 20,748 − 12 × 1,422.15 = 20,748 − 17,065.84 = $3,682.16',
				'Sale in year 10: value 300,000 × 1.03¹⁰ ≈ $403,174.91, less 6% selling costs = $378,984.42, less the loan balance of $190,746.28 = $188,238.13',
				'Total profit: all cash flows plus the sale, less the $84,000 invested, is $171,432.34. The IRR is 13.67%'
			],
			result:
				'Annualized return of 13.67%, a total profit of $171,432.34 and equity at sale of $188,238.13. The average cash-on-cash return is 8.00% a year.'
		},
		faq: [
			{
				q: 'How do I calculate the return on a rental property?',
				a: 'Add up the cash you put in, the yearly cash flow after the mortgage and costs, and the cash from the sale. The IRR is the yearly rate that fits all of those cash flows. This calculator does it for you.'
			},
			{
				q: 'What is cash-on-cash return?',
				a: 'It is the yearly cash flow divided by the cash you invested up front. It shows the income return only, and ignores value growth and the sale.'
			},
			{
				q: 'What is a good real estate return?',
				a: 'It depends on the market, the risk and what else you could do with the money. Compare the IRR with safer options, and test cautious inputs before relying on any number.'
			},
			{
				q: 'What expense share should I use?',
				a: 'Add up property tax, insurance, repairs and management, as a share of the rent you collect. The default is 35%. Use your own figures, because costs vary widely.'
			},
			{
				q: 'Does this include tax?',
				a: 'No. Income tax, capital gains tax, stamp duty and property tax breaks depend on the country and your situation. Ask a tax adviser.'
			},
			{
				q: 'Why does the return depend so much on value growth?',
				a: 'Because the property is bought with a loan. A small change in value is a big change compared with the cash you invested. This works both ways, so a fall in value cuts the return sharply.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Property values and rents can fall, and investment returns are not guaranteed. This tool ignores tax and is not financial or investment advice.'
	}
});
