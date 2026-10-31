import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './personal-loan-calculator.meta';

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
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 10000, min: 1, max: 10_000_000, step: 100, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 11.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'months', label: 'Loan term', type: 'number', default: 36, min: 1, max: 360, step: 1, suffix: 'months', decimal: false },
		{ id: 'fee', label: 'Origination fee', type: 'number', default: 3, min: 0, max: 20, step: 0.1, suffix: '%', help: 'Taken out of the loan before you receive it' }
	],
	calculate(v): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const n = Number(v.months);
		const feePct = Number(v.fee) || 0;

		if (
			!(amount > 0) ||
			!Number.isFinite(amount) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(n) ||
			!(n >= 1 && n <= 360) ||
			!(feePct >= 0 && feePct <= 100)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter a loan amount and a term of 1 to 360 months.'
			};
		}

		const monthly = payment(amount, rate, n);
		const fee = amount * (feePct / 100);
		const net = amount - fee;
		const totalPaid = monthly * n;
		const totalInterest = Math.max(0, totalPaid - amount);

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `You repay ${money(amount, true)} plus interest over ${n} months. You receive ${money(net, true)}.`,
			secondaryMetrics: [
				{ label: 'Origination fee', value: money(fee) },
				{ label: 'Net amount received', value: money(net) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total paid', value: money(totalPaid) }
			]
		};
	},
	content: {
		intro:
			'Use this personal loan calculator to estimate your monthly payment and see how an origination fee cuts the cash you receive. You repay the full loan amount, so the fee raises your true cost.',
		howTo: [
			'Enter the amount you plan to borrow and the annual interest rate.',
			'Enter the loan term in months.',
			'Enter the origination fee from your loan offer as a percentage, or 0 if there is none.',
			'Compare the monthly payment with the net amount you will receive.',
		],
		about: [
			{
				heading: 'What is a personal loan?',
				paragraphs: [
					'A personal loan is money you borrow for almost any purpose, such as a big bill, a home repair or joining debts together. Most are unsecured, which means no asset like a house or car backs the loan. You repay a fixed amount each month over a set term.',
					'Lenders use different names for these loans, such as cash loans, instalment loans or term loans. The idea is the same.',
				]
			},
			{
				heading: 'How an origination fee works',
				paragraphs: [
					'An origination fee is a charge for setting up the loan. The lender takes it out of the loan before the money reaches you. Some lenders call it a processing fee or an arrangement fee.',
					'For example, on a $10,000 loan with a 3% fee, you receive $9,700. But you still repay the full $10,000 plus interest. So if you need $10,000 in hand, you must borrow a little more.',
					'The fee also lifts your real rate. On this loan, the 11.5% interest rate and the $300 fee together work out to an effective rate of about 13.63%. The [APR calculator](/apr-calculator) shows this for any loan.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The calculator shows two money amounts that people often mix up. The **net amount received** is the cash that arrives in your account. The **total paid** is everything you hand back over the life of the loan.',
					'On the default loan, you receive $9,700 and pay back $11,871.36. The gap of $2,171.36 is the $300 fee plus $1,871.36 in interest. That is the true cost of borrowing here.',
				]
			},
			{
				heading: 'How the term changes the cost',
				paragraphs: [
					'The table uses a $10,000 loan at 11.5%. A short term costs less interest, but the payment is higher. A long term does the opposite.',
				],
				table: {
					caption: 'A $10,000 loan at 11.5% with a 3% fee',
					columns: ['Loan term', 'Monthly payment', 'Total interest'],
					rows: [
						['24 months', '$468.40', '$1,241.68'],
						['36 months', '$329.76', '$1,871.36'],
						['60 months', '$219.93', '$3,195.56'],
					]
				}
			},
			{
				heading: 'Tips before you borrow',
				paragraphs: [
					'A few checks can save you money:',
				],
				list: [
					'**Compare offers by total cost.** Look at the rate, the fee and the term together, not only the monthly payment.',
					'**Borrow only what you need.** A smaller loan means less interest.',
					'**Ask about early repayment.** Some lenders charge a penalty for paying off early.',
					'**Check your budget.** Lenders look at your [debt-to-income ratio](/debt-to-income-ratio-calculator), so know yours first.',
					'**Joining debts?** The [debt consolidation calculator](/debt-consolidation-calculator) shows if a new loan really saves money.',
				]
			},
			{
				heading: 'Personal loans in different countries',
				paragraphs: [
					'Loan names, fees and approval rules vary. Some countries rely on credit scores, and others use credit reports or income checks. In India and other South Asian countries, the monthly payment is called an EMI, so the [EMI calculator](/emi-calculator) gives the same answer.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'The monthly payment here uses the loan amount and the interest rate only. It does not include late fees, insurance add-ons or any fee that you pay separately. Your lender’s loan offer lists them, so read it line by line.',
					'It also assumes a fixed rate. If your loan has a variable rate, the payment can change over time.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount (you repay the full amount, not the net)' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments (the term in months)' }
				]
			},
			{
				title: 'Fee and net amount',
				expression: 'Origination fee = P × fee% ÷ 100        Net received = P − origination fee',
				variables: []
			}
		],
		example: {
			title: 'A $10,000 loan at 11.5% for 36 months with a 3% fee',
			steps: [
				'Monthly rate: r = 11.5 ÷ 12 ÷ 100 = 0.0095833',
				'Growth factor: (1 + r)³⁶ ≈ 1.4097',
				'M = 10,000 × 0.0095833 × 1.4097 ÷ (1.4097 − 1) ≈ $329.76',
				'Origination fee = $10,000 × 3% = $300, so net received = $9,700',
				'Total interest = 329.76 × 36 − $10,000 = $1,871.36'
			],
			result: 'Monthly payment of $329.76. You receive $9,700 after the $300 fee.'
		},
		faq: [
			{
				q: 'How is a personal loan payment calculated?',
				a: 'The calculator uses your loan amount, the monthly interest rate and the number of months in the standard loan formula. The fee does not change the payment.'
			},
			{
				q: 'Why do I repay more than I receive?',
				a: 'The lender takes the origination fee out of the loan before the money reaches you. You still repay the full loan amount plus interest, so the fee adds to your cost.'
			},
			{
				q: 'Is the fee included in the monthly payment?',
				a: 'No. The payment is based on the full loan amount. The fee only reduces the cash you receive, so compare offers by the fee and the payment together.'
			},
			{
				q: 'How does a longer term change the cost?',
				a: 'A longer term lowers the monthly payment, but you pay interest for more months. As a result, the total interest rises.'
			},
			{
				q: 'What is a good interest rate for a personal loan?',
				a: 'There is no single good rate. It depends on your country, your credit record, the term and the lender. Compare offers by APR, using the same amount and term for each.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneySmart (Australian Government)', url: 'https://moneysmart.gov.au/' },
		],
		disclaimer:
			'Estimates only. Your actual rate, fees and approval depend on your credit record and the lender’s terms.'
	}
});
