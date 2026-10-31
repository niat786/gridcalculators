import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, num } from '../format';
import meta from './rental-property-calculator.meta';

const ok = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Monthly principal and interest: M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = 0 → P ÷ n. */
function monthlyPayment(principal: number, annualPct: number, months: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Purchase price', type: 'number', default: 300000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 25, min: 0, max: 100, step: 0.5, suffix: '%' },
		{ id: 'rate', label: 'Mortgage rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%' },
		{
			id: 'term',
			label: 'Loan term',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: '15 yr', value: '15' },
				{ label: '20 yr', value: '20' },
				{ label: '25 yr', value: '25' },
				{ label: '30 yr', value: '30' }
			]
		},
		{
			id: 'closing',
			label: 'Closing costs',
			type: 'number',
			default: 6000,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			help: 'Paid at purchase, on top of the down payment'
		},
		{ id: 'rent', label: 'Monthly rent', type: 'number', default: 2400, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo' },
		{
			id: 'vacancy',
			label: 'Vacancy',
			type: 'number',
			default: 5,
			min: 0,
			max: 100,
			step: 0.5,
			suffix: '%',
			help: 'Share of gross rent you expect to lose to empty months and unpaid rent'
		},
		{ id: 'tax', label: 'Property tax', type: 'number', default: 3600, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{ id: 'insurance', label: 'Landlord insurance', type: 'number', default: 1200, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{
			id: 'maint',
			label: 'Maintenance',
			type: 'number',
			default: 5,
			min: 0,
			max: 100,
			step: 0.5,
			suffix: '%',
			help: 'Percent of collected rent'
		},
		{
			id: 'mgmt',
			label: 'Property management',
			type: 'number',
			default: 8,
			min: 0,
			max: 100,
			step: 0.5,
			suffix: '%',
			help: 'Percent of collected rent. Enter 0 if you manage it yourself.'
		},
		{ id: 'hoa', label: 'HOA fees', type: 'number', default: 100, min: 0, max: 100_000, step: 10, prefix: '$', suffix: '/mo' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const down = Number(v.down);
		const rate = Number(v.rate);
		const term = Number(v.term);
		const closing = Number(v.closing);
		const rent = Number(v.rent);
		const vacancy = Number(v.vacancy);
		const tax = Number(v.tax);
		const insurance = Number(v.insurance);
		const maint = Number(v.maint);
		const mgmt = Number(v.mgmt);
		const hoa = Number(v.hoa);

		if (
			!ok(price, 1, 1e9) ||
			!ok(down, 0, 100) ||
			!ok(rate, 0, 30) ||
			![15, 20, 25, 30].includes(term) ||
			!ok(closing, 0, 1e9) ||
			!ok(rent, 0, 1e9) ||
			!ok(vacancy, 0, 100) ||
			!ok(tax, 0, 1e9) ||
			!ok(insurance, 0, 1e9) ||
			!ok(maint, 0, 100) ||
			!ok(mgmt, 0, 100) ||
			!ok(hoa, 0, 1e9)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly cash flow',
				summary: 'Enter a purchase price, a down payment below 100% or equal to it, and valid rent and expense amounts.'
			};
		}

		const downPayment = price * (down / 100);
		const loan = price - downPayment;
		const monthlyPI = monthlyPayment(loan, rate, term * 12);
		const annualDebt = monthlyPI * 12;

		const grossRent = rent * 12;
		const collectedRent = grossRent * (1 - vacancy / 100);
		const operating =
			tax + insurance + collectedRent * (maint / 100) + collectedRent * (mgmt / 100) + hoa * 12;
		const noi = collectedRent - operating;
		const capRate = (noi / price) * 100;

		const cashInvested = downPayment + closing;
		const annualCashFlow = noi - annualDebt;
		const monthlyCashFlow = annualCashFlow / 12;
		const cashOnCash = cashInvested > 0 ? pct((annualCashFlow / cashInvested) * 100, 2) : DASH;

		const summary =
			monthlyCashFlow >= 0
				? `After vacancy, expenses and the mortgage, the property leaves ${money(monthlyCashFlow)} a month.`
				: `After vacancy, expenses and the mortgage, you pay ${money(-monthlyCashFlow)} a month out of pocket.`;

		return {
			primaryResult: money(monthlyCashFlow),
			primaryLabel: 'Monthly cash flow',
			summary,
			secondaryMetrics: [
				{ label: 'Net operating income (yearly)', value: money(noi) },
				{ label: 'Cap rate', value: pct(capRate, 2) },
				{ label: 'Cash-on-cash return', value: cashOnCash },
				{ label: 'Cash invested', value: money(cashInvested) },
				{ label: 'Monthly mortgage payment', value: money(monthlyPI) },
				{ label: 'Loan amount', value: money(loan) }
			]
		};
	},
	content: {
		intro:
			'Use this rental property calculator to check whether a property pays for itself. Enter the price, loan, rent and costs to see the monthly cash flow, net operating income, cap rate and cash-on-cash return.',
		howTo: [
			'Enter the purchase price, the down payment, the mortgage rate and the loan term.',
			'Enter your closing costs and the monthly rent you expect.',
			'Enter vacancy, property tax, insurance, maintenance, management and any HOA or service fees.',
			'Read the monthly cash flow first. Then check the cap rate and the cash-on-cash return.'
		],
		about: [
			{
				heading: 'What is rental property cash flow?',
				paragraphs: [
					'Cash flow is the money left each month after you pay everything the property costs. First, you start with the rent and take off the share lost to empty months. Then you pay the running costs and the mortgage. What remains is your cash flow, and it can be positive or negative.',
					'A negative cash flow means you pay out of pocket each month to keep the property. Some investors accept that for future value growth, but it adds risk.'
				]
			},
			{
				heading: 'Net operating income and cap rate',
				paragraphs: [
					'Net operating income (NOI) is the rent you collect minus operating costs, before the mortgage. Operating costs are property tax, insurance, maintenance, management and HOA or service fees.',
					'The cap rate is the yearly NOI divided by the purchase price. It shows the return on the property itself, without the loan. So it is useful for comparing properties with different financing.'
				]
			},
			{
				heading: 'Cash-on-cash return',
				paragraphs: [
					'Cash-on-cash return is the yearly cash flow divided by the cash you put in. Your cash in is the down payment plus closing costs. In short, it shows how hard your own money works, after the loan payments.',
					'A larger down payment lowers the mortgage and raises the monthly cash flow. However, it also raises the cash you invest, so the cash-on-cash return does not always rise with it.'
				]
			},
			{
				heading: 'How rent and vacancy change the result',
				paragraphs: [
					'Small changes in rent have a large effect on cash flow, because the costs and the mortgage stay the same. The table below uses a $300,000 property, 25% down, a 6.5% 30-year loan and the default costs.'
				],
				table: {
					caption: 'Monthly rent compared with the result',
					columns: ['Monthly rent', 'Monthly cash flow', 'Cap rate', 'Cash-on-cash'],
					rows: [
						['$2,000', '−$269.15', '4.61%', '−3.99%'],
						['$2,400', '$61.45', '5.93%', '0.91%'],
						['$3,000', '$557.35', '7.92%', '8.26%']
					]
				}
			},
			{
				heading: 'Vacancy and management',
				paragraphs: [
					'Vacancy is rent you do not collect, from empty months or unpaid rent. For example, at $2,400 rent, a 0% vacancy leaves $165.85 a month, while 10% leaves −$42.95. The default of 5% leaves $61.45.',
					'Managing the property yourself (management at 0%) lifts the cash flow to $243.85 a month. That gain is really pay for your own time, so be honest about how much work you will do.'
				]
			},
			{
				heading: 'Limits and tips',
				paragraphs: ['A calculator can only use the numbers you give it, so a few points are worth noting:'],
				list: [
					'**Be cautious with rent.** Use the rent of similar homes nearby, not the highest figure you can find.',
					'**Budget for big repairs.** However, maintenance as a share of rent may not cover a new roof or boiler.',
					'**This tool ignores tax and value growth.** For a view over the years you hold the property, use the [real estate investment calculator](/real-estate-calculator).',
					'**Check the loan.** The [mortgage calculator](/mortgage-calculator) shows the full schedule.',
					'**Compare with other options.** Returns are not guaranteed. Try the [ROI calculator](/roi-calculator) or [rent vs buy calculator](/rent-vs-buy-calculator) to weigh up choices.'
				]
			}
		],
		formulas: [
			{
				title: 'Net operating income and cap rate',
				expression: 'NOI = Rent × 12 × (1 − vacancy) − (tax + insurance + maintenance + management + HOA)',
				variables: [
					{ symbol: 'maintenance, management', meaning: 'shares of the rent you collect' },
					{ symbol: 'Cap rate', meaning: 'NOI ÷ purchase price' }
				]
			},
			{
				title: 'Cash flow and cash-on-cash return',
				expression: 'Cash flow = NOI − 12 × M;  Cash-on-cash = Cash flow ÷ (down payment + closing costs)',
				variables: [{ symbol: 'M', meaning: 'monthly mortgage payment: M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)' }]
			}
		],
		example: {
			title: 'A $300,000 property, 25% down, $6,000 closing costs, $2,400 rent, and a 6.5% 30-year loan',
			steps: [
				'Loan = $300,000 × 0.75 = $225,000, and the monthly principal and interest is $1,422.15',
				'Collected rent = $2,400 × 12 × (1 − 0.05) = $27,360',
				'Operating costs = $3,600 tax + $1,200 insurance + $1,368 maintenance + $2,188.80 management + $1,200 HOA = $9,556.80',
				'NOI = $27,360 − $9,556.80 = $17,803.20, so the cap rate is $17,803.20 ÷ $300,000 ≈ 5.93%',
				'Cash flow = ($17,803.20 − 12 × $1,422.15) ÷ 12 = $61.45 a month. Cash invested is $81,000, so cash-on-cash ≈ 0.91%'
			],
			result: 'Monthly cash flow of $61.45, a 5.93% cap rate and a 0.91% cash-on-cash return.'
		},
		faq: [
			{
				q: 'How do I calculate rental property cash flow?',
				a: 'Take the rent you collect after vacancy, subtract the operating costs, and then subtract the mortgage payments. Divide by 12 for a monthly figure. This calculator does each step.'
			},
			{
				q: 'What is a good cap rate?',
				a: 'It depends on the area, the property type and the risk. Higher cap rates often come with higher risk. Compare properties in the same market.'
			},
			{
				q: 'What is the difference between cap rate and cash-on-cash return?',
				a: 'Cap rate looks at the property alone, with no loan. Cash-on-cash return looks at the cash you invested and includes the effect of the mortgage.'
			},
			{
				q: 'What vacancy rate should I use?',
				a: 'Use what is normal in your area. The default is 5%. Be more cautious for new rentals or short-stay lets, where empty months are more common.'
			},
			{
				q: 'What costs does this calculator miss?',
				a: 'It does not include income tax, large one-off repairs, utilities you pay, letting fees or the cost of selling. Add them to your own plan.'
			},
			{
				q: 'Can I use this outside the US?',
				a: 'Yes. Choose your currency at the top. The maths works anywhere, but local costs, taxes and mortgage rules differ.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Consumer Financial Protection Bureau — What is the difference between a mortgage interest rate and an APR?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-mortgage-interest-rate-and-an-apr-en-135/' }
		],
		disclaimer:
			'Estimates only. Rents, costs and property values can change, and returns are not guaranteed. This tool ignores tax and is not financial or investment advice.'
	}
});
