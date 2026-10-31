import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, plural, pct } from '../format';
import meta from './credit-card-payoff-calculator.meta';

/** Safety cap on the month-by-month loop (100 years). */
const MAX_MONTHS = 1200;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calculate',
			type: 'select',
			display: 'segmented',
			default: 'fixed',
			options: [
				{ label: 'Fixed payment', value: 'fixed' },
				{ label: 'Pay off by date', value: 'target' }
			]
		},
		{
			id: 'balance',
			label: 'Card balance',
			type: 'number',
			default: 5000,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			prefix: '$'
		},
		{
			id: 'apr',
			label: 'APR',
			type: 'number',
			default: 24,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'Annual percentage rate. Interest is charged monthly at APR ÷ 12.'
		},
		{
			id: 'payment',
			label: 'Monthly payment',
			type: 'number',
			default: 200,
			min: 0,
			max: 100_000_000,
			step: 1,
			prefix: '$',
			visibleWhen: (v) => v.mode === 'fixed'
		},
		{
			id: 'months',
			label: 'Months to pay off',
			type: 'number',
			default: 24,
			min: 1,
			max: 600,
			step: 1,
			suffix: 'months',
			decimal: false,
			visibleWhen: (v) => v.mode === 'target'
		}
	],
	calculate(v): CalculationResult {
		const balance = Number(v.balance);
		const apr = Number(v.apr);
		const r = apr / 100 / 12;

		if (!(balance > 0) || !Number.isFinite(balance) || !(apr >= 0 && apr <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: 'Enter a card balance above zero and an APR from 0% to 100%.'
			};
		}

		if (String(v.mode) === 'target') {
			const n = Number(v.months);
			if (!Number.isInteger(n) || n < 1 || n > 600) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Monthly payment',
					summary: 'Enter a whole number of months from 1 to 600.'
				};
			}
			// Level payment: P = B × r ÷ (1 − (1 + r)^−n); with no interest, P = B ÷ n.
			const payment = r === 0 ? balance / n : (balance * r) / (1 - Math.pow(1 + r, -n));
			const total = payment * n;
			const firstInterest = balance * r;
			return {
				primaryResult: money(payment),
				primaryLabel: 'Monthly payment',
				summary: `Pay ${money(payment)} a month for ${plural(n, 'month')} to clear ${money(balance)}.`,
				secondaryMetrics: [
					{ label: 'Total interest', value: money(total - balance) },
					{ label: 'Total paid', value: money(total) },
					{ label: 'First month interest', value: money(firstInterest) }
				]
			};
		}

		const payment = Number(v.payment);
		if (!Number.isFinite(payment) || !(payment > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: 'Enter a monthly payment above zero.'
			};
		}

		const firstInterest = balance * r;
		if (payment <= firstInterest) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: `Interest alone is ${money(firstInterest)} a month, so a payment of ${money(payment)} never pays off the balance. Increase the payment.`
			};
		}

		// Step through each month: add interest, then subtract the payment (the last one may be smaller).
		let bal = balance;
		let months = 0;
		let interest = 0;
		let lastPayment = 0;
		while (bal > 0.005 && months < MAX_MONTHS) {
			const monthInterest = bal * r;
			interest += monthInterest;
			bal += monthInterest;
			const pay = Math.min(payment, bal);
			bal -= pay;
			lastPayment = pay;
			months++;
		}

		if (bal > 0.005) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Time to pay off',
				summary: 'At this payment the balance would take more than 100 years to clear. Increase the payment.'
			};
		}

		return {
			primaryResult: plural(months, 'month'),
			primaryLabel: 'Time to pay off',
			summary: `Paying ${money(payment)} a month clears ${money(balance)} in ${plural(months, 'month')}.`,
			secondaryMetrics: [
				{ label: 'Total interest', value: money(interest) },
				{ label: 'Total paid', value: money(balance + interest) },
				{ label: 'Final payment', value: money(lastPayment) }
			]
		};
	},
	content: {
		intro:
			'Use this credit card payoff calculator to find how long a monthly payment takes to clear your balance. Or choose a payoff date, and see the payment you need to get there.',
		howTo: [
			'Choose Fixed payment to find the time, or Pay off by date to find the payment.',
			'Enter your card balance and the APR from your statement.',
			'Enter the monthly payment you can make, or the number of months you want.',
			'Read the result, then check the total interest and the total paid.',
		],
		about: [
			{
				heading: 'Two ways to plan a payoff',
				paragraphs: [
					'Some people know what they can pay each month. Others have a date in mind. This tool handles both.',
					'In **Fixed payment** mode, you enter the payment and get the months. In **Pay off by date** mode, you enter the months and get the level payment that clears the balance.',
				]
			},
			{
				heading: 'What a bigger payment saves',
				paragraphs: [
					'The table uses a $5,000 balance at 24% APR. The first month’s interest is $100. That means a payment of $100 never reduces the debt.',
					'Each extra bit of payment cuts both the time and the interest. For example, $300 a month instead of $200 saves 15 months and about $857 in interest.',
				],
				table: {
					caption: 'A $5,000 balance at 24% APR',
					columns: ['Monthly payment', 'Time to pay off', 'Total interest'],
					rows: [
						['$150', '56 months', '$3,322.09'],
						['$200', '36 months', '$2,000.56'],
						['$300', '21 months', '$1,143.34'],
						['$400', '15 months', '$811.97'],
					]
				}
			},
			{
				heading: 'Paying off by a set date',
				paragraphs: [
					'If you pick a date, the payment is level, so it stays the same each month. A shorter plan means a bigger payment but less interest.',
				],
				table: {
					caption: 'The same $5,000 at 24% APR',
					columns: ['Pay off in', 'Monthly payment', 'Total interest'],
					rows: [
						['12 months', '$472.80', '$673.58'],
						['24 months', '$264.36', '$1,344.53'],
						['36 months', '$196.16', '$2,061.91'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'In Fixed payment mode, the headline is the number of months. Below it you see the total interest, the total paid and the final payment, which is usually smaller than the rest.',
					'In Pay off by date mode, the headline is the monthly payment. You also see the interest in the first month. If that figure is close to your payment, most of your early payments go to interest, so the balance falls slowly at first.',
				]
			},
			{
				heading: 'Tips for paying off a card',
				paragraphs: [
					'These habits help most:',
				],
				list: [
					'**Pay on the due date, or earlier.** Late payments can add fees.',
					'**Round up.** If the plan needs $264.36, paying $270 adds a small cushion.',
					'**Use windfalls.** A bonus or tax refund can cut the balance at once.',
					'**Plan all your debts.** If you owe more than one card, the [debt payoff calculator](/debt-payoff-calculator) shows the best order.',
					'**Look for a cheaper loan.** The [personal loan calculator](/personal-loan-calculator) can show whether a loan costs less than your card.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes a fixed APR and no new purchases, late fees or cash advances. Your issuer may charge interest daily, so your real result can differ a little. Check your statement for the exact balance and rate. To model a card’s minimum payment, use the [credit card calculator](/credit-card-calculator).',
				]
			},
			{
				heading: 'Card payoff in different countries',
				paragraphs: [
					'Card rules differ around the world. The name APR is common, but interest may be charged daily or monthly, and some countries give an interest-free period when you pay in full. This tool works for any currency, so pick yours at the top.',
					'If you owe on more than one account, the [debt payoff calculator](/debt-payoff-calculator) can plan them together.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly interest',
				expression: 'Interest for the month = Balance × (APR ÷ 12 ÷ 100)',
				variables: [{ symbol: 'APR', meaning: 'annual percentage rate on the card' }]
			},
			{
				title: 'Months to pay off with a fixed payment',
				expression: 'n = −ln(1 − B × r ÷ P) ÷ ln(1 + r), rounded up',
				variables: [
					{ symbol: 'n', meaning: 'number of monthly payments' },
					{ symbol: 'B', meaning: 'card balance' },
					{ symbol: 'r', meaning: 'monthly interest rate (APR ÷ 12 ÷ 100)' },
					{ symbol: 'P', meaning: 'monthly payment' }
				]
			},
			{
				title: 'Payment for a set number of months',
				expression: 'P = B × r ÷ (1 − (1 + r)⁻ⁿ)',
				variables: [{ symbol: 'n', meaning: 'number of months to pay off' }]
			}
		],
		example: {
			title: 'A $5,000 balance at 24% APR with $200 a month',
			steps: [
				'Monthly rate: 24 ÷ 12 ÷ 100 = 0.02',
				'First month interest: $5,000 × 0.02 = $100, which is less than the $200 payment',
				'Each month, add interest to the balance, then subtract $200',
				'The card is cleared in 36 months, and the final payment is $0.56'
			],
			result: 'Paid off in 36 months. Total interest $2,000.56.'
		},
		faq: [
			{
				q: 'How long will it take to pay off my credit card?',
				a: 'It depends on the balance, the APR and your monthly payment. Enter all three. For example, $5,000 at 24% with $200 a month takes 36 months.'
			},
			{
				q: 'How much do I need to pay each month to clear my card by a date?',
				a: 'Switch to Pay off by date and enter the number of months. The calculator finds the level payment that clears the balance on time. For $5,000 at 24% over 24 months, that is $264.36.'
			},
			{
				q: 'Why is my final payment so small?',
				a: 'The last payment only clears what is left. In the $200 example, the final payment is $0.56.'
			},
			{
				q: 'Why does the calculator show a dash?',
				a: 'Your payment is no larger than a month’s interest, so the balance never falls. Raise it above that amount.'
			},
			{
				q: 'Is it better to pay a card off faster?',
				a: 'Usually yes, because card rates are high and interest adds up. But keep some cash for emergencies, so you don’t have to borrow again.'
			},
			{
				q: 'Does this calculator work for store cards and overdrafts?',
				a: 'It can, if the interest is charged as a yearly rate and added to the balance each month. Enter the APR your provider states. Fees and extra charges are not included.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Credit cards', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneySmart (Australian Government)', url: 'https://moneysmart.gov.au/' },
		],
		disclaimer:
			'Estimates only. Your card agreement sets the actual interest, fees and minimum payments. This is not financial advice.'
	}
});
