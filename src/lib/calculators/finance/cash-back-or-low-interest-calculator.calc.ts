import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './cash-back-or-low-interest-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n; P = 0 → 0. */
function payment(principal: number, annualRatePct: number, months: number): number {
	if (principal <= 0) return 0;
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Purchase price', type: 'number', default: 35000, min: 0, max: 100_000_000, step: 500, prefix: '$', help: 'Price before any rebate or tax you add to the loan.' },
		{ id: 'rebate', label: 'Cash-back rebate', type: 'number', default: 2000, min: 0, max: 100_000_000, step: 100, prefix: '$', help: 'Taken off the price if you choose cash back.' },
		{ id: 'lowApr', label: 'Low dealer APR', type: 'number', default: 1.9, min: 0, max: 40, step: 0.01, suffix: '%', help: 'Offered on the full price if you skip the rebate.' },
		{ id: 'bankApr', label: 'Bank loan APR', type: 'number', default: 6.5, min: 0, max: 40, step: 0.01, suffix: '%', help: 'Your rate if you take the rebate and borrow from a bank.' },
		{ id: 'term', label: 'Loan term', type: 'number', default: 60, min: 1, max: 120, step: 1, suffix: 'months', decimal: false, width: 'half' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 3000, min: 0, max: 100_000_000, step: 500, prefix: '$', width: 'half' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const rebate = Number(v.rebate);
		const lowApr = Number(v.lowApr);
		const bankApr = Number(v.bankApr);
		const n = Number(v.term);
		const down = Number(v.down);
		const primaryLabel = 'Difference in total cost';

		if (
			!Number.isFinite(price) || price <= 0 ||
			!(rebate >= 0) ||
			!(lowApr >= 0 && lowApr <= 40) ||
			!(bankApr >= 0 && bankApr <= 40) ||
			!Number.isInteger(n) || n < 1 || n > 120 ||
			!(down >= 0)
		) {
			return { primaryResult: DASH, primaryLabel, summary: 'Check the price, rates, term and down payment.' };
		}
		if (price - down < 0 || price - rebate - down < 0) {
			return { primaryResult: DASH, primaryLabel, summary: 'The down payment and rebate cannot be more than the price.' };
		}

		// Option A: rebate comes off the price, so the loan is smaller but charged at the bank rate.
		const loanA = price - rebate - down;
		// Option B: no rebate, so the loan is the full price less the down payment, at the low rate.
		const loanB = price - down;
		const monthlyA = payment(loanA, bankApr, n);
		const monthlyB = payment(loanB, lowApr, n);
		const totalA = down + monthlyA * n;
		const totalB = down + monthlyB * n;
		const diff = totalA - totalB;
		const cheaper = Math.abs(diff) < 0.005 ? 'Same cost' : diff > 0 ? 'Low APR' : 'Cash back';

		let summary: string;
		if (cheaper === 'Same cost') summary = 'Both options cost the same overall.';
		else if (cheaper === 'Low APR') summary = `The low APR is cheaper by ${money(diff)} over ${plural(n, 'month')}.`;
		else summary = `Taking the cash back is cheaper by ${money(-diff)} over ${plural(n, 'month')}.`;

		return {
			primaryResult: money(Math.abs(diff)),
			primaryLabel,
			summary,
			secondaryMetrics: [
				{ label: 'Monthly payment, cash back', value: money(monthlyA) },
				{ label: 'Monthly payment, low APR', value: money(monthlyB) },
				{ label: 'Total cost, cash back', value: money(totalA) },
				{ label: 'Total cost, low APR', value: money(totalB) },
				{ label: 'Cheaper option', value: cheaper }
			]
		};
	},
	content: {
		intro:
			'Use this cash back or low interest calculator to decide between a rebate and cheap dealer financing. It compares the monthly payment and total cost of each, and tells you which is cheaper.',
		howTo: [
			'Enter the purchase price and the cash-back rebate on offer.',
			'Enter the low dealer APR, and the rate you would pay on a bank loan if you take the rebate.',
			'Enter the loan term and your down payment.',
			'Read which option costs less overall, and by how much.',
		],
		about: [
			{
				heading: 'The choice: a rebate or a low rate',
				paragraphs: [
					'Dealers often give you a choice. You can take a cash rebate and arrange your own loan, or skip the rebate and use their low-rate financing. However, you usually can’t have both.',
					'The rebate lowers the price you borrow. But your own loan may cost more per year. The low rate costs less each month in interest, but you borrow the full price.',
				]
			},
			{
				heading: 'How the calculator compares them',
				paragraphs: [
					'With **cash back**, the loan is the price minus the rebate and your down payment, at the bank rate. With the **low APR**, the loan is the price minus your down payment, at the dealer rate.',
					'It then adds your down payment to the payments for each option. The lower total wins. For example, on a $35,000 car with a $2,000 rebate, 1.9% dealer financing and a 6.5% bank loan, the low rate wins by $1,649.70 over 60 months.',
				]
			},
			{
				heading: 'When the answer flips',
				paragraphs: [
					'A bigger rebate or a lower bank rate can tip the choice. The table uses the same car, $3,000 down and a 60-month loan.',
				],
				table: {
					caption: 'A $35,000 car, 1.9% dealer APR, $3,000 down, 60 months',
					columns: ['Rebate and bank rate', 'Monthly payment (cash back)', 'Monthly payment (low APR)', 'Cheaper option'],
					rows: [
						['$2,000 at 6.5%', '$586.98', '$559.49', 'Low APR by $1,649.70'],
						['$4,000 at 6.5%', '$547.85', '$559.49', 'Cash back by $698.24'],
					]
				}
			},
			{
				heading: 'Break-even points for the default car',
				paragraphs: [
					'With a 6.5% bank rate, the rebate must be about $3,405 or more for cash back to win. With a $2,000 rebate, the bank rate must be about 4.5% or lower. These are your break-even points.',
					'Notice that a cash-back payment can be lower each month and still cost more in total. Always compare the total, not only the payment.',
				]
			},
			{
				heading: 'Tips before you decide',
				paragraphs: [
					'First, a few checks help:',
				],
				list: [
					'**Get a bank or credit union quote first.** Your own loan rate drives the answer.',
					'**Check who qualifies.** Low dealer rates often need a strong credit record and may be limited to certain terms.',
					'**Match the terms.** Use the same loan length for both options.',
					'**Look at the full car cost.** The [auto loan calculator](/auto-loan-calculator) adds tax, fees and trade-in.',
					'**Think about leasing.** The [auto lease calculator](/auto-lease-calculator) shows the monthly cost of a lease.',
				]
			},
			{
				heading: 'Offers in different countries',
				paragraphs: [
					'Rebates and special rates are common in some countries and rare in others. Names differ, too, such as 0% finance or customer cash. This tool works in any currency, so enter your own rates and rebate.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not add tax or fees to either loan, and it assumes the same term for both. It also ignores the time value of money, so it does not weigh a lower payment today against a higher total later. Check the real rate of each offer with the [APR calculator](/apr-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Loan amounts',
				expression: 'Cash back loan = Price − Rebate − Down payment\nLow APR loan = Price − Down payment',
				variables: [{ symbol: 'Price', meaning: 'purchase price before the rebate' }]
			},
			{
				title: 'Monthly payment (for each option)',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'P', meaning: 'loan amount for that option' },
					{ symbol: 'r', meaning: 'monthly rate (that option’s APR ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments' }
				]
			},
			{
				title: 'Total cost and comparison',
				expression: 'Total cost = Down payment + M × n\nDifference = Total cost (cash back) − Total cost (low APR)',
				variables: []
			}
		],
		example: {
			title: 'A $35,000 car with a $2,000 rebate, a 1.9% dealer rate and a 6.5% bank rate',
			steps: [
				'Cash back: loan = 35,000 − 2,000 − 3,000 down = $30,000 at 6.5% over 60 months, so M ≈ $586.98',
				'Low APR: loan = 35,000 − 3,000 down = $32,000 at 1.9% over 60 months, so M ≈ $559.49',
				'Total cost, cash back: 3,000 + 586.98 × 60 = $38,219.07',
				'Total cost, low APR: 3,000 + 559.49 × 60 = $36,569.37, which is $1,649.70 less'
			],
			result:
				'The low APR costs $1,649.70 less overall, even though the cash-back loan is smaller. Monthly payments are $586.98 with cash back and $559.49 with the low APR.'
		},
		faq: [
			{
				q: 'Should I take cash back or low interest financing?',
				a: 'Compare the total cost of both. Take the cash back if the rebate saves more than the extra interest on your own loan. Otherwise take the low rate. This calculator shows which is cheaper.'
			},
			{
				q: 'How do I compare a rebate with a low APR?',
				a: 'Work out the loan for each option, find the payment and the total cost, and compare the totals. With the rebate, the loan is smaller but the rate is usually higher.'
			},
			{
				q: 'Does a lower monthly payment mean the cheaper deal?',
				a: 'Not always. A longer term or a higher rate can change the total. Check the total cost for both options.'
			},
			{
				q: 'Can I take the rebate and the low rate?',
				a: 'Usually not. Most dealers offer one or the other. Ask the dealer to confirm in writing.'
			},
			{
				q: 'What if I pay cash for the car?',
				a: 'Then the rebate is a straight price cut, so take it. There is no loan to compare. The low-rate offer only matters if you borrow.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Auto loans', url: 'https://www.consumerfinance.gov/' },
			{ title: 'Federal Trade Commission: Consumer advice', url: 'https://consumer.ftc.gov/' },
		],
		disclaimer:
			'Estimates only. Dealer terms, rebates and bank rates change. Get every offer in writing before you decide.'
	}
});
