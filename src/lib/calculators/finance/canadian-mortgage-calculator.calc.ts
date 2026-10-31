import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct, plural, num } from '../format';
import { CMHC_PREMIUMS, CMHC_SOURCE, INSURED_PRICE_CAP, MIN_DOWN_FIRST_RATE, MIN_DOWN_FIRST_TIER, MIN_DOWN_SECOND_RATE } from '../data/ca-tax-2026';
import meta from './canadian-mortgage-calculator.meta';

type Frequency = 'monthly' | 'semi-monthly' | 'biweekly' | 'accel-biweekly' | 'weekly' | 'accel-weekly';

interface Schedule {
	label: string;
	/** Payments per year. */
	perYear: number;
	/** Accelerated plans pay the monthly amount divided by this number each payment. */
	accelDivisor?: number;
}

const SCHEDULES: Record<Frequency, Schedule> = {
	monthly: { label: 'Monthly', perYear: 12 },
	'semi-monthly': { label: 'Semi-monthly', perYear: 24 },
	biweekly: { label: 'Bi-weekly', perYear: 26 },
	'accel-biweekly': { label: 'Accelerated bi-weekly', perYear: 26, accelDivisor: 2 },
	weekly: { label: 'Weekly', perYear: 52 },
	'accel-weekly': { label: 'Accelerated weekly', perYear: 52, accelDivisor: 4 }
};

const AMORTIZATIONS = [15, 20, 25, 30];

/** CMHC premium rate for a 90% loan-to-value mortgage (10% down), used in the text. */
const tenPercentDownRate = (CMHC_PREMIUMS.find((t) => t.ltvUpTo >= 0.9 - 1e-12) ?? CMHC_PREMIUMS[CMHC_PREMIUMS.length - 1]).rate;

/** Canadian fixed rates compound twice a year, so one period of t years grows by (1 + r/2)^(2t). */
function periodicRate(annualPct: number, paymentsPerYear: number): number {
	return Math.pow(1 + annualPct / 200, 2 / paymentsPerYear) - 1;
}

/** Payment that clears principal P at periodic rate i over n periods. */
function payment(principal: number, i: number, n: number): number {
	if (i === 0) return principal / n;
	return (principal * i) / (1 - Math.pow(1 + i, -n));
}

const isNum = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Home price (CAD)', type: 'number', default: 500000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 20, min: 0, max: 99.99, step: 0.5, suffix: '%' },
		{
			id: 'rate',
			label: 'Interest rate',
			type: 'number',
			default: 5,
			min: 0,
			max: 30,
			step: 0.01,
			suffix: '%',
			help: 'Annual rate, compounded semi-annually'
		},
		{
			id: 'amort',
			label: 'Amortization',
			type: 'select',
			display: 'segmented',
			default: '25',
			options: [
				{ label: '15 yr', value: '15' },
				{ label: '20 yr', value: '20' },
				{ label: '25 yr', value: '25' },
				{ label: '30 yr', value: '30' }
			]
		},
		{
			id: 'frequency',
			label: 'Payment frequency',
			type: 'select',
			display: 'menu',
			default: 'monthly',
			options: [
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Semi-monthly', value: 'semi-monthly' },
				{ label: 'Bi-weekly', value: 'biweekly' },
				{ label: 'Accelerated bi-weekly', value: 'accel-biweekly' },
				{ label: 'Weekly', value: 'weekly' },
				{ label: 'Accelerated weekly', value: 'accel-weekly' }
			]
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const downPct = Number(v.down);
		const rate = Number(v.rate);
		const years = Number(v.amort);
		const sched = SCHEDULES[String(v.frequency) as Frequency];

		if (
			!isNum(price, 1, 1e9) ||
			!isNum(downPct, 0, 99.99) ||
			!isNum(rate, 0, 30) ||
			!AMORTIZATIONS.includes(years) ||
			!sched
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Estimated payment',
				summary: 'Enter a home price, a down payment below 100%, and an interest rate.'
			};
		}

		const loan = price * (1 - downPct / 100);
		const iMonthly = periodicRate(rate, 12);
		const monthly = payment(loan, iMonthly, years * 12);
		const i = periodicRate(rate, sched.perYear);
		const pay = sched.accelDivisor ? monthly / sched.accelDivisor : payment(loan, i, years * sched.perYear);

		// Walk the schedule so accelerated plans, which pay off early, report the real totals.
		const maxPeriods = years * sched.perYear;
		let balance = loan;
		let totalPaid = 0;
		let count = 0;
		while (count < maxPeriods && balance > 0.005) {
			const interest = balance * i;
			const paid = Math.min(pay, balance + interest);
			totalPaid += paid;
			balance = balance + interest - paid;
			count++;
		}
		const totalInterest = totalPaid - loan;
		const effectiveAnnual = (Math.pow(1 + rate / 200, 2) - 1) * 100;

		return {
			primaryResult: money(pay),
			primaryLabel: `${sched.label} payment`,
			summary: `CAD ${money(loan)} loan over ${plural(years, 'year')} at ${pct(rate, 2)}, compounded semi-annually.`,
			secondaryMetrics: [
				{ label: 'Loan amount (CAD)', value: money(loan) },
				{ label: 'Mortgage insurance (CMHC)', value: downPct < 20 ? 'Required, not included' : 'Not required' },
				{ label: 'Payments per year', value: num(sched.perYear) },
				{ label: 'Number of payments', value: num(count) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total paid', value: money(totalPaid) },
				{ label: 'Effective annual rate', value: pct(effectiveAnnual, 2) }
			]
		};
	},
	content: {
		intro: 'Estimate your Canadian mortgage payment in Canadian dollars. This Canadian mortgage calculator compares monthly, bi-weekly and weekly schedules, including accelerated options, and shows how much interest each one costs.',
		howTo: [
			'Enter the home price in Canadian dollars and the down payment as a percentage.',
			'Enter the fixed rate your lender quoted and choose an amortization period.',
			'Pick how often you will pay. Accelerated options pay off the loan sooner.',
			'Read the payment, then check the total interest and whether mortgage insurance applies.'
		],
		about: [
			{
				heading: 'How a Canadian mortgage works',
				paragraphs: [
					'Two time periods matter on a Canadian mortgage. The **amortization** is the total time to pay the loan off, often 25 years. The **term** is how long your rate and lender are fixed. When a term ends, you renew at the rates of that day, or you switch lender.',
					'This calculator spreads the whole loan over the amortization at one fixed rate. It does not model a renewal, so your real payment can change after your first term.',
					'Canadian fixed-rate mortgages are quoted with interest compounded twice a year. That makes the effective yearly rate a little higher than the quoted one. For example, a 5% rate works out to an effective rate of 5.06%. For other currencies and countries, use the general [mortgage calculator](/mortgage-calculator).'
				]
			},
			{
				heading: 'How payment frequency changes your cost',
				paragraphs: [
					'You can pay monthly, twice a month, every two weeks or every week. A standard schedule splits the same yearly cost into smaller payments. The savings from that are small.',
					'Accelerated schedules are different. They are worked out from the monthly payment, so you pay more each year. The table shows a CA$400,000 loan at 5% over 25 years.'
				],
				table: {
					caption: 'CA$400,000 mortgage, 5%, 25-year amortization',
					columns: ['Schedule', 'Payment', 'Payments', 'Total interest'],
					rows: [
						['Monthly', 'CA$2,326.42', '300', 'CA$297,925.98'],
						['Semi-monthly', 'CA$1,162.01', '600', 'CA$297,207.91'],
						['Bi-weekly', 'CA$1,072.54', '650', 'CA$297,152.72'],
						['Accelerated bi-weekly', 'CA$1,163.21', '559', 'CA$249,577.30'],
						['Weekly', 'CA$536.02', '1,300', 'CA$296,821.67'],
						['Accelerated weekly', 'CA$581.60', '1,116', 'CA$249,028.13']
					]
				}
			},
			{
				heading: 'What is an accelerated payment?',
				paragraphs: [
					'An accelerated bi-weekly payment is half of the monthly payment, paid every two weeks. There are 26 of these a year, which equals 13 monthly payments instead of 12. An accelerated weekly payment works the same way with a quarter of the monthly payment.',
					'The extra payment goes straight to the principal. In the table, the accelerated bi-weekly plan pays off the loan in 559 payments, which is about 21.5 years, and saves about CA$48,349 of interest. The cost is a payment about CA$91 higher in every two-week period than the plain bi-weekly one.'
				]
			},
			{
				heading: 'Down payment and mortgage insurance',
				paragraphs: [
					`If your down payment is less than 20% of the price, you need mortgage default insurance from CMHC or another approved insurer. The premium depends on your loan-to-value ratio and is added to your mortgage. For example, with 10% down on a CA$500,000 home, the premium is ${pct(tenPercentDownRate * 100, 2)} of the CA$450,000 loan, or ${moneyIn('CAD', 450_000 * tenPercentDownRate, true)}.`,
					`The minimum down payment is ${pct(MIN_DOWN_FIRST_RATE * 100, 0)} of the first ${moneyIn('CAD', MIN_DOWN_FIRST_TIER, true)} of the price plus ${pct(MIN_DOWN_SECOND_RATE * 100, 0)} of the rest. Insured mortgages are for homes under ${moneyIn('CAD', INSURED_PRICE_CAP, true)}.`,
					'This calculator shows when insurance is required, but it does not add the premium to the payment. The [mortgage stress test calculator](/canada-mortgage-stress-test-calculator) includes the premium when it works out how much you can borrow.'
				]
			},
			{
				heading: 'Tips, and what the payment leaves out',
				paragraphs: ['The payment is only part of the cost of owning a home. These tips can help you plan:'],
				list: [
					'**Add the other costs.** Property tax, home insurance, heating and condo fees are not in the payment.',
					'**Plan closing costs.** The [land transfer tax calculator](/land-transfer-tax-calculator) shows one big cost on closing day.',
					'**Test a higher rate.** Rates may be higher when you renew, so try the payment at 1% or 2% more.',
					'**Compare amortizations.** A longer amortization lowers the payment but raises the total interest. See the [amortization calculator](/amortization-calculator) for the year-by-year balance.',
					'**Check prepayment rules.** Ask your lender how much extra you can pay each year without a penalty.'
				]
			}
		],
		formulas: [
			{
				title: 'Effective monthly rate',
				expression: 'i = (1 + r ÷ 2)^(1/6) − 1',
				variables: [
					{ symbol: 'r', meaning: 'annual rate as a decimal, such as 0.05' },
					{ symbol: 'i', meaning: 'effective rate for one month, after semi-annual compounding' }
				]
			},
			{
				title: 'Payment for any frequency',
				expression: 'M = P × i ÷ (1 − (1 + i)⁻ⁿ)    where i = (1 + r ÷ 2)^(2 ÷ k) − 1',
				variables: [
					{ symbol: 'P', meaning: 'loan amount after the down payment' },
					{ symbol: 'k', meaning: 'payments per year (12 monthly, 24 semi-monthly, 26 bi-weekly, 52 weekly)' },
					{ symbol: 'n', meaning: 'amortization years multiplied by k' }
				]
			},
			{
				title: 'Accelerated payments',
				expression: 'Accelerated bi-weekly = monthly payment ÷ 2        Accelerated weekly = monthly payment ÷ 4',
				variables: [{ symbol: 'monthly payment', meaning: 'the payment for the same loan on a monthly schedule' }]
			}
		],
		example: {
			title: 'A $500,000 home with 20% down, 5% for 25 years, paid monthly',
			steps: [
				'Loan = $500,000 × (1 − 0.20) = $400,000',
				'Monthly rate: i = (1 + 0.05 ÷ 2)^(1/6) − 1 ≈ 0.41239%',
				'Payment: M = $400,000 × 0.0041239 ÷ (1 − 1.0041239⁻³⁰⁰) ≈ $2,326.42',
				'Total paid = $2,326.42 × 300 payments ≈ $697,925.98, so interest ≈ $297,925.98'
			],
			result: 'A monthly payment of $2,326.42 and total interest of $297,925.98 over 300 payments.'
		},
		faq: [
			{
				q: 'How much is the payment on a $400,000 mortgage in Canada?',
				a: 'At 5% over 25 years, the monthly payment is $2,326.42. The same loan at 4% costs $2,104.08 a month, and at 6% it costs $2,559.23. Enter your own rate above to see yours.'
			},
			{
				q: 'Why does semi-annual compounding matter?',
				a: 'Canadian fixed mortgage rates are usually quoted compounded semi-annually. That makes the effective rate slightly higher than the same rate compounded monthly, so this calculator uses that convention.'
			},
			{
				q: 'What is an accelerated payment?',
				a: 'An accelerated plan pays half the monthly amount every two weeks, or a quarter every week. Over a year that adds up to one extra monthly payment, which shortens the loan and cuts the interest.'
			},
			{
				q: 'When do I need CMHC mortgage insurance?',
				a: 'Mortgage default insurance, from CMHC or another approved insurer, is generally required when the down payment is less than 20% of the purchase price. The premium is not included in this estimate.'
			},
			{
				q: 'What is the difference between amortization and term?',
				a: 'Amortization is the total time you take to repay the loan, such as 25 years. The term is the shorter period, often a few years, during which your rate and lender terms are fixed. You renew at the end of each term.'
			},
			{
				q: 'What is not included in the estimate?',
				a: 'Property tax, home insurance, closing costs and mortgage insurance premiums are not included. Add them to your budget when you plan a purchase.'
			}
		],
		sources: [
			{ title: 'CMHC — Mortgage loan insurance and premiums', url: CMHC_SOURCE.url },
			{ title: 'Government of Canada', url: 'https://www.canada.ca/' }
		],
		disclaimer:
			'Estimates only. Your lender sets the final rate, payment schedule and insurance premium, and property tax and fees are not included.'
	}
});
