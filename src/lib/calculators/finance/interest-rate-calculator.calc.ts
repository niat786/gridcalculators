import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './interest-rate-calculator.meta';

/** Present value of n equal payments at the monthly rate j. */
function presentValue(pay: number, j: number, n: number): number {
	return j === 0 ? pay * n : (pay * (1 - Math.pow(1 + j, -n))) / j;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 20000, min: 1, max: 100_000_000, step: 100, prefix: '$' },
		{ id: 'months', label: 'Term (months)', type: 'number', default: 60, min: 1, max: 600, step: 1, suffix: 'months', decimal: false },
		{
			id: 'payment',
			label: 'Monthly payment',
			type: 'number',
			default: 396.02,
			min: 0.01,
			max: 100_000_000,
			step: 0.01,
			prefix: '$',
			help: 'The fixed payment on the loan'
		}
	],
	calculate(v): CalculationResult {
		const amount = Number(v.amount);
		const months = Number(v.months);
		const pay = Number(v.payment);
		const label = 'Annual interest rate';

		if (
			!(amount > 0) ||
			!Number.isFinite(amount) ||
			!Number.isInteger(months) ||
			months < 1 ||
			months > 600 ||
			!(pay > 0) ||
			!Number.isFinite(pay)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Enter a loan amount above zero, a term of 1 to 600 months, and a monthly payment above zero.'
			};
		}

		const total = pay * months;
		if (total < amount) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: `The payments add up to ${money(total)}, which is less than the ${money(amount)} loan, so no interest rate fits. Increase the payment or the term.`
			};
		}

		// The payments must be worth the loan today. Their present value falls as the rate rises,
		// so bisection on 0% to 100% finds the rate where the two match.
		if (presentValue(pay, 1 / 12, months) > amount) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'These payments imply a rate above 100% a year. Check the payment and the term.'
			};
		}
		let lo = 0;
		let hi = 1;
		while (hi - lo > 1e-12) {
			const mid = (lo + hi) / 2;
			if (presentValue(pay, mid / 12, months) > amount) lo = mid;
			else hi = mid;
		}
		const annual = (lo + hi) / 2;

		return {
			primaryResult: `${num(annual * 100, 3, 2)}%`,
			primaryLabel: label,
			summary: `${money(pay)} a month for ${plural(months, 'month')} on ${money(amount)} implies this annual rate.`,
			secondaryMetrics: [
				{ label: 'Monthly rate', value: `${num((annual / 12) * 100, 4, 4)}%` },
				{ label: 'Total of payments', value: money(total) },
				{ label: 'Total interest', value: money(total - amount) },
				{ label: 'Number of payments', value: plural(months, 'payment') }
			]
		};
	},
	content: {
		intro:
			'Use this interest rate calculator to find the rate on a loan when you know the amount, the term and the fixed monthly payment. It is handy for checking a loan offer or a hire-purchase deal.',
		howTo: [
			'Enter the loan amount (the money you receive).',
			'Enter the number of monthly payments, from 1 to 600.',
			'Enter the fixed monthly payment.',
			'Read the annual interest rate, then check the total interest you would pay.'
		],
		about: [
			{
				heading: 'What does this calculator find?',
				paragraphs: [
					'Most calculators start with a rate and give you a payment. This one works the other way around. It starts with the payment and finds the rate behind it.',
					'That helps when a seller or lender tells you the monthly cost but not the rate. For example, a shop may offer a phone or a car for a set number of payments. The rate can hide in those numbers.'
				]
			},
			{
				heading: 'How the rate is found',
				paragraphs: [
					'There is no simple formula that gives the rate directly. Instead, the calculator tries rates between 0% and 100% a year. It keeps narrowing the range until the payments, discounted at that rate, are worth exactly the loan amount.',
					'The result is the monthly rate multiplied by 12. This is the usual nominal annual rate for a loan with monthly payments. If you know the rate and want the payment, use the [loan calculator](/loan-calculator).'
				]
			},
			{
				heading: 'How the payment changes the rate',
				paragraphs: [
					'The same loan can carry very different rates. The table below uses a $20,000 loan repaid over 60 months.'
				],
				table: {
					caption: '$20,000 over 60 months',
					columns: ['Monthly payment', 'Total paid', 'Total interest', 'Annual rate'],
					rows: [
						['$350.00', '$21,000.00', '$1,000.00', '1.937%'],
						['$396.02', '$23,761.20', '$3,761.20', '7.00%'],
						['$500.00', '$30,000.00', '$10,000.00', '17.274%']
					]
				}
			},
			{
				heading: 'When the calculator shows a dash',
				paragraphs: [
					'If your payments add up to less than the loan, no rate can fit, because the lender would lose money. Raise the payment or the term. If the rate would pass 100% a year, the tool also stops.',
					'A loan with no interest at all, where the payments exactly equal the amount, gives a rate of 0%.'
				]
			},
			{
				heading: 'Tips for checking a loan offer',
				paragraphs: ['A low monthly payment can hide a high rate, so it helps to check before you sign. Here are a few steps:'],
				list: [
					'**Ask for the total to repay.** Divide it by the amount borrowed to see how much the loan really costs.',
					'**Compare on the same term.** A longer term lowers the payment but adds interest. The [amortization calculator](/amortization-calculator) shows the split.',
					'**Check for fees.** Add any set-up charge to the cost before you compare offers.',
					'**Compare returns on investments differently.** For growth over time, use the [average return calculator](/average-return-calculator) or the [IRR calculator](/irr-calculator).'
				]
			},
			{
				heading: 'What this rate does not include',
				paragraphs: [
					'The result is the interest rate only. Fees, insurance and other charges are not part of it. If your payment includes them, the rate shown will look higher than the lender’s stated rate.',
					'To compare the full cost of loans, use the [APR calculator](/apr-calculator). To see how a rate affects savings or a balance, try the [interest calculator](/interest-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Loan payment equation',
				expression: 'L = M × (1 − (1 + j)^(−n)) ÷ j',
				variables: [
					{ symbol: 'L', meaning: 'loan amount' },
					{ symbol: 'M', meaning: 'fixed monthly payment' },
					{ symbol: 'j', meaning: 'monthly interest rate, the unknown' },
					{ symbol: 'n', meaning: 'number of monthly payments' }
				]
			},
			{
				title: 'Annual rate',
				expression: 'Annual rate = j × 12',
				variables: [{ symbol: 'j', meaning: 'the monthly rate that solves the equation above' }]
			}
		],
		example: {
			title: 'A $20,000 loan over 60 months with a $396.02 payment',
			steps: [
				'Total of payments: 396.02 × 60 = $23,761.20',
				'Total interest: 23,761.20 − 20,000 = $3,761.20',
				'Solve 396.02 × (1 − (1 + r)⁻⁶⁰) ÷ r = 20,000, which gives r ≈ 0.58330% a month',
				'Annual rate: 0.58330% × 12 = 7.00%'
			],
			result: 'The loan carries an annual interest rate of 7.00%, with $3,761.20 of total interest.'
		},
		faq: [
			{
				q: 'How do I find the interest rate on a loan?',
				a: 'Enter the loan amount, the number of payments and the monthly payment. The calculator solves for the rate that makes the payments worth the loan today.'
			},
			{
				q: 'Why does the tool give a dash?',
				a: 'Either your payments add up to less than the loan, or the rate would be above 100% a year. Check the amount, the term and the payment, then try again.'
			},
			{
				q: 'Is the result the same as APR?',
				a: 'Not exactly. This is the nominal rate, based only on the amount, term and payment. APR also includes fees, so it is usually higher.'
			},
			{
				q: 'Can I use this for a car or personal loan?',
				a: 'Yes, for any loan with equal monthly payments that starts today. It does not suit loans with a balloon payment, a deferred start, or a rate that changes.'
			},
			{
				q: 'What does it mean if the rate is 0%?',
				a: 'It means you repay exactly what you borrowed, with no interest. This happens when the payment times the number of months equals the loan amount.'
			},
			{
				q: 'How do I find the rate on savings or investments?',
				a: 'This tool is built for loans. For growth over time, the average return and IRR calculators fit better.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is the difference between a mortgage interest rate and an APR?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-mortgage-interest-rate-and-an-apr-en-135/' },
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' }
		],
		disclaimer:
			'Estimates only. Your lender’s quoted rate may include fees or use a different calculation. This tool is not financial advice.'
	}
});
