import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './mortgage-payoff-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

/** "20 years 3 months", "11 months", "5 years". */
function monthsText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ') || '0 months';
}

/** Balance after `months` standard payments, from the closed form. */
function balanceAfter(principal: number, annualRatePct: number, monthlyPayment: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal - monthlyPayment * months;
	const f = Math.pow(1 + r, months);
	return principal * f - (monthlyPayment * (f - 1)) / r;
}

/** Pays month by month at a fixed payment until the balance is gone. */
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
		{ id: 'amount', label: 'Original loan amount', type: 'number', default: 300000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.25, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'term', label: 'Original term', type: 'number', default: 30, min: 1, max: 50, step: 1, suffix: 'years', decimal: false },
		{ id: 'paid', label: 'Years already paid', type: 'number', default: 5, min: 0, max: 49, step: 1, suffix: 'years', decimal: false },
		{ id: 'extra', label: 'Extra monthly payment', type: 'number', default: 200, min: 0, max: 100_000, step: 25, prefix: '$', help: 'Added to your regular payment each month' }
	],
	calculate(v): CalculationResult {
		const original = Number(v.amount);
		const rate = Number(v.rate);
		const term = Number(v.term);
		const paidYears = Number(v.paid);
		const extra = Number(v.extra) || 0;

		if (
			!(original > 0) ||
			!Number.isFinite(original) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(term) ||
			!(term >= 1 && term <= 50) ||
			!Number.isInteger(paidYears) ||
			!(paidYears >= 0 && paidYears < term) ||
			!(extra >= 0)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Remaining balance now',
				summary: 'Years already paid must be less than the original term, and the other amounts must be valid.'
			};
		}

		const n = term * 12;
		const paidMonths = paidYears * 12;
		const remainingMonths = n - paidMonths;
		const monthly = payment(original, rate, n);
		const balance = Math.max(0, balanceAfter(original, rate, monthly, paidMonths));
		const interestLeftNoExtra = Math.max(0, monthly * remainingMonths - balance);

		const withExtra = extra > 0 ? payoffWith(balance, rate, monthly + extra) : { months: remainingMonths, interest: interestLeftNoExtra };
		const monthsSaved = Math.max(0, remainingMonths - withExtra.months);
		const interestSaved = Math.max(0, interestLeftNoExtra - withExtra.interest);

		return {
			primaryResult: money(balance),
			primaryLabel: 'Remaining balance now',
			summary:
				extra > 0
					? `An extra ${money(extra)} a month pays off the loan ${monthsText(monthsSaved)} sooner.`
					: `${plural(paidYears, 'year')} paid, with ${monthsText(remainingMonths)} left on the original schedule.`,
			secondaryMetrics: [
				{ label: 'Monthly payment', value: money(monthly) },
				{ label: 'Original payoff time', value: monthsText(remainingMonths) },
				{ label: 'Payoff time with extra', value: monthsText(withExtra.months) },
				{ label: 'Time saved', value: monthsText(monthsSaved) },
				{ label: 'Interest left, no extra', value: money(interestLeftNoExtra) },
				{ label: 'Interest saved', value: money(interestSaved) }
			]
		};
	},
	content: {
		intro:
			'Use this mortgage payoff calculator to see your balance today and how extra monthly payments shorten the loan. It shows the time you save and the interest you avoid.',
		howTo: [
			'Enter the original loan amount, the interest rate and the original term.',
			'Enter how many full years you have already paid.',
			'Enter the extra amount you could add to the payment each month.',
			'Read your balance now, the new payoff time and the interest saved.',
		],
		about: [
			{
				heading: 'How extra payments pay a mortgage off early',
				paragraphs: [
					'Each regular payment covers the month’s interest first, and then some principal. An extra payment goes straight to principal. Because the balance is lower, next month’s interest is smaller.',
					'The effect builds up over time. The earlier you start, the more months it has to work.',
					'So even a small habit helps. For example, adding $100 a month to the loan below ends it 2 years and 9 months early.',
				]
			},
			{
				heading: 'What a typical case looks like',
				paragraphs: [
					'Take a $300,000 loan at 6.25% over 30 years. The payment is $1,847.15, and after 5 years the balance is $280,011.72. With 25 years left, you would pay $274,133.76 more in interest.',
					'An extra $200 a month ends the loan 5 years sooner and saves $63,051.35 in interest. The table compares a few extra amounts.',
				],
				table: {
					caption: 'Extra payments after 5 years on a $300,000 loan at 6.25% (30-year term)',
					columns: ['Extra a month', 'Time left', 'Interest saved'],
					rows: [
						['$0', '25 years', '$0'],
						['$100', '22 years 3 months', '$36,039.44'],
						['$200', '20 years', '$63,051.35'],
						['$500', '15 years 7 months', '$115,362.02'],
						['$1,000', '11 years 7 months', '$160,675.57'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is your estimated balance today. It is based on the original loan, the rate and the years you have paid. Check it against your lender’s statement.',
					'Below it, compare the payoff time with and without the extra payment. “Interest saved” is the difference in interest from today until the loan ends.',
				]
			},
			{
				heading: 'Should you pay your mortgage off early?',
				paragraphs: [
					'It can be a good move, but it depends on your situation. Paying early gives you a sure return equal to your loan rate. However, the money is then tied up in your home.',
					'Before you pay extra, make sure you have an emergency fund. Also pay off any debt with a higher rate first, such as a card. The [debt payoff calculator](/debt-payoff-calculator) can help you plan that.',
				]
			},
			{
				heading: 'Things to check first',
				paragraphs: [
					'First, look at your loan terms before you send extra money:',
				],
				list: [
					'**Early repayment fees.** Some loans in some countries charge a fee, or limit extra payments each year.',
					'**How extra money is applied.** Ask your lender to apply it to principal, not to the next payment.',
					'**Refinancing.** A lower rate can save money too. See the [refinance calculator](/refinance-calculator).',
					'**The full schedule.** View every payment in the [amortization calculator](/amortization-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes a fixed rate and a standard payment of principal and interest. It does not include property tax, insurance or fees. In addition, it counts whole years paid, so the balance is a close estimate rather than your exact statement figure.',
				]
			},
			{
				heading: 'Payoff and other goals',
				paragraphs: [
					'Paying off a loan early is one goal among many. For a general loan, try the [loan calculator](/loan-calculator). To see what a different payment could do, use the [payment calculator](/payment-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'standard monthly payment' },
					{ symbol: 'P', meaning: 'original loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'original number of payments (term in years × 12)' }
				]
			},
			{
				title: 'Balance after k payments',
				expression: 'B = P(1 + r)ᵏ − M((1 + r)ᵏ − 1) ÷ r',
				variables: [
					{ symbol: 'B', meaning: 'remaining balance now' },
					{ symbol: 'k', meaning: 'payments made so far (years paid × 12)' }
				]
			}
		],
		example: {
			title: 'A $300,000 loan at 6.25% over 30 years, paid for 5 years, with $200 extra each month',
			steps: [
				'Monthly rate: r = 6.25 ÷ 12 ÷ 100 = 0.0052083. Payments: n = 360, k = 5 × 12 = 60',
				'Standard payment: M ≈ $1,847.15',
				'Balance now: B = 300,000 × (1.0052083)⁶⁰ − 1,847.15 × ((1.0052083)⁶⁰ − 1) ÷ 0.0052083 ≈ $280,011.72',
				'Paying $1,847.15 + $200 = $2,047.15 a month clears the balance in 240 payments, which is 60 months sooner than the 300 left',
				'Interest left with no extra = 1,847.1516 × 300 − $280,011.72 = $274,133.76. Interest saved = $274,133.76 − $211,082.41 = $63,051.35'
			],
			result: 'Remaining balance of $280,011.72. The $200 extra saves 5 years and $63,051.35 in interest.'
		},
		faq: [
			{
				q: 'How do I pay off my mortgage faster?',
				a: 'Pay extra principal each month, make a lump-sum payment, or refinance to a shorter term. Even small extras help, because they cut the balance and the interest on it.'
			},
			{
				q: 'How much interest will I save with extra payments?',
				a: 'It depends on the balance, the rate and the extra amount. On the loan above, $200 a month saves $63,051.35. Use the calculator with your own numbers.'
			},
			{
				q: 'Is it better to make extra payments or invest the money?',
				a: 'It depends on your loan rate, your possible investment returns and your comfort with risk. Paying a mortgage gives a certain saving. Investing may return more, but it is not guaranteed.'
			},
			{
				q: 'Why does my balance look higher than I expected?',
				a: 'Early payments are mostly interest, so the balance falls slowly at first. After 5 years of a 30-year loan, you have repaid less than 7% of the amount borrowed.'
			},
			{
				q: 'Can I enter a loan with months left over?',
				a: 'Not directly. The calculator counts whole years paid. For a close estimate, round to the nearest year.'
			},
			{
				q: 'Does an extra payment change my monthly payment?',
				a: 'No. Your required payment stays the same unless you refinance. The extra money shortens the loan instead, because it reduces the balance faster.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
			{ title: 'Consumer Financial Protection Bureau: What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
		],
		disclaimer:
			'Estimates only. Your lender’s statement shows your exact balance and sets the rules for extra payments.'
	}
});
