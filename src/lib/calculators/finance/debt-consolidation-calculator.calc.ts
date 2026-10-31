import { defineCalculator, type CalculationResult, type RowValue } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './debt-consolidation-calculator.meta';

/** Safety cap on each month-by-month loop (100 years). */
const MAX_MONTHS = 1200;

/** Level payment on a loan: P·r(1 + r)^n / ((1 + r)^n − 1); r = 0 → P / n. */
function levelPayment(principal: number, annualPct: number, n: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / n;
	const f = Math.pow(1 + r, n);
	return (principal * r * f) / (f - 1);
}

/**
 * Pay one debt at a fixed monthly amount: add interest, then take the payment.
 * Returns null when the balance never clears within the cap.
 */
function payOff(balance: number, apr: number, payment: number): { months: number; interest: number } | null {
	const r = apr / 1200;
	let bal = balance;
	let months = 0;
	let interest = 0;
	while (bal > 0.005 && months < MAX_MONTHS) {
		const i = bal * r;
		interest += i;
		bal += i;
		bal -= Math.min(payment, bal);
		months++;
	}
	return bal > 0.005 ? null : { months, interest };
}

function termText(months: number): string {
	return plural(months, 'month');
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'debts',
			label: 'Current debts',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Debt', type: 'text', default: '', placeholder: 'Debt name' },
				{ id: 'balance', label: 'Balance', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$' },
				{ id: 'apr', label: 'APR', type: 'number', default: 0, min: 0, max: 100, suffix: '%' },
				{ id: 'payment', label: 'Monthly payment', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$' }
			],
			default: [
				{ name: 'Credit card', balance: 4200, apr: 24.99, payment: 120 },
				{ name: 'Store card', balance: 1800, apr: 29.9, payment: 60 },
				{ name: 'Personal loan', balance: 6000, apr: 12.5, payment: 180 }
			],
			minRows: 1,
			maxRows: 10,
			addLabel: 'Add debt'
		},
		{ id: 'newRate', label: 'New loan rate', type: 'number', default: 11, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate on the consolidation loan' },
		{ id: 'newMonths', label: 'New loan term (months)', type: 'number', default: 60, min: 1, max: MAX_MONTHS / 2, step: 1, suffix: 'months', decimal: false },
		{
			id: 'feePct',
			label: 'Consolidation fee',
			type: 'number',
			default: 3,
			min: 0,
			max: 20,
			step: 0.1,
			suffix: '%',
			help: 'Charged on the total balance and added to the loan'
		}
	],
	calculate(v): CalculationResult {
		const rows = (v.debts as RowValue[]) ?? [];
		const newRate = Number(v.newRate);
		const newMonths = Number(v.newMonths);
		const feePct = Number(v.feePct);
		const primaryLabel = 'Total saved';

		const debtsValid = rows.length > 0 && rows.every((r) => {
			const balance = Number(r.balance);
			const apr = Number(r.apr);
			const payment = Number(r.payment);
			return balance > 0 && Number.isFinite(balance) && apr >= 0 && apr <= 100 && payment > 0 && Number.isFinite(payment);
		});
		if (
			!debtsValid ||
			!(newRate >= 0 && newRate <= 100) ||
			!Number.isInteger(newMonths) ||
			newMonths < 1 ||
			newMonths > MAX_MONTHS / 2 ||
			!(feePct >= 0 && feePct <= 20)
		) {
			return {
				primaryResult: DASH,
				primaryLabel,
				summary: 'Enter a balance, APR and monthly payment for every debt, plus the new loan rate, term and fee.'
			};
		}

		// Current plan: each debt paid at its own payment, one after another in time.
		let totalBalance = 0;
		let currentPayment = 0;
		let currentInterest = 0;
		let currentMonths = 0;
		const table: Record<string, string>[] = [];
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const balance = Number(row.balance);
			const apr = Number(row.apr);
			const payment = Number(row.payment);
			const name = String(row.name).trim() || `Debt ${i + 1}`;
			const result = payOff(balance, apr, payment);
			if (!result) {
				return {
					primaryResult: DASH,
					primaryLabel,
					summary: `${name} would never be paid off at ${money(payment)} a month. Raise that payment above its monthly interest.`
				};
			}
			totalBalance += balance;
			currentPayment += payment;
			currentInterest += result.interest;
			currentMonths = Math.max(currentMonths, result.months);
			table.push({
				debt: name,
				balance: money(balance),
				apr: `${num(apr, 2)}%`,
				payment: money(payment),
				months: num(result.months, 0),
				interest: money(result.interest)
			});
		}

		// New loan: the fee is added to the balance, then the loan is repaid at its level payment.
		const fee = totalBalance * (feePct / 100);
		const newPayment = levelPayment(totalBalance + fee, newRate, newMonths);
		const newCost = newPayment * newMonths - totalBalance;
		const diff = currentInterest - newCost;

		return {
			primaryResult: money(Math.abs(diff)),
			primaryLabel: diff >= 0 ? 'Total saved' : 'Extra cost',
			summary: `The new loan costs ${money(newCost)} in interest and fees, against ${money(currentInterest)} of interest on your current debts.`,
			secondaryMetrics: [
				{ label: 'Current monthly payments', value: money(currentPayment) },
				{ label: 'New monthly payment', value: money(newPayment) },
				{ label: 'Current payoff time', value: termText(currentMonths) },
				{ label: 'New loan term', value: termText(newMonths) },
				{ label: 'Current total interest', value: money(currentInterest) },
				{ label: 'New loan total cost', value: money(newCost) },
				{ label: 'Consolidation fee', value: money(fee) }
			],
			table: {
				title: 'Current debts, paid separately',
				collapsed: true,
				columns: [
					{ key: 'debt', label: 'Debt' },
					{ key: 'balance', label: 'Balance', align: 'end' },
					{ key: 'apr', label: 'APR', align: 'end' },
					{ key: 'payment', label: 'Payment', align: 'end' },
					{ key: 'months', label: 'Months', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' }
				],
				rows: table
			}
		};
	},
	content: {
		intro:
			'Use this debt consolidation calculator to compare paying several debts separately with one new loan. It adds a consolidation fee and shows whether you would save money or pay more.',
		howTo: [
			'List each current debt with its balance, APR and the monthly payment you make.',
			'Enter the rate and term of the new consolidation loan.',
			'Enter the consolidation fee as a percentage. It is added to the new loan.',
			'Compare the total cost, the monthly payment and the payoff time of both plans.',
		],
		about: [
			{
				heading: 'What is debt consolidation?',
				paragraphs: [
					'Debt consolidation means taking one new loan to pay off several debts. You then make one payment each month instead of many. The aim is usually a lower rate, a lower payment, or both.',
					'It does not remove the debt. It moves it. So the new loan only helps if its total cost is lower, or if you value the lower payment.',
				]
			},
			{
				heading: 'How the calculator compares the two plans',
				paragraphs: [
					'First, for your current debts, it pays each one at its own monthly payment and adds up the interest. Next, for the new loan, it adds the fee to the balance, then finds the payment for your rate and term. The new loan cost is its payments minus the debts it clears.',
					'In the default case, $12,000 of debts would cost $6,363.26 in interest. A new loan at 11% over 60 months with a 3% fee costs $4,124.18. That saves $2,239.08, and the monthly payment falls from $360.00 to $268.74.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline shows the total saved, or the extra cost if the new loan is worse. Under it, you can compare the monthly payments, the payoff times and the total interest on each plan.',
					'Look at the monthly payment and the term together. A big drop in payment is good for your budget, but it is not a saving unless the total cost falls too.',
				]
			},
			{
				heading: 'When consolidation helps and when it does not',
				paragraphs: [
					'The rate and the term decide the result. The table changes one setting at a time on the same three debts.',
				],
				table: {
					caption: 'Three debts totalling $12,000, compared with $6,363.26 of current interest',
					columns: ['New loan', 'Monthly payment', 'Result'],
					rows: [
						['11%, 60 months, 3% fee', '$268.74', 'Saves $2,239.08'],
						['11%, 60 months, no fee', '$260.91', 'Saves $2,708.72'],
						['11%, 36 months, 3% fee', '$404.65', 'Saves $3,795.84'],
						['11%, 84 months, 3% fee', '$211.63', 'Saves $586.06'],
						['20%, 60 months, 3% fee', '$327.46', 'Costs $1,284.60 more'],
					]
				}
			},
			{
				heading: 'Things to watch',
				paragraphs: [
					'Check these points before you apply:',
				],
				list: [
					'**A longer term cuts the payment but adds interest.** The 84-month row above shows the saving shrinking.',
					'**Fees count.** Ask for the full fee in writing, and check the real rate with the [APR calculator](/apr-calculator).',
					'**Don’t borrow again on the old cards.** New debt on top of the loan makes things worse.',
					'**Secured loans carry risk.** If your home or car backs the loan, you could lose it.',
					'**Compare with a plan.** The [debt payoff calculator](/debt-payoff-calculator) shows what extra payments do without a new loan.',
				]
			},
			{
				heading: 'Consolidation in different countries',
				paragraphs: [
					'Options differ by country. Some places offer balance transfer cards, personal loans, or formal debt plans run by approved agencies. Rules, fees and effects on your credit record vary, so ask a local adviser. A [personal loan](/personal-loan-calculator) is the most common route that this tool models.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes fixed rates and no new borrowing. It also does not model credit score effects or balance transfer offers. It compares the interest on each plan, and it assumes you pay each current debt at the payment you entered.',
				]
			}
		],
		formulas: [
			{
				title: 'Current plan, one debt at a time',
				expression: 'Each month: interest = balance × APR ÷ 12, then balance = balance + interest − payment',
				variables: [{ symbol: 'APR', meaning: 'annual rate on that debt, as a decimal ÷ 100' }]
			},
			{
				title: 'New loan payment',
				expression: 'M = (B + F) × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'B', meaning: 'total of all current balances' },
					{ symbol: 'F', meaning: 'consolidation fee (B × fee %)' },
					{ symbol: 'r', meaning: 'new loan rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'new loan term in months' }
				]
			},
			{
				title: 'Total cost compared',
				expression: 'New loan cost = M × n − B        Saving = current interest − new loan cost',
				variables: []
			}
		],
		example: {
			title: 'Three debts with $12,000 in total balances',
			steps: [
				'Current interest, each debt paid at its own payment: $6,363.26 in total, over up to 64 months',
				'Consolidation fee: 3% of $12,000 = $360, so the new loan is $12,360',
				'New loan at 11% over 60 months: payment of $268.74 a month',
				'New loan cost: 268.736 × 60 − 12,000 = $4,124.18 (interest plus the fee)',
				'Saving: 6,363.26 − 4,124.18 = $2,239.08'
			],
			result: 'The consolidation loan saves $2,239.08 and lowers the monthly payment from $360.00 to $268.74.'
		},
		faq: [
			{
				q: 'Does debt consolidation save money?',
				a: 'Only when the new loan costs less in total interest and fees. A lower rate helps, but a longer term can cancel the gain. Use the calculator with your own numbers.'
			},
			{
				q: 'How is the saving worked out?',
				a: 'It subtracts the cost of the new loan from the interest on your current debts. The new loan cost includes the fee. A positive result is a saving, and a negative one is an extra cost.'
			},
			{
				q: 'Why is my new payment lower but the saving small?',
				a: 'A longer term spreads the cost, so each payment is smaller. But you pay interest for more months. Compare the total cost, not only the payment.'
			},
			{
				q: 'Can consolidation hurt my credit?',
				a: 'It can, in the short term. A new loan may involve a credit check, and closing old accounts can change your record. The effect depends on your country and your history.'
			},
			{
				q: 'What if I keep paying my old amount?',
				a: 'If you pay $360 a month on the new loan, you clear it sooner and pay less interest. Try a shorter term in the calculator to see this.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneySmart (Australian Government)', url: 'https://moneysmart.gov.au/' },
		],
		disclaimer:
			'Estimates only. Your lender’s rate, fees and terms will differ. This is not financial advice. A debt adviser can help with your case.'
	}
});
