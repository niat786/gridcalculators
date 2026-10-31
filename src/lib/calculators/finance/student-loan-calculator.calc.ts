import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './student-loan-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

/** "7 years 5 months", "11 months", "3 years". */
function monthsText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ') || '0 months';
}

/**
 * Pays the loan month by month at a fixed payment until the balance is gone.
 * Returns the number of months and the total interest paid.
 */
function payoffWith(balance: number, annualRatePct: number, monthlyPayment: number) {
	const r = annualRatePct / 1200;
	let left = balance;
	let months = 0;
	let interest = 0;
	while (left > 0.005 && months < 1200) {
		const charge = left * r;
		const principal = Math.min(monthlyPayment - charge, left);
		left -= principal;
		interest += charge;
		months++;
	}
	return { months, interest };
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'balance', label: 'Loan balance', type: 'number', default: 35000, min: 1, max: 10_000_000, step: 500, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 5.8, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{
			id: 'years',
			label: 'Repayment term',
			type: 'select',
			display: 'segmented',
			default: '10',
			options: [
				{ label: '10 yr', value: '10' },
				{ label: '15 yr', value: '15' },
				{ label: '20 yr', value: '20' },
				{ label: '25 yr', value: '25' }
			]
		},
		{
			id: 'extra',
			label: 'Extra monthly payment',
			type: 'number',
			default: 0,
			min: 0,
			max: 100_000,
			step: 25,
			prefix: '$',
			help: 'Optional. Added to the standard payment every month.'
		}
	],
	calculate(v): CalculationResult {
		const balance = Number(v.balance);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const extra = Number(v.extra) || 0;
		const n = years * 12;

		if (
			!(balance > 0) ||
			!Number.isFinite(balance) ||
			!(rate >= 0 && rate <= 100) ||
			!(years >= 1 && years <= 50) ||
			!(extra >= 0)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter your loan balance and interest rate. The extra payment cannot be negative.'
			};
		}

		const monthly = payment(balance, rate, n);
		const totalInterest = Math.max(0, monthly * n - balance);

		const withExtra = extra > 0 ? payoffWith(balance, rate, monthly + extra) : { months: n, interest: totalInterest };
		const monthsSaved = Math.max(0, n - withExtra.months);
		const interestSaved = Math.max(0, totalInterest - withExtra.interest);

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary:
				extra > 0
					? `Paying ${money(extra)} extra each month clears ${money(balance, true)} in ${monthsText(withExtra.months)}.`
					: `${money(balance, true)} repaid over ${plural(years, 'year')} at ${num(rate, 3)}%.`,
			secondaryMetrics: [
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Payoff time with extra', value: monthsText(withExtra.months) },
				{ label: 'Total interest with extra', value: money(withExtra.interest) },
				{ label: 'Months saved', value: plural(monthsSaved, 'month') },
				{ label: 'Interest saved', value: money(interestSaved) }
			]
		};
	},
	content: {
		intro: 'Use this student loan calculator to estimate your fixed monthly payment over a 10 to 25 year term. You can also see how much time and interest a little extra each month can save.',
		howTo: [
			'Enter the current balance and the annual interest rate on your loan.',
			'Choose how many years you plan to repay the loan.',
			'Optionally enter an extra amount you can pay each month.',
			'Read the monthly payment, then compare the payoff time and interest saved.'
		],
		about: [
			{
				heading: 'How a student loan payment works',
				paragraphs: [
					'A student loan is money you borrow for education and repay with interest. With a standard plan, you pay the same amount every month for a fixed number of years. Each payment covers the interest first, and the rest reduces your balance.',
					'This calculator uses that standard method. It needs your balance, your annual interest rate and the length of the term. It then shows the monthly payment and total interest.',
					'Interest is highest at the start, when your balance is largest. So early payments reduce the balance slowly. As the balance falls, more of each payment goes to principal. In some loans, unpaid interest can also be added to the balance, which is called capitalization. This tool does not model it.'
				]
			},
			{
				heading: 'How the term changes what you pay',
				paragraphs: [
					'A longer term lowers your monthly payment, but it raises the total interest. The table uses a $35,000 balance at 5.8% to show the trade-off.'
				],
				table: {
					caption: 'A $35,000 loan at 5.8%',
					columns: ['Term', 'Monthly payment', 'Total interest'],
					rows: [
						['10 years', '$385.07', '$11,207.90'],
						['15 years', '$291.58', '$17,484.66'],
						['20 years', '$246.73', '$24,215.04'],
						['25 years', '$221.25', '$31,373.80']
					]
				}
			},
			{
				heading: 'What an extra payment does',
				paragraphs: [
					'Extra money goes straight to your balance, so less interest builds up later. On the 10-year loan above, an extra $100 a month clears the debt in 7 years and 5 months. That saves 31 months and $3,064.03 of interest.',
					'Before you pay extra, check that your loan has no penalty for early payment, and ask your servicer to apply the extra to principal. For a wider view of your debts, see the [debt payoff calculator](/debt-payoff-calculator).'
				]
			},
			{
				heading: 'When this calculator fits, and when it does not',
				paragraphs: [
					'It fits a loan with a fixed rate and a fixed term. Many student loans around the world work differently. Some payments depend on your income, and some are taken through the tax system.',
					'For those loans, use a tool built for them. The [UK student loan calculator](/uk-student-loan-calculator) covers income-based repayment in the UK, and the [HECS-HELP calculator](/hecs-help-calculator) covers Australia. For a general loan, try the [loan calculator](/loan-calculator) or the [personal loan calculator](/personal-loan-calculator).'
				]
			},
			{
				heading: 'Tips for paying off student loans',
				paragraphs: [
					'Interest is the price of borrowing, so lower balances cost less. Small habits can add up over a long term.'
				],
				list: [
					'**Pay the highest rate first.** If you have several loans, extra money works hardest on the loan with the highest rate.',
					'**Round up your payment.** Paying a little more each month needs little effort and shortens the loan.',
					'**Use windfalls.** A bonus or tax refund can go straight to principal.',
					'**Check for lower rates.** Some borrowers can refinance or switch plans. Compare offers with the [loan calculator](/loan-calculator).',
					'**Keep emergency savings.** Extra payments can’t be taken back, so keep a small cushion first.'
				]
			}
		],
		formulas: [
			{
				title: 'Standard monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'standard monthly payment' },
					{ symbol: 'P', meaning: 'loan balance' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of payments (years × 12)' }
				]
			},
			{
				title: 'Extra payment',
				expression: 'Each month: interest = balance × r, principal = (M + extra) − interest',
				variables: [
					{ symbol: 'extra', meaning: 'the optional amount added to the standard payment' }
				]
			}
		],
		example: {
			title: 'A $35,000 loan at 5.8% over 10 years, with $100 extra each month',
			steps: [
				'Monthly rate: r = 5.8 ÷ 12 ÷ 100 = 0.0048333, n = 10 × 12 = 120',
				'M = 35,000 × 0.0048333 × (1.0048333)¹²⁰ ÷ ((1.0048333)¹²⁰ − 1) ≈ $385.07',
				'Standard total interest = 385.0658 × 120 − $35,000 ≈ $11,207.90',
				'Pay $385.07 + $100 = $485.07 each month. The balance is cleared in 89 months',
				'Interest with the extra payment ≈ $8,143.87, so you save 31 months and about $3,064.03 in interest'
			],
			result: 'Monthly payment of $385.07. The extra $100 saves 31 months and $3,064.03 in interest.'
		},
		faq: [
			{
				q: 'How is a student loan payment calculated?',
				a: 'The payment comes from the loan balance, the monthly interest rate and the number of payments. The formula above spreads the balance and interest into equal monthly amounts.'
			},
			{
				q: 'Does an extra payment go to interest or principal?',
				a: 'Each payment covers the interest first, and the rest reduces the balance. An extra payment goes entirely to principal, so less interest builds up in later months.'
			},
			{
				q: 'Is the standard payment always the same?',
				a: 'This calculator uses a fixed rate and a fixed term, so the standard payment does not change. Variable-rate loans and income-based plans can work differently.'
			},
			{
				q: 'Should I choose a shorter term?',
				a: 'A shorter term means a higher payment but much less total interest. Choose the shortest term you can comfortably afford, and check whether your loan has a penalty for early payments.'
			},
			{
				q: 'Will this match my loan servicer’s numbers?',
				a: 'Usually it is close, but your servicer may use a different day count, fees or capitalized interest. Use your official statement for the exact figures.'
			}
		],
		sources: [
			{ title: 'StudentAid.gov — Loan repayment', url: 'https://studentaid.gov/' }
		],
		disclaimer: 'Estimates only. Your actual balance, rate and repayment plan are set by your loan servicer.'
	}
});
