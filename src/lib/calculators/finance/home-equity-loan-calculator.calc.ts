import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './home-equity-loan-calculator.meta';

const isNum = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Fixed-rate payment: M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = 0 → P ÷ n. */
function monthlyPayment(principal: number, annualPct: number, months: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'value', label: 'Home value', type: 'number', default: 400000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'balance', label: 'Current mortgage balance', type: 'number', default: 200000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{
			id: 'ltv',
			label: 'Maximum combined loan-to-value',
			type: 'number',
			default: 85,
			min: 1,
			max: 100,
			step: 1,
			suffix: '%',
			help: 'Limit on all loans against the home, as a share of its value'
		},
		{ id: 'amount', label: 'Loan amount wanted', type: 'number', default: 100000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 8, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Annual fixed rate' },
		{ id: 'term', label: 'Loan term', type: 'number', default: 15, min: 1, max: 30, step: 1, suffix: 'years', decimal: false }
	],
	calculate(v): CalculationResult {
		const value = Number(v.value);
		const balance = Number(v.balance);
		const ltv = Number(v.ltv);
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const years = Number(v.term);

		if (
			!isNum(value, 1, 1e9) ||
			!isNum(balance, 0, 1e9) ||
			!isNum(ltv, 1, 100) ||
			!isNum(amount, 0, 1e9) ||
			!isNum(rate, 0, 30) ||
			!isNum(years, 1, 30) ||
			!Number.isInteger(years)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter the home value, mortgage balance, loan-to-value limit, loan amount, rate and term.'
			};
		}

		const equity = value - balance;
		const maxCombined = value * (ltv / 100);
		const availableEquity = maxCombined - balance;

		if (availableEquity <= 0) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: `Your mortgage balance is at or above ${pct(ltv, 0)} of the home value, so there is no equity to borrow against.`
			};
		}

		const months = years * 12;
		const payment = monthlyPayment(amount, rate, months);
		const totalRepaid = payment * months;
		const totalInterest = totalRepaid - amount;

		const summary =
			amount > availableEquity
				? `Warning: the amount you want is ${money(amount - availableEquity)} above your maximum. Lower it to ${money(availableEquity)} or less.`
				: `You can borrow up to ${money(availableEquity)} within a combined loan-to-value limit of ${pct(ltv, 0)}.`;

		return {
			primaryResult: money(payment),
			primaryLabel: 'Monthly payment',
			summary,
			secondaryMetrics: [
				{ label: 'Home equity', value: money(equity) },
				{ label: `Maximum combined loan (${pct(ltv, 0)} of value)`, value: money(maxCombined) },
				{ label: 'Available equity (maximum loan)', value: money(availableEquity) },
				{ label: 'Loan amount wanted', value: money(amount) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: `Total of ${plural(months, 'payment')}`, value: money(totalRepaid) }
			]
		};
	},
	content: {
		intro:
			'Use this home equity loan calculator to see how much you can borrow against your home and what the monthly payment would be. It checks your loan against a combined loan-to-value limit.',
		howTo: [
			'Enter your home value and your current mortgage balance.',
			'Enter the maximum combined loan-to-value your lender allows.',
			'Enter the loan amount you want, the fixed rate and the term in years.',
			'Read the available equity, the monthly payment and the total interest.',
		],
		about: [
			{
				heading: 'What is a home equity loan?',
				paragraphs: [
					'A home equity loan is a lump sum that you borrow against your home. It has a fixed rate and equal payments, much like a regular loan. Your home secures it, so the rate is often lower than on a personal loan.',
					'It is sometimes called a second mortgage, because it sits alongside your first one. If you miss payments, the lender can take action against your home.',
					'Because of this, a home equity loan suits a one-time cost, such as a renovation, better than everyday spending.',
				]
			},
			{
				heading: 'How much can you borrow?',
				paragraphs: [
					'Lenders limit total borrowing with a **combined loan-to-value** (CLTV) ratio. This adds your mortgage and the new loan, then divides by the home value. Many lenders cap it near 80% to 85%, but each sets its own limit.',
					'For example, a $400,000 home with a $200,000 mortgage and an 85% limit allows $340,000 in total. That leaves $140,000 you could borrow. At 80%, the limit would be $120,000.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is your monthly payment on the amount you want. Below it, you see your equity, the maximum combined loan and the most you can borrow.',
					'If the amount you want is above that maximum, the summary shows a warning. Lower the amount or find out if your lender allows a higher limit. You can compare a credit line with the [HELOC calculator](/heloc-calculator), and check your first mortgage with the [mortgage calculator](/mortgage-calculator).',
				]
			},
			{
				heading: 'How the amount and term change the payment',
				paragraphs: [
					'The table uses the same home at 8% fixed. A bigger loan or a shorter term raises the payment. A longer term lowers it but adds interest.',
				],
				table: {
					caption: 'Loans at 8% fixed against a $400,000 home with a $200,000 mortgage',
					columns: ['Loan and term', 'Monthly payment', 'Total interest'],
					rows: [
						['$50,000, 15 years', '$477.83', '$36,008.69'],
						['$100,000, 15 years', '$955.65', '$72,017.38'],
						['$100,000, 10 years', '$1,213.28', '$45,593.11'],
						['$140,000, 15 years', '$1,337.91', '$100,824.33'],
					]
				}
			},
			{
				heading: 'Questions to ask first',
				paragraphs: [
					'Borrowing against your home deserves a careful look:',
				],
				list: [
					'**Do you need the full amount?** Borrow only what the project or goal needs.',
					'**Can you afford the payment?** Lenders check your [debt-to-income ratio](/debt-to-income-ratio-calculator), and so should you.',
					'**Would a credit line fit better?** If you need money in stages, try the [HELOC calculator](/heloc-calculator).',
					'**What are the fees?** Valuation and closing fees can add up, so ask for a list.',
				]
			},
			{
				heading: 'Home equity borrowing in different countries',
				paragraphs: [
					'Home equity products differ by country. In some places, you refinance your whole mortgage or take a further advance instead. This tool follows the US-style fixed second loan. Check local rules, limits and tax treatment.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not include closing costs or appraisal fees. It assumes a fixed rate and equal payments. It also does not check your credit or income, which lenders review before they approve you.',
				]
			}
		],
		formulas: [
			{
				title: 'Available equity',
				expression: 'Available equity = home value × LTV ÷ 100 − mortgage balance',
				variables: [
					{ symbol: 'LTV', meaning: 'maximum combined loan-to-value, such as 85' },
					{ symbol: 'home equity', meaning: 'home value minus the mortgage balance' }
				]
			},
			{
				title: 'Monthly payment',
				expression: 'M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'P', meaning: 'loan amount you want' },
					{ symbol: 'r', meaning: 'monthly rate: annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payments: years × 12' }
				]
			}
		],
		example: {
			title: 'A $400,000 home with a $200,000 mortgage, 85% limit, and a $100,000 loan at 8% for 15 years',
			steps: [
				'Maximum combined loan = $400,000 × 0.85 = $340,000',
				'Available equity = $340,000 − $200,000 = $140,000, so the $100,000 request is within the limit',
				'Monthly payment: $100,000 × 0.0066667 × (1.0066667)^180 ÷ ((1.0066667)^180 − 1) ≈ $955.65',
				'Total interest = $955.65 × 180 − $100,000 ≈ $72,017.38'
			],
			result: 'Up to $140,000 available, with a monthly payment of $955.65 on $100,000 and total interest of $72,017.38.'
		},
		faq: [
			{
				q: 'How much can I borrow with a home equity loan?',
				a: 'Multiply your home value by the lender’s CLTV limit, then subtract your mortgage balance. In the example above, that is $400,000 × 85% − $200,000 = $140,000.'
			},
			{
				q: 'What is combined loan-to-value (CLTV)?',
				a: 'It is the total of all loans secured on your home, divided by its value. Lenders use it to limit how much you can borrow against the home.'
			},
			{
				q: 'Is a home equity loan the same as a HELOC?',
				a: 'No. A home equity loan is a fixed lump sum with a fixed rate. A HELOC is a revolving credit line, usually with a variable rate.'
			},
			{
				q: 'What happens if my equity is too low?',
				a: 'If your mortgage is at or above the limit, the calculator shows a dash. There is no equity to borrow against until the balance falls or the home value rises.'
			},
			{
				q: 'Is the interest on a home equity loan tax deductible?',
				a: 'It depends on your country and on how you use the money. Tax rules change, so ask a qualified tax adviser.'
			},
			{
				q: 'How long can a home equity loan last?',
				a: 'Terms vary by lender. This calculator allows 1 to 30 years. A longer term lowers the payment, but you pay more interest in total.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is a HELOC?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-heloc-en-247/' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. Lenders set their own limits, rates and fees. A home equity loan is secured by your home, so missed payments can put it at risk.'
	}
});
