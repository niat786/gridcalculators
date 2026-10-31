import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './business-loan-calculator.meta';

const MAX_MONTHS = 600;

/** "5 years 3 months", "2 years", "9 months". */
function termText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ');
}

/** Present value of n equal payments at the periodic rate j. */
function presentValue(pay: number, j: number, n: number): number {
	return j === 0 ? pay * n : (pay * (1 - Math.pow(1 + j, -n))) / j;
}

/**
 * Nominal annual rate (decimal) at which the payments are worth `received` today.
 * `perYear` is the number of payments a year. Bisection on 0 to 1000% until the bracket
 * is narrower than 1e-10. Returns null when the answer would be above 1000%.
 */
function effectiveRate(pay: number, perYear: number, n: number, received: number): number | null {
	const pvAt = (a: number) => presentValue(pay, a / perYear, n);
	let lo = 0;
	let hi = 10;
	if (pvAt(hi) > received) return null;
	while (hi - lo > 1e-10) {
		const mid = (lo + hi) / 2;
		if (pvAt(mid) > received) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 50000, min: 1, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 9.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'months', label: 'Term (months)', type: 'number', default: 60, min: 1, max: MAX_MONTHS, step: 1, suffix: 'months', decimal: false },
		{
			id: 'feePct',
			label: 'Origination fee',
			type: 'number',
			default: 2,
			min: 0,
			max: 20,
			step: 0.1,
			suffix: '%',
			help: 'Taken from the loan amount at closing'
		},
		{
			id: 'frequency',
			label: 'Payment frequency',
			type: 'select',
			display: 'segmented',
			default: 'monthly',
			options: [
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Weekly', value: 'weekly' }
			]
		}
	],
	calculate(v): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const months = Number(v.months);
		const feePct = Number(v.feePct);
		const weekly = String(v.frequency) === 'weekly';
		const perYear = weekly ? 52 : 12;
		const label = weekly ? 'Weekly payment' : 'Monthly payment';

		if (
			!(amount > 0) ||
			!Number.isFinite(amount) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(months) ||
			months < 1 ||
			months > MAX_MONTHS ||
			!(feePct >= 0 && feePct <= 20)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Enter a loan amount, a rate from 0% to 100%, a term of 1 to 600 months, and a fee from 0% to 20%.'
			};
		}

		// Weekly loans run for the same length of time: months × 52 ÷ 12 payments, rounded.
		const n = weekly ? Math.round((months * 52) / 12) : months;
		const r = rate / 100 / perYear;
		const f = Math.pow(1 + r, n);
		const pay = r === 0 ? amount / n : (amount * r * f) / (f - 1);
		const totalPaid = pay * n;
		const fee = amount * (feePct / 100);
		const totalInterest = totalPaid - amount;
		const totalCost = totalInterest + fee;
		const apr = effectiveRate(pay, perYear, n, amount - fee);

		return {
			primaryResult: money(pay),
			primaryLabel: label,
			summary: `${money(amount, true)} at ${num(rate, 2)}% over ${termText(months)}, paid ${weekly ? 'weekly' : 'monthly'}.`,
			secondaryMetrics: [
				{ label: 'Effective APR', value: apr === null ? 'Over 1,000%' : `${num(apr * 100, 2, 2)}%` },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Origination fee', value: money(fee) },
				{ label: 'Total cost', value: money(totalCost) },
				{ label: 'Total of payments', value: money(totalPaid) },
				{ label: 'Number of payments', value: plural(n, 'payment') }
			]
		};
	},
	content: {
		intro:
			'Use this business loan calculator to estimate the payment on a term loan, with monthly or weekly repayments. It adds the origination fee and shows the effective APR, so you see the real cost.',
		howTo: [
			'Enter the loan amount, the annual interest rate and the term in months.',
			'Enter the origination fee as a percentage of the loan.',
			'Choose monthly or weekly payments.',
			'Read the payment, the total cost and the effective APR.',
		],
		about: [
			{
				heading: 'What a business loan payment includes',
				paragraphs: [
					'A term loan gives your business a lump sum that you repay in equal instalments over a set time. Each instalment covers interest and part of the principal. Lenders also charge fees, and the most common is an origination fee taken from the loan at closing.',
					'This calculator shows both the payment and the fee. That matters because the fee means you receive less cash than you repay.',
				]
			},
			{
				heading: 'Why the effective APR is higher than the rate',
				paragraphs: [
					'The effective APR spreads the fee across the life of the loan. In the default example, a $50,000 loan at 9.5% for 60 months with a 2% fee pays $1,050.09 a month. The fee is $1,000, so you receive $49,000.',
					'Against that $49,000, the true yearly cost is 10.37%, not 9.5%. Total cost, which is interest plus the fee, is $14,005.58. With no fee, the effective APR would match the 9.50% rate.',
				]
			},
			{
				heading: 'Monthly or weekly payments',
				paragraphs: [
					'Some lenders collect weekly, so this tool offers that choice too. It keeps the same loan length, so five years means 260 weekly payments. Each payment is smaller, and because you pay more often, the balance falls a little faster.',
					'The table compares both choices for the same loan.',
				],
				table: {
					caption: 'A $50,000 loan at 9.5% for 60 months with a 2% fee',
					columns: ['Payment plan', 'Payment', 'Total interest', 'Effective APR'],
					rows: [
						['Monthly (60 payments)', '$1,050.09', '$13,005.58', '10.37%'],
						['Weekly (260 payments)', '$241.76', '$12,856.40', '10.38%'],
					]
				}
			},
			{
				heading: 'Tips before you borrow',
				paragraphs: [
					'First, think about repayment as well as the rate:',
				],
				list: [
					'**Check your cash flow.** Weekly payments take cash out more often, so make sure your sales can cover them.',
					'**Compare total cost.** Look at the rate, the fee and the term together. The [APR calculator](/apr-calculator) shows the real rate.',
					'**Ask about security.** Many business loans need collateral, and some also ask for a personal guarantee from the owner.',
					'**Think about payback.** The [payback period calculator](/payback-period-calculator) shows how long the money you borrow takes to earn itself back.',
					'**Read the early repayment terms.** Some lenders charge a fee if you pay off early.',
				]
			},
			{
				heading: 'Business loans in different countries',
				paragraphs: [
					'Loan products and names differ by country, so check what your lender offers. Government-backed loan programs exist in many places, such as the US Small Business Administration. Also, rates and fees depend on the lender, your business record and the country.',
					'This tool covers fixed-rate term loans only. It does not model products that use a factor rate or take a share of daily sales, such as a merchant cash advance.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'Because it assumes a fixed rate and equal payments, it does not include late fees, insurance, taxes or the tax treatment of interest. The fee is the only extra cost counted. For the full schedule of payments, see the [amortization calculator](/amortization-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'payment per period' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'annual rate ÷ payments per year ÷ 100' },
					{ symbol: 'n', meaning: 'number of payments (weekly: months × 52 ÷ 12, rounded)' }
				]
			},
			{
				title: 'Origination fee and total cost',
				expression: 'Fee = P × fee % ÷ 100        Total cost = (M × n − P) + Fee',
				variables: []
			},
			{
				title: 'Effective APR',
				expression: 'P − Fee = M × (1 − (1 + i)⁻ⁿ) ÷ i, solved for i by bisection.   APR = i × payments per year × 100%',
				variables: [{ symbol: 'i', meaning: 'rate per payment period that makes the payments worth the loan after the fee' }]
			}
		],
		example: {
			title: 'A $50,000 loan at 9.5% for 60 months with a 2% fee',
			steps: [
				'Monthly rate: r = 9.5 ÷ 12 ÷ 100 = 0.0079167',
				'Monthly payment: M = $1,050.093, shown as $1,050.09',
				'Origination fee: 50,000 × 2% = $1,000, so $49,000 is the net amount',
				'Total of payments: 1,050.093 × 60 = $63,005.58, so interest = $13,005.58',
				'Effective APR: solving the payments against $49,000 gives 10.37%'
			],
			result: 'Monthly payment of $1,050.09. Total cost of $14,005.58 with an effective APR of 10.37%.'
		},
		faq: [
			{
				q: 'How do I calculate a business loan payment?',
				a: 'Use the loan amount, the rate per payment period and the number of payments in the loan formula above. The calculator does this for monthly or weekly payments.'
			},
			{
				q: 'What is the effective APR on a business loan?',
				a: 'It is the yearly rate that makes your payments worth the cash you actually receive, which is the loan minus the fee. It is higher than the stated rate when there is a fee.'
			},
			{
				q: 'Are weekly payments cheaper than monthly payments?',
				a: 'Slightly, for the same rate and length. Each payment is smaller and you pay the balance down a bit faster, so total interest is a little lower. In the example, it is $12,856.40 against $13,005.58.'
			},
			{
				q: 'Is the origination fee included in the monthly payment?',
				a: 'No. The payment is based on the full loan amount. The fee is taken out of the loan at closing, so you receive less cash than you repay.'
			},
			{
				q: 'Does the term in months apply to weekly loans?',
				a: 'Yes. The calculator converts it to weekly payments, using the months times 52 divided by 12, rounded.'
			},
		],
		sources: [
			{ title: 'U.S. Small Business Administration: Loans', url: 'https://www.sba.gov/funding-programs/loans' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. Your lender sets the actual rate, fees and terms. This is not financial advice. A business adviser or accountant can help with your case.'
	}
});
