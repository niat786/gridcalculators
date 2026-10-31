import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './payment-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

/** "15 years 2 months", "11 months", "3 years". */
function monthsText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ') || '0 months';
}

const termMode = (v: Record<string, unknown>) => v.mode === 'term';
const paymentMode = (v: Record<string, unknown>) => v.mode === 'payment';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Find',
			type: 'select',
			display: 'segmented',
			default: 'term',
			options: [
				{ label: 'Fixed term', value: 'term' },
				{ label: 'Fixed payment', value: 'payment' }
			]
		},
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 250000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{
			id: 'years',
			label: 'Loan term',
			type: 'number',
			default: 30,
			min: 1,
			max: 50,
			step: 1,
			suffix: 'years',
			decimal: false,
			help: 'Your payment is worked out from this term',
			visibleWhen: termMode
		},
		{
			id: 'payment',
			label: 'Monthly payment',
			type: 'number',
			default: 1800,
			min: 1,
			max: 10_000_000,
			step: 50,
			prefix: '$',
			help: 'Your time to repay is worked out from this payment',
			visibleWhen: paymentMode
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.amount);
		const rate = Number(v.rate);
		const r = rate / 1200;

		if (!(principal > 0) || !Number.isFinite(principal) || !(rate >= 0 && rate <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: v.mode === 'payment' ? 'Time to pay off' : 'Monthly payment',
				summary: 'Enter a loan amount and an interest rate from 0% to 100%.'
			};
		}

		if (v.mode === 'payment') {
			const monthly = Number(v.payment);
			const interestEachMonth = principal * r;
			if (!(monthly > 0) || !Number.isFinite(monthly)) {
				return { primaryResult: DASH, primaryLabel: 'Time to pay off', summary: 'Enter a monthly payment above zero.' };
			}
			if (monthly <= interestEachMonth) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Time to pay off',
					summary: `Your payment must be more than the ${money(interestEachMonth)} of interest charged each month, or the balance never goes down.`
				};
			}

			// Solve n = −ln(1 − rP/M) ÷ ln(1 + r), then round up to whole payments.
			const exact = r === 0 ? principal / monthly : -Math.log(1 - (r * principal) / monthly) / Math.log(1 + r);
			const n = Math.ceil(exact - 1e-9);
			if (!(n >= 1 && n <= 1200)) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Time to pay off',
					summary: 'That payment would take over 100 years. Try a larger monthly payment.'
				};
			}

			// The last payment is smaller: it clears what is left after n − 1 full payments.
			const growth = Math.pow(1 + r, n - 1);
			const balanceBeforeLast = r === 0 ? principal - monthly * (n - 1) : principal * growth - (monthly * (growth - 1)) / r;
			const lastPayment = Math.max(0, balanceBeforeLast * (1 + r));
			const totalPaid = monthly * (n - 1) + lastPayment;
			const totalInterest = Math.max(0, totalPaid - principal);

			return {
				primaryResult: plural(n, 'month'),
				primaryLabel: 'Time to pay off',
				summary: `Paying ${money(monthly)} a month repays ${money(principal, true)} in ${monthsText(n)}.`,
				secondaryMetrics: [
					{ label: 'Total paid', value: money(totalPaid) },
					{ label: 'Total interest', value: money(totalInterest) },
					{ label: 'Final payment', value: money(lastPayment) }
				]
			};
		}

		const years = Number(v.years);
		if (!Number.isInteger(years) || !(years >= 1 && years <= 50)) {
			return { primaryResult: DASH, primaryLabel: 'Monthly payment', summary: 'Enter a loan term from 1 to 50 years.' };
		}
		const n = years * 12;
		const monthly = payment(principal, rate, n);
		const totalPaid = monthly * n;
		const totalInterest = Math.max(0, totalPaid - principal);

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `${money(principal, true)} at ${num(rate, 3)}% repaid over ${plural(years, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Total paid', value: money(totalPaid) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Number of payments', value: plural(n, 'payment') }
			]
		};
	},
	content: {
		intro:
			'Use this payment calculator to work out a loan from either side. Find the monthly payment for a set term, or find how many months a payment you can afford will take to clear the loan.',
		howTo: [
			'Choose Fixed term to find the payment, or Fixed payment to find the payoff time.',
			'Enter the loan amount and the annual interest rate.',
			'In Fixed term, enter the years. In Fixed payment, enter the monthly payment you can afford.',
			'Read the result, then check the total paid and total interest below it.',
		],
		about: [
			{
				heading: 'Two ways to look at a loan',
				paragraphs: [
					'Most loan tools start with a term and give you a payment. This one also works the other way. Often you already know how much you can pay each month, and the real question is how long that takes.',
					'In **Fixed term** mode you enter the years, and you get the monthly payment. In **Fixed payment** mode you enter the payment, and you get the number of months, rounded up.',
				]
			},
			{
				heading: 'A bigger payment shortens the loan',
				paragraphs: [
					'The table uses a $250,000 loan at 6.5%. A 30-year term needs $1,580.17 a month. Paying $1,800 instead ends the loan about 8 years and 5 months sooner. It also saves about $103,838 in interest.',
					'Also, keep in mind that extra interest is the real price of a long loan. So if your budget allows a higher payment, it pays to use it.',
				],
				table: {
					caption: 'A $250,000 loan at 6.5%',
					columns: ['Payment', 'Time to repay', 'Total interest'],
					rows: [
						['$1,580.17 (30-year term)', '360 months', '$318,861.22'],
						['$1,800.00 a month', '259 months', '$215,023.54'],
						['$2,000.00 a month', '210 months', '$168,494.40'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'In Fixed term mode, the main result is your monthly payment. The total paid and total interest show what the loan costs over the full term.',
					'In Fixed payment mode, the main result is the number of months. The secondary figures show the total interest and the final payment, which is usually smaller. Because of that, the total paid is a little less than the payment times the months.',
				]
			},
			{
				heading: 'Why your payment must beat the monthly interest',
				paragraphs: [
					'Each month the lender charges interest on the balance. If your payment is no bigger than that interest, the balance never falls. On $250,000 at 6.5%, the first month’s interest is about $1,354.17.',
					'The calculator shows a dash in that case. Raise the payment above the interest amount to get a result.',
				]
			},
			{
				heading: 'Tips for choosing a payment',
				paragraphs: [
					'Use the two modes together:',
				],
				list: [
					'First, use Fixed term to see the standard payment for the loan.',
					'Next, switch to Fixed payment and try a slightly higher amount. Notice how fast the time drops.',
					'See every payment in detail with the [amortization calculator](/amortization-calculator).',
					'For a loan with a fixed term and a yearly table, use the [loan calculator](/loan-calculator).',
				]
			},
			{
				heading: 'Payments in different countries',
				paragraphs: [
					'The formula works in any currency. In India and across South Asia, a regular loan payment is called an EMI, and the [EMI calculator](/emi-calculator) gives the same result for a fixed term.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It works out principal and interest only. It does not include fees, taxes or insurance. It also assumes a fixed rate and equal payments, so a loan with a variable rate or an interest-only period will differ.',
					'Check the exact figures with your lender before you decide. For fees, the [APR calculator](/apr-calculator) shows how they change the real rate.',
				]
			}
		],
		formulas: [
			{
				title: 'Fixed term: find the payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of payments (years × 12)' }
				]
			},
			{
				title: 'Fixed payment: find the number of months',
				expression: 'n = −ln(1 − r × P ÷ M) ÷ ln(1 + r)',
				variables: [
					{ symbol: 'n', meaning: 'months to pay off, rounded up to a whole payment' },
					{ symbol: 'M', meaning: 'monthly payment you enter' },
					{ symbol: 'ln', meaning: 'natural logarithm' }
				]
			}
		],
		example: {
			title: 'A $250,000 loan at 6.5% over 30 years',
			steps: [
				'Monthly rate: r = 6.5 ÷ 12 ÷ 100 = 0.0054167',
				'Number of payments: n = 30 × 12 = 360',
				'Growth factor: (1 + r)³⁶⁰ ≈ 6.9918',
				'M = 250,000 × 0.0054167 × 6.9918 ÷ (6.9918 − 1) ≈ $1,580.17',
				'Total paid = 1,580.17 × 360 = $568,861.22, so interest = $318,861.22'
			],
			result: 'Monthly payment of $1,580.17 over 360 payments. Total interest is $318,861.22.'
		},
		faq: [
			{
				q: 'How do I calculate a monthly payment?',
				a: 'Use the loan amount, the monthly interest rate and the number of payments in the loan formula above. This calculator does it for you in Fixed term mode.'
			},
			{
				q: 'What does fixed payment mean here?',
				a: 'You set the monthly amount you can pay. The calculator then counts how many months it takes to clear the loan. The last payment is usually smaller than the rest.'
			},
			{
				q: 'Why does the calculator show a dash?',
				a: 'If your monthly payment is no more than the interest charged each month, the balance never goes down. Raise the payment above that interest amount.'
			},
			{
				q: 'Why is the last payment sometimes smaller?',
				a: 'The months are rounded up to a whole number. The final payment clears only what is left, so it is smaller than the regular payment.'
			},
			{
				q: 'Does this include taxes or insurance?',
				a: 'No. The results cover principal and interest only. Add any escrow or other monthly costs yourself.'
			},
			{
				q: 'Can I use this payment calculator for a mortgage?',
				a: 'Yes, for the principal and interest part. Enter the loan amount, the rate and the term. For tax, insurance and fees, use the [mortgage calculator](/mortgage-calculator).'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Investor.gov: Financial tools and calculators', url: 'https://www.investor.gov/' },
		],
		disclaimer:
			'Estimates only. Your actual rate, fees and payment schedule depend on your lender and loan agreement.'
	}
});
