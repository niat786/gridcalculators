import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './refinance-calculator.meta';

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
		{ id: 'balance', label: 'Current loan balance', type: 'number', default: 300000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'currentRate', label: 'Current interest rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%' },
		{
			id: 'remaining',
			label: 'Years left on current loan',
			type: 'number',
			default: 25,
			min: 1,
			max: 50,
			step: 1,
			suffix: 'years',
			decimal: false
		},
		{ id: 'newRate', label: 'New interest rate', type: 'number', default: 5.5, min: 0, max: 30, step: 0.01, suffix: '%' },
		{
			id: 'newTerm',
			label: 'New loan term',
			type: 'number',
			default: 30,
			min: 1,
			max: 50,
			step: 1,
			suffix: 'years',
			decimal: false
		},
		{
			id: 'closing',
			label: 'Closing costs',
			type: 'number',
			default: 4000,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			help: 'Fees you pay to refinance. They are not added to the new loan.'
		}
	],
	calculate(v): CalculationResult {
		const balance = Number(v.balance);
		const currentRate = Number(v.currentRate);
		const remaining = Number(v.remaining);
		const newRate = Number(v.newRate);
		const newTerm = Number(v.newTerm);
		const closing = Number(v.closing);

		if (
			!isNum(balance, 1, 1e9) ||
			!isNum(currentRate, 0, 30) ||
			!isNum(remaining, 1, 50) ||
			!isNum(newRate, 0, 30) ||
			!isNum(newTerm, 1, 50) ||
			!isNum(closing, 0, 1e9) ||
			!Number.isInteger(remaining) ||
			!Number.isInteger(newTerm)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'New monthly payment',
				summary: 'Enter the loan balance, both rates, both terms in whole years, and the closing costs.'
			};
		}

		const currentMonths = remaining * 12;
		const newMonths = newTerm * 12;
		const currentPayment = monthlyPayment(balance, currentRate, currentMonths);
		const newPayment = monthlyPayment(balance, newRate, newMonths);
		const savings = currentPayment - newPayment;
		const breakEvenMonths = savings > 0 ? Math.ceil(closing / savings) : 0;
		const currentInterest = currentPayment * currentMonths - balance;
		const newInterest = newPayment * newMonths - balance;
		const interestDiff = currentInterest - newInterest;

		let summary: string;
		if (savings > 0) {
			summary = `The new payment is ${money(savings)} lower each month, so the closing costs are recovered in ${plural(breakEvenMonths, 'month')}.`;
		} else if (savings < 0) {
			summary = `The new payment is ${money(-savings)} higher each month, so there is no break-even point.`;
		} else {
			summary = 'The new payment is the same as your current one, so there is no break-even point.';
		}

		return {
			primaryResult: money(newPayment),
			primaryLabel: 'New monthly payment',
			summary,
			secondaryMetrics: [
				{ label: 'Current monthly payment', value: money(currentPayment) },
				{ label: 'Monthly savings', value: money(savings) },
				{
					label: 'Break-even point',
					value: savings > 0 ? plural(breakEvenMonths, 'month') : 'None (no monthly savings)'
				},
				{ label: 'Lifetime interest, current loan', value: money(currentInterest) },
				{ label: 'Lifetime interest, new loan', value: money(newInterest) },
				{
					label: 'Lifetime interest difference',
					value:
						interestDiff > 0
							? `${money(interestDiff)} less`
							: interestDiff < 0
								? `${money(-interestDiff)} more`
								: 'No difference'
				}
			]
		};
	},
	content: {
		intro:
			'Use this refinance calculator to compare your current loan with a new one. See the new monthly payment, your savings each month and how long it takes to recover the closing costs.',
		howTo: [
			'Enter your current loan balance, your current rate and the years left.',
			'Enter the new interest rate and the new loan term.',
			'Enter the closing costs you would pay to refinance.',
			'Read the monthly savings, the break-even point and the change in lifetime interest.',
		],
		about: [
			{
				heading: 'What is refinancing?',
				paragraphs: [
					'Refinancing means replacing your loan with a new one, usually to get a lower rate or a different term. In the UK, a similar move on a home loan is called a remortgage.',
					'You pay the old loan off with the new one. But the switch has costs, so it only pays off if the savings are bigger than the fees.',
				]
			},
			{
				heading: 'The break-even point',
				paragraphs: [
					'The break-even point is the number of months it takes for your savings to cover the closing costs. The formula is simple: closing costs divided by monthly savings, rounded up.',
					'In the default case, the new payment is $322.25 lower. With $4,000 in costs, you break even after 13 months. If you plan to keep the loan longer than that, the refinance saves cash each month.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is your new monthly payment. Next to it, you see the old payment and the monthly saving. The break-even point tells you how many months until the savings cover the costs.',
					'The last three lines compare lifetime interest on both loans from today. A lower number is better, but remember to check the term, because a longer loan adds interest.',
				]
			},
			{
				heading: 'A lower payment is not always a lower cost',
				paragraphs: [
					'The term matters as much as the rate. Our example moves from 25 years left to a fresh 30-year loan. The payment drops, but you pay interest for 5 more years. So the lifetime interest goes up by $5,525.68.',
					'If you keep the 25-year length, the story changes. The table shows both choices for a $300,000 balance, moving from 6.5% to 5.5% with $4,000 in costs.',
				],
				table: {
					caption: 'A $300,000 balance, 6.5% with 25 years left, refinanced to 5.5%',
					columns: ['New term', 'New payment', 'Break-even', 'Lifetime interest'],
					rows: [
						['30 years', '$1,703.37', '13 months', '$5,525.68 more'],
						['25 years', '$1,842.26', '22 months', '$55,007.70 less'],
					]
				}
			},
			{
				heading: 'Tips before you refinance',
				paragraphs: [
					'Check these points first:',
				],
				list: [
					'**Get the full cost.** Ask for all fees in writing, then check the real rate with the [APR calculator](/apr-calculator).',
					'**Think about how long you will stay.** If you may move before the break-even date, a refinance may not pay.',
					'**Compare terms as well as rates.** A shorter term can save a lot of interest.',
					'**Use extra payments.** Instead of refinancing, you may pay your loan off faster. See the [mortgage payoff calculator](/mortgage-payoff-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It treats the closing costs as cash you pay up front. They are not added to the new loan. It also ignores taxes, insurance, and any early repayment fee on your old loan. It assumes fixed rates on both loans.',
					'Use the [mortgage calculator](/mortgage-calculator) to see the full monthly cost, with tax and insurance, on the new loan.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment',
				expression: 'M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'P', meaning: 'loan balance' },
					{ symbol: 'r', meaning: 'monthly rate: annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payments: years × 12' }
				]
			},
			{
				title: 'Break-even point',
				expression: 'Break-even months = closing costs ÷ monthly savings, rounded up',
				variables: [
					{ symbol: 'monthly savings', meaning: 'current payment minus new payment' }
				]
			},
			{
				title: 'Lifetime interest',
				expression: 'Interest = M × n − P',
				variables: [{ symbol: 'M × n', meaning: 'total of all payments over the loan term' }]
			}
		],
		example: {
			title: 'A $300,000 balance, 6.5% with 25 years left, refinanced at 5.5% for 30 years with $4,000 of costs',
			steps: [
				'Current payment at 6.5% over 300 months ≈ $2,025.62',
				'New payment at 5.5% over 360 months ≈ $1,703.37',
				'Monthly savings = $2,025.62 − $1,703.37 = $322.25',
				'Break-even = $4,000 ÷ $322.25 ≈ 12.4, rounded up to 13 months',
				'Lifetime interest is about $307,686.45 now and $313,212.12 after refinancing, so the longer term costs $5,525.68 more in interest'
			],
			result: 'A new payment of $1,703.37, monthly savings of $322.25, and a break-even point of 13 months.'
		},
		faq: [
			{
				q: 'When does it make sense to refinance?',
				a: 'It makes sense when the savings are bigger than the costs within the time you will keep the loan. The break-even point shows that time. A lower rate or a shorter term can both be good reasons.'
			},
			{
				q: 'How is the refinance break-even point calculated?',
				a: 'Divide the closing costs by your monthly savings, then round up to a whole month. The result is the number of months before the new loan puts you ahead.'
			},
			{
				q: 'Why can lifetime interest go up if my rate falls?',
				a: 'If the new term is longer than the time left on your old loan, you pay interest for more months. That can outweigh the lower rate.'
			},
			{
				q: 'Are closing costs added to the new loan?',
				a: 'Not in this calculator. It treats them as cash you pay up front. If you roll them into the loan, your new balance and payment will be a little higher.'
			},
			{
				q: 'What if the new payment is higher?',
				a: 'Then there is no monthly saving and no break-even point. That can still be fine if you chose a shorter term to cut the total interest.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
			{ title: 'Consumer Financial Protection Bureau: Owning a home', url: 'https://www.consumerfinance.gov/owning-a-home/' },
		],
		disclaimer:
			'Estimates only. Rates, fees and rules for refinancing vary by lender and country. Ask your lender for a written quote before you decide.'
	}
});
