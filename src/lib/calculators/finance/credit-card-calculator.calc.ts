import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './credit-card-calculator.meta';

/** Safety cap on the month-by-month loop (100 years). */
const MAX_MONTHS = 1200;
/** Months shown in the table. */
const TABLE_MONTHS = 12;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'balance', label: 'Card balance', type: 'number', default: 4800, min: 0, max: 100_000_000, step: 0.01, prefix: '$' },
		{
			id: 'apr',
			label: 'APR',
			type: 'number',
			default: 22.9,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'Interest is charged monthly at APR ÷ 12'
		},
		{
			id: 'payType',
			label: 'Payment type',
			type: 'select',
			display: 'segmented',
			default: 'fixed',
			options: [
				{ label: 'Fixed amount', value: 'fixed' },
				{ label: 'Percent of balance', value: 'percent' }
			]
		},
		{
			id: 'payment',
			label: 'Monthly payment',
			type: 'number',
			default: 150,
			min: 0,
			max: 100_000_000,
			step: 1,
			prefix: '$',
			visibleWhen: (v) => v.payType !== 'percent'
		},
		{
			id: 'percent',
			label: 'Minimum percentage',
			type: 'number',
			default: 2,
			min: 0.1,
			max: 100,
			step: 0.1,
			suffix: '%',
			help: 'Share of the statement balance',
			visibleWhen: (v) => v.payType === 'percent'
		},
		{
			id: 'floor',
			label: 'Minimum floor',
			type: 'number',
			default: 25,
			min: 0,
			max: 1_000_000,
			step: 1,
			prefix: '$',
			help: 'The payment never drops below this',
			visibleWhen: (v) => v.payType === 'percent'
		}
	],
	calculate(v): CalculationResult {
		const balance = Number(v.balance);
		const apr = Number(v.apr);
		const percentMode = String(v.payType) === 'percent';
		const fixed = Number(v.payment);
		const pct = Number(v.percent);
		const floor = Number(v.floor);
		const monthlyRate = apr / 1200;

		const inputsOk =
			balance > 0 &&
			Number.isFinite(balance) &&
			apr >= 0 &&
			apr <= 100 &&
			(percentMode ? pct > 0 && pct <= 100 && floor >= 0 && Number.isFinite(floor) : fixed > 0 && Number.isFinite(fixed));
		if (!inputsOk) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: percentMode
					? 'Enter a balance above zero, an APR from 0% to 100%, a percentage above zero and a floor of zero or more.'
					: 'Enter a balance above zero, an APR from 0% to 100%, and a monthly payment above zero.'
			};
		}

		// A fixed payment that does not cover this month's interest can never clear the card.
		const firstInterest = balance * monthlyRate;
		if (!percentMode && fixed <= firstInterest) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: `Interest alone is ${money(firstInterest)} a month, so a payment of ${money(fixed)} never clears the balance. Increase the payment.`
			};
		}

		// Month by month: add interest to the statement balance, then take this month's payment.
		let bal = balance;
		let months = 0;
		let totalInterest = 0;
		let firstPayment = 0;
		let lastPayment = 0;
		const table: Record<string, string>[] = [];
		while (bal > 0.005 && months < MAX_MONTHS) {
			const interest = bal * monthlyRate;
			bal += interest;
			totalInterest += interest;
			const due = percentMode ? Math.max(bal * (pct / 100), floor) : fixed;
			const pay = Math.min(due, bal);
			bal -= pay;
			months++;
			if (months === 1) firstPayment = pay;
			lastPayment = pay;
			if (months <= TABLE_MONTHS) {
				table.push({
					month: num(months, 0),
					payment: money(pay),
					interest: money(interest),
					principal: money(pay - interest),
					balance: money(Math.max(bal, 0))
				});
			}
		}

		if (bal > 0.005) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: percentMode
					? 'These minimums would take more than 100 years to clear the card. Raise the percentage or the floor.'
					: 'At this payment the balance would take more than 100 years to clear. Increase the payment.'
			};
		}

		const summary = percentMode
			? `Paying ${num(pct, 2)}% of the statement balance, never less than ${money(floor)}, clears ${money(balance)} in ${plural(months, 'month')}.`
			: `Paying ${money(fixed)} a month clears ${money(balance)} in ${plural(months, 'month')}.`;

		return {
			primaryResult: plural(months, 'month'),
			primaryLabel: 'Time to pay off',
			summary,
			secondaryMetrics: [
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total paid', value: money(balance + totalInterest) },
				{ label: 'First payment', value: money(firstPayment) },
				{ label: 'Final payment', value: money(lastPayment) }
			],
			table: {
				title: 'First 12 months',
				collapsed: true,
				columns: [
					{ key: 'month', label: 'Month', align: 'start' },
					{ key: 'payment', label: 'Payment', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'principal', label: 'Principal', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows: table
			}
		};
	},
	content: {
		intro:
			'Use this credit card calculator to see how long it takes to pay off a balance and how much interest you pay. Choose a fixed monthly payment, or a minimum payment based on a share of your balance.',
		howTo: [
			'Enter your card balance and the APR from your statement.',
			'Choose Fixed amount to test a set monthly payment, or Percent of balance to model a minimum payment.',
			'Enter the payment, or the minimum percentage and the smallest payment allowed (the floor).',
			'Read the time to pay off, the total interest and the first 12 months in the table.',
		],
		about: [
			{
				heading: 'How credit card interest works',
				paragraphs: [
					'A credit card charges interest on the balance you carry from month to month. This calculator divides the APR by 12 to get the monthly rate. It adds that interest to your balance, and then takes off your payment.',
					'Because interest is added to the balance, the next month’s interest is charged on a larger amount. That is why card debt grows fast when you pay little. In many countries you pay no interest if you clear the full statement balance by the due date. This tool is for balances you carry.',
				]
			},
			{
				heading: 'A fixed payment versus a minimum payment',
				paragraphs: [
					'A **fixed payment** stays the same every month. A **minimum payment** is set by the card issuer, and it usually falls as your balance falls. Issuers use different rules, such as a percentage of the balance with a floor.',
					'The table shows a $4,800 balance at 22.9% APR with fixed payments. First-month interest is $91.60, so any payment below that never clears the card.',
				],
				table: {
					caption: 'A $4,800 balance at 22.9% APR',
					columns: ['Monthly payment', 'Time to pay off', 'Total interest'],
					rows: [
						['$100', '132 months', '$8,303.08'],
						['$150', '50 months', '$2,685.39'],
						['$200', '33 months', '$1,680.61'],
						['$300', '20 months', '$982.39'],
					]
				}
			},
			{
				heading: 'Why minimum payments last so long',
				paragraphs: [
					'A minimum that is only a small share of the balance barely beats the interest. Try the Percent of balance option. A minimum of 2% of the balance, with a $25 floor, takes 1,196 months to clear this card. That is almost 100 years, and the interest alone is $54,938.12.',
					'Real minimums vary, and many include the month’s interest. Check your statement. The main lesson holds, though: paying only the minimum costs far more than a fixed payment.',
				]
			},
			{
				heading: 'Tips for clearing a card faster',
				paragraphs: [
					'Small steps make a big difference:',
				],
				list: [
					'**Pay more than the minimum.** Going from $150 to $300 a month cuts the time from 50 months to 20 and saves about $1,703 in interest.',
					'**Stop adding new purchases** to the card while you pay it down.',
					'**Set up a standing payment.** It stops missed due dates and late fees.',
					'**Plan more than one card.** The [debt payoff calculator](/debt-payoff-calculator) handles several debts at once.',
					'**Ask about a lower rate.** One loan at a lower rate may cost less. The [debt consolidation calculator](/debt-consolidation-calculator) shows if it would.',
				]
			},
			{
				heading: 'Credit cards in different countries',
				paragraphs: [
					'Cards work differently around the world. APR is the standard name in many places, but grace periods, minimum rules and fees vary. Many issuers charge interest daily, so this monthly method is a close estimate rather than an exact match.',
					'For the same card with a payment goal, try the [credit card payoff calculator](/credit-card-payoff-calculator), which also finds the payment needed for a set date.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes a fixed APR and no new purchases, fees or cash advances. It also ignores promotional rates. If your card has a late fee or an annual fee, add it to your budget separately.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly interest',
				expression: 'Interest = balance × APR ÷ 12 ÷ 100',
				variables: [{ symbol: 'APR', meaning: 'annual percentage rate on the card' }]
			},
			{
				title: 'Percentage minimum',
				expression: 'Payment = the larger of (balance after interest × percentage ÷ 100) and the floor',
				variables: [{ symbol: 'floor', meaning: 'the smallest payment allowed' }]
			},
			{
				title: 'Never pays off',
				expression: 'A fixed payment at or below the monthly interest never reduces the balance',
				variables: []
			}
		],
		example: {
			title: 'A $4,800 balance at 22.9% APR with $150 a month',
			steps: [
				'Monthly rate: 22.9 ÷ 12 ÷ 100 = 1.9083% a month',
				'First month interest: $4,800 × 1.9083% = $91.60, which is less than the $150 payment',
				'Each month, interest is added to the balance, then $150 is taken off',
				'The card is cleared in 50 months. The final payment is $135.39',
				'Total interest: $2,685.39, so the total paid is $7,485.39'
			],
			result: 'Paid off in 50 months with $2,685.39 of interest.'
		},
		faq: [
			{
				q: 'How do I calculate how long it takes to pay off a credit card?',
				a: 'Enter your balance, APR and monthly payment. The calculator adds a month of interest, takes off your payment, and repeats until the balance is zero. The result is the number of months.'
			},
			{
				q: 'How is credit card interest calculated?',
				a: 'This tool divides the APR by 12 to get a monthly rate, then applies it to your balance each month. Many issuers use a daily rate, which gives a very similar answer.'
			},
			{
				q: 'What happens if I only pay the minimum?',
				a: 'You pay interest for much longer. In the percent-of-balance example above, the minimum would take about 100 years to clear the card. Your issuer’s rules may differ.'
			},
			{
				q: 'Why does the calculator show a dash?',
				a: 'Your fixed payment is no larger than the monthly interest, so the balance never falls. On $4,800 at 22.9%, interest is $91.60 a month, so pay more than that.'
			},
			{
				q: 'Does a higher APR change the payoff time much?',
				a: 'Yes. A higher APR means more of each payment goes to interest, so the balance falls more slowly. Test your own numbers to see.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Credit cards', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneyHelper (UK Government-backed service)', url: 'https://www.moneyhelper.org.uk/' },
		],
		disclaimer:
			'Estimates only. Your card agreement sets the actual interest, minimum payments and fees. This is not financial advice.'
	}
});
