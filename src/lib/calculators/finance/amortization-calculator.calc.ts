import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './amortization-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 200000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'years', label: 'Loan term', type: 'number', default: 30, min: 1, max: 50, step: 1, suffix: 'years', decimal: false }
	],
	calculate(v): CalculationResult {
		const principal = Number(v.amount);
		const rate = Number(v.rate);
		const years = Number(v.years);

		if (
			!(principal > 0) ||
			!Number.isFinite(principal) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(years) ||
			!(years >= 1 && years <= 50)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter a loan amount, an interest rate from 0% to 100%, and a term from 1 to 50 years.'
			};
		}

		const n = years * 12;
		const monthly = payment(principal, rate, n);
		const totalPaid = monthly * n;
		const totalInterest = Math.max(0, totalPaid - principal);

		// Month-by-month schedule. The last payment clears whatever balance is left.
		const r = rate / 1200;
		let balance = principal;
		let cumInterest = 0;
		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [{ year: 0, balance: principal, interest: 0 }];
		for (let m = 1; m <= n; m++) {
			const interest = balance * r;
			const principalPart = m === n ? balance : Math.min(monthly - interest, balance);
			balance -= principalPart;
			cumInterest += interest;
			if (Math.abs(balance) < 0.005) balance = 0;
			rows.push({
				month: String(m),
				payment: money(interest + principalPart),
				principal: money(principalPart),
				interest: money(interest),
				balance: money(balance)
			});
			if (m % 12 === 0) chartData.push({ year: m / 12, balance, interest: cumInterest });
		}

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `${money(principal, true)} at ${num(rate, 3)}% repaid over ${plural(years, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Total of payments', value: money(totalPaid) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Number of payments', value: plural(n, 'payment') }
			],
			chart: {
				type: 'line',
				title: 'Loan balance and interest paid over time',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Remaining balance' },
					{ key: 'interest', label: 'Total interest paid' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Amortization schedule (monthly)',
				collapsed: true,
				columns: [
					{ key: 'month', label: 'Month' },
					{ key: 'payment', label: 'Payment', align: 'end' },
					{ key: 'principal', label: 'Principal', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this amortization calculator to see how a fixed-rate loan is repaid. You get the monthly payment, a split of each payment into interest and principal, and a month-by-month schedule.',
		howTo: [
			'Enter the loan amount and the annual interest rate.',
			'Enter the loan term in years.',
			'Read the monthly payment, the total interest and the total of all payments.',
			'Open the monthly schedule to see the interest and principal in every payment. Use the chart to compare the balance with the interest paid.',
		],
		about: [
			{
				heading: 'What is amortization?',
				paragraphs: [
					'Amortization means paying off a loan in regular steps. Each payment covers that month’s interest first. The rest reduces the **principal**, which is the amount you still owe.',
					'The payment stays the same, so the balance reaches zero on the last date. The table that lists every payment is called an amortization schedule.',
				]
			},
			{
				heading: 'Why early payments are mostly interest',
				paragraphs: [
					'Interest is charged on the balance you still owe. Early on, that balance is large, so interest takes a big share. For example, on a $200,000 loan at 6% for 30 years, the first payment is $1,199.10. Of that, $1,000.00 is interest and only $199.10 is principal.',
					'In the first year you pay $11,933.19 in interest and cut the loan by just $2,456.02. After 15 years you still owe $142,097.69. Principal only beats interest from payment 223, in year 19.',
					'This is why extra payments early in the loan save the most.',
				]
			},
			{
				heading: 'How the term changes your schedule',
				paragraphs: [
					'A shorter term raises the payment but cuts the interest sharply. The table uses the same $200,000 loan at 6%.',
				],
				table: {
					caption: 'A $200,000 loan at 6%',
					columns: ['Loan term', 'Monthly payment', 'Total interest'],
					rows: [
						['30 years', '$1,199.10', '$231,676.38'],
						['15 years', '$1,687.71', '$103,788.46'],
					]
				}
			},
			{
				heading: 'How to pay a loan off sooner',
				paragraphs: [
					'An extra payment goes straight to principal, which lowers the interest in every later month.',
				],
				list: [
					'**Add a fixed amount.** On the loan above, an extra $100 a month ends it after 295 payments instead of 360. That saves about $49,138 in interest.',
					'**Try the payoff tool.** The [mortgage payoff calculator](/mortgage-payoff-calculator) shows the time and interest saved for any extra amount.',
					'**Refinance if rates fall.** The [refinance calculator](/refinance-calculator) shows if a new loan is worth the costs.',
					'**Check for penalties.** Some lenders charge a fee for early repayment, so read your agreement.',
				]
			},
			{
				heading: 'How to read the schedule',
				paragraphs: [
					'The monthly table has one row for each payment. Here is what each column means:',
				],
				list: [
					'**Payment:** the same amount each month, apart from the last one, which may differ by a few cents.',
					'**Interest:** the charge for that month, found by multiplying the balance by the monthly rate.',
					'**Principal:** the part of the payment that reduces the debt.',
					'**Balance:** what you still owe after the payment.',
					'The chart shows the falling balance next to the interest you have paid so far.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'The schedule covers principal and interest on a fixed-rate loan. It does not add taxes, insurance or fees. It also assumes you make every payment on time and never change the amount.',
					'If your rate is variable, your lender will recalculate the payment when the rate changes. This tool can’t predict that, so use it as a guide for the current rate.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments (years × 12)' }
				]
			},
			{
				title: 'Each month',
				expression: 'Interest = balance × r        Principal = M − interest        New balance = balance − principal',
				variables: []
			}
		],
		example: {
			title: 'A $200,000 loan at 6% over 30 years',
			steps: [
				'Monthly rate: r = 6 ÷ 12 ÷ 100 = 0.005, n = 30 × 12 = 360',
				'M = 200,000 × 0.005 × 1.005³⁶⁰ ÷ (1.005³⁶⁰ − 1) ≈ $1,199.10',
				'Month 1 interest = 200,000 × 0.005 = $1,000.00, so principal = $1,199.10 − $1,000.00 = $199.10',
				'Total of payments = 1,199.1011 × 360 ≈ $431,676.38, so total interest = $231,676.38'
			],
			result: 'Monthly payment of $1,199.10. Total interest of $231,676.38 over 360 payments.'
		},
		faq: [
			{
				q: 'What is an amortization schedule?',
				a: 'It is a table that lists every payment on a loan. For each month it shows how much goes to interest, how much reduces principal and what balance is left.'
			},
			{
				q: 'Why does most of my early payment go to interest?',
				a: 'Interest is charged on the balance you still owe. Early on the balance is high, so interest takes most of each payment. As the balance falls, more of each payment reduces principal.'
			},
			{
				q: 'Does amortization apply to credit cards?',
				a: 'No. Credit cards are revolving credit, with no fixed end date or payment. To plan a card payoff, use the [credit card payoff calculator](/credit-card-payoff-calculator).'
			},
			{
				q: 'Why does the last payment differ by a few cents?',
				a: 'Payments are rounded to the cent. The final payment absorbs the small difference, so the balance ends at exactly zero.'
			},
			{
				q: 'Does this schedule include taxes or insurance?',
				a: 'No. It covers principal and interest only. For a home loan with tax and insurance, use the [mortgage calculator](/mortgage-calculator).'
			},
			{
				q: 'Can I use this for a car loan or a personal loan?',
				a: 'Yes. Any loan with equal monthly payments and a fixed rate follows the same schedule. Enter the amount, the rate and the term in years.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Consumer Financial Protection Bureau: Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
		],
		disclaimer:
			'Estimates only. Your lender sets the actual payment schedule, and it may differ slightly because of rounding.'
	}
});
