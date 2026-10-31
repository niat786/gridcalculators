import { defineCalculator, type CalculationResult, type RowValue } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './debt-payoff-calculator.meta';

/** Safety cap on the month-by-month loop (100 years). */
const MAX_MONTHS = 1200;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'debts',
			label: 'Debts',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Debt', type: 'text', default: '', placeholder: 'Debt name' },
				{ id: 'balance', label: 'Balance', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$' },
				{ id: 'apr', label: 'APR', type: 'number', default: 0, min: 0, max: 100, suffix: '%' },
				{ id: 'minimum', label: 'Minimum', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$' }
			],
			default: [
				{ name: 'Credit card', balance: 3200, apr: 21.5, minimum: 80 },
				{ name: 'Personal loan', balance: 900, apr: 15, minimum: 40 },
				{ name: 'Car loan', balance: 9500, apr: 6.9, minimum: 260 }
			],
			minRows: 1,
			maxRows: 10,
			addLabel: 'Add debt'
		},
		{
			id: 'extra',
			label: 'Extra each month',
			type: 'number',
			default: 150,
			min: 0,
			max: 100_000_000,
			step: 10,
			prefix: '$',
			help: 'Added on top of all the minimum payments'
		},
		{
			id: 'strategy',
			label: 'Payoff strategy',
			type: 'select',
			display: 'segmented',
			default: 'avalanche',
			options: [
				{ label: 'Avalanche', value: 'avalanche' },
				{ label: 'Snowball', value: 'snowball' }
			]
		}
	],
	calculate(v): CalculationResult {
		const rows = (v.debts as RowValue[]) ?? [];
		const extra = Number(v.extra);
		const snowball = String(v.strategy) === 'snowball';
		const strategyName = snowball ? 'Snowball' : 'Avalanche';

		const valid =
			rows.length >= 1 &&
			rows.length <= 10 &&
			rows.every((r) => {
				const balance = Number(r.balance);
				const apr = Number(r.apr);
				const minimum = Number(r.minimum);
				return balance > 0 && Number.isFinite(balance) && apr >= 0 && apr <= 100 && minimum > 0 && Number.isFinite(minimum);
			}) &&
			extra >= 0 &&
			Number.isFinite(extra);
		if (!valid) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to debt-free',
				summary: 'Add at least one debt with a balance, APR and minimum payment above zero, and an extra amount of zero or more.'
			};
		}

		const names = rows.map((r, i) => String(r.name).trim() || `Debt ${i + 1}`);
		const start = rows.map((r) => Number(r.balance));
		const monthlyRate = rows.map((r) => Number(r.apr) / 1200);
		const minimums = rows.map((r) => Number(r.minimum));
		const budget = minimums.reduce((s, x) => s + x, 0) + extra;

		// Payment order: avalanche = highest APR first, snowball = smallest balance first.
		// Ties keep the order the debts were entered.
		const priority = rows.map((_, i) => i);
		if (snowball) priority.sort((a, b) => start[a] - start[b] || a - b);
		else priority.sort((a, b) => monthlyRate[b] - monthlyRate[a] || a - b);

		const bal = [...start];
		const interest = rows.map(() => 0);
		const paidMonth = rows.map(() => 0);
		const open = () => bal.some((b) => b > 0.005);

		// Each month: interest is added, every open debt gets its minimum, and the rest of the
		// budget goes down the priority list. Minimums from cleared debts roll into the budget.
		let months = 0;
		while (open() && months < MAX_MONTHS) {
			months++;
			for (let i = 0; i < bal.length; i++) {
				if (bal[i] <= 0.005) continue;
				const it = bal[i] * monthlyRate[i];
				bal[i] += it;
				interest[i] += it;
			}
			let left = budget;
			for (let i = 0; i < bal.length; i++) {
				if (bal[i] <= 0.005) continue;
				const p = Math.min(minimums[i], bal[i]);
				bal[i] -= p;
				left -= p;
			}
			for (const i of priority) {
				if (left <= 1e-9) break;
				if (bal[i] <= 0.005) continue;
				const p = Math.min(left, bal[i]);
				bal[i] -= p;
				left -= p;
			}
			for (let i = 0; i < bal.length; i++) {
				if (bal[i] <= 0.005 && paidMonth[i] === 0) {
					bal[i] = 0;
					paidMonth[i] = months;
				}
			}
		}

		if (open()) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to debt-free',
				summary: 'At these payments the debts would take more than 100 years to clear. Raise the minimums or the extra amount.'
			};
		}

		const totalInterest = interest.reduce((s, x) => s + x, 0);
		const totalBalance = start.reduce((s, x) => s + x, 0);
		const payoffOrder = [...priority].sort((a, b) => paidMonth[a] - paidMonth[b]);

		return {
			primaryResult: plural(months, 'month'),
			primaryLabel: 'Time to debt-free',
			summary: `${strategyName} order with ${money(budget)} a month in total clears ${plural(rows.length, 'debt')} in ${plural(months, 'month')}.`,
			secondaryMetrics: [
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total paid', value: money(totalBalance + totalInterest) },
				{ label: 'Monthly budget', value: money(budget) },
				{ label: 'Strategy', value: strategyName }
			],
			table: {
				title: 'Payoff order',
				columns: [
					{ key: 'order', label: 'Order', align: 'start' },
					{ key: 'debt', label: 'Debt' },
					{ key: 'paid', label: 'Paid off', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' }
				],
				rows: payoffOrder.map((i, k) => ({
					order: num(k + 1, 0),
					debt: names[i],
					paid: `Month ${num(paidMonth[i], 0)}`,
					interest: money(interest[i])
				}))
			}
		};
	},
	content: {
		intro:
			'Use this debt payoff calculator to plan how to clear several debts at once. Enter each balance, rate and minimum payment, add an extra amount, and compare the avalanche and snowball methods.',
		howTo: [
			'List each debt with its balance, APR and minimum monthly payment.',
			'Enter the extra amount you can add each month on top of all the minimums.',
			'Choose Avalanche or Snowball.',
			'Read the time to be debt free, the total interest and the order in which each debt is cleared.',
		],
		about: [
			{
				heading: 'Avalanche and snowball: what they mean',
				paragraphs: [
					'Both methods work the same way. You pay the minimum on every debt. Then you send all the extra money to one debt until it is gone.',
					'The **avalanche** method targets the debt with the highest interest rate first. This usually costs the least interest. The **snowball** method targets the smallest balance first. It clears debts sooner, and some people find the quick wins keep them motivated.',
				]
			},
			{
				heading: 'How the money rolls over',
				paragraphs: [
					'When a debt is paid off, its minimum payment does not go away. It joins the extra money and goes to the next debt. As a result, each later debt is cleared faster.',
					'The monthly budget stays the same the whole time. It equals all the minimums plus your extra amount.',
				]
			},
			{
				heading: 'What extra money does',
				paragraphs: [
					'The table uses three debts: a $3,200 card at 21.5%, a $900 personal loan at 15% and a $9,500 car loan at 6.9%. Together the minimums are $380 a month. Extra money shortens the plan a lot.',
				],
				table: {
					caption: 'Three debts totalling $13,600, avalanche method',
					columns: ['Extra each month', 'Time to debt free', 'Total interest'],
					rows: [
						['$0', '45 months', '$3,256.96'],
						['$150', '29 months', '$1,640.18'],
						['$300', '22 months', '$1,175.08'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is the number of months until every debt is gone. Under it you see the total interest, the total paid and your monthly budget.',
					'The payoff order table shows when each debt is cleared and how much interest it cost. Debts with a high rate or a long life carry the most interest, so those are the ones to attack first.',
				]
			},
			{
				heading: 'Avalanche versus snowball',
				paragraphs: [
					'With the same $150 extra, both methods finish in 29 months here. The avalanche costs $1,640.18 in interest. The snowball costs $1,697.83. That is a gap of $57.65.',
					'The gap can be larger when your high-rate debts are large. So if you want the lowest cost, pick the avalanche. If you need early wins, the snowball is a fine choice.',
				]
			},
			{
				heading: 'Tips for paying off debt',
				paragraphs: [
					'A plan works best with a few habits:',
				],
				list: [
					'**Always pay every minimum on time.** Missed payments bring fees and can raise your rates.',
					'**Pick an extra amount you can keep up.** A smaller steady amount beats a big one you can’t repeat.',
					'**Avoid new debt** while you pay the old ones.',
					'**Look at one new loan.** The [debt consolidation calculator](/debt-consolidation-calculator) shows whether joining debts saves money.',
					'**Find the extra.** Use the [budget calculator](/budget-calculator) to see where it can come from.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes fixed rates, no new borrowing and the same payments every month. It does not add fees or penalties. For a single card with a minimum payment rule, use the [credit card calculator](/credit-card-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly interest on each debt',
				expression: 'Interest = balance × APR ÷ 12 ÷ 100',
				variables: [{ symbol: 'APR', meaning: 'annual rate on that debt' }]
			},
			{
				title: 'Monthly budget and roll-over',
				expression: 'Budget = Σ minimums + extra. Each month, pay every open debt its minimum, then send what is left to the debt first in the order.',
				variables: [{ symbol: 'Σ', meaning: 'sum over all debts' }]
			},
			{
				title: 'Totals',
				expression: 'Total paid = Σ balances + Σ interest',
				variables: []
			}
		],
		example: {
			title: 'Three debts with $150 extra a month, avalanche',
			steps: [
				'Monthly budget: minimums of $80 + $40 + $260 = $380, plus $150 extra = $530',
				'Credit card (21.5%) is first in line, so it takes all the spare money until it is cleared in month 17',
				'Once the card is cleared, its $80 minimum and the extra go to the personal loan, which clears in month 18',
				'The car loan, paid at $260 plus the freed money, clears in month 29',
				'Total interest: $1,640.18. Total paid: $13,600 + $1,640.18 = $15,240.18'
			],
			result: 'Debt-free in 29 months with $1,640.18 of total interest.'
		},
		faq: [
			{
				q: 'What is the best way to pay off several debts?',
				a: 'Pay every minimum, then put extra money on one debt. The avalanche method (highest rate first) usually costs the least. The snowball method (smallest balance first) gives quicker wins. Both can work.'
			},
			{
				q: 'What is the debt avalanche method?',
				a: 'You pay extra on the debt with the highest interest rate first. When it is cleared, you move to the next-highest rate. This tends to minimise interest.'
			},
			{
				q: 'What is the debt snowball method?',
				a: 'You pay extra on the smallest balance first, whatever its rate. When it is cleared, you roll its payment to the next smallest. This clears debts sooner.'
			},
			{
				q: 'Do I need an extra amount?',
				a: 'No. You can enter 0 to see how long minimum payments take. In the example above, that is 45 months, against 29 months with $150 extra.'
			},
			{
				q: 'Why does the calculator say the debts take over 100 years?',
				a: 'Your payments don’t cover the monthly interest on at least one debt. Raise the minimum or the extra amount.'
			},
			{
				q: 'How much extra should I pay each month?',
				a: 'Pick an amount you can keep up. Even a small extra helps, because it also speeds up the later debts. In the example, $150 extra saves 16 months compared with minimums alone.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneySmart (Australian Government)', url: 'https://moneysmart.gov.au/' },
		],
		disclaimer:
			'Estimates only. Your lenders’ terms set the real interest, fees and minimum payments. This is not financial advice.'
	}
});
