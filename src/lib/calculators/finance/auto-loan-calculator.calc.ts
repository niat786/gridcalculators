import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './auto-loan-calculator.meta';

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
		{ id: 'price', label: 'Vehicle price', type: 'number', default: 35000, min: 1, max: 10_000_000, step: 500, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 3000, min: 0, max: 10_000_000, step: 100, prefix: '$' },
		{ id: 'trade', label: 'Trade-in value', type: 'number', default: 5000, min: 0, max: 10_000_000, step: 100, prefix: '$', help: 'What the dealer gives for your current car' },
		{ id: 'tax', label: 'Sales tax', type: 'number', default: 7, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Charged on the price after trade-in' },
		{ id: 'fees', label: 'Fees', type: 'number', default: 500, min: 0, max: 1_000_000, step: 50, prefix: '$', help: 'Registration, documents and other fees' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.9, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{
			id: 'term',
			label: 'Loan term',
			type: 'select',
			display: 'segmented',
			default: '60',
			options: [
				{ label: '36 mo', value: '36' },
				{ label: '48 mo', value: '48' },
				{ label: '60 mo', value: '60' },
				{ label: '72 mo', value: '72' },
				{ label: '84 mo', value: '84' }
			]
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const down = Number(v.down) || 0;
		const trade = Number(v.trade) || 0;
		const taxPct = Number(v.tax) || 0;
		const fees = Number(v.fees) || 0;
		const rate = Number(v.rate);
		const n = Number(v.term);

		const tax = (taxPct / 100) * Math.max(0, price - trade);
		const loan = price - down - trade + tax + fees;

		if (
			!(price > 0) ||
			!Number.isFinite(price) ||
			!(down >= 0 && trade >= 0 && taxPct >= 0 && fees >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(n >= 1) ||
			!(loan > 0) ||
			!Number.isFinite(loan)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter a vehicle price, and make sure the down payment and trade-in do not cover the whole cost.'
			};
		}

		const monthly = payment(loan, rate, n);
		const totalPayments = monthly * n;
		const totalInterest = Math.max(0, totalPayments - loan);
		// Cash you put in plus every loan payment: the car's net price, tax, fees and interest.
		const totalCost = down + totalPayments;

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `${money(loan, true)} financed for ${n} months at ${num(rate, 3)}%.`,
			secondaryMetrics: [
				{ label: 'Loan amount', value: money(loan) },
				{ label: 'Sales tax', value: money(tax) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total of loan payments', value: money(totalPayments) },
				{ label: 'Total cost', value: money(totalCost) }
			]
		};
	},
	content: {
		intro:
			'Use this auto loan calculator to estimate your monthly car payment and the real cost of the loan. It adds sales tax and fees, then takes off your down payment and trade-in.',
		howTo: [
			'Enter the vehicle price and any cash down payment.',
			'Enter the trade-in value of your current car, if you have one.',
			'Add the sales tax rate and the fees your dealer lists.',
			'Enter the interest rate, pick a loan term and read your monthly payment.',
		],
		about: [
			{
				heading: 'What does a car loan cover?',
				paragraphs: [
					'A car loan lets you pay for a vehicle over time. The lender pays the seller, and you repay the lender with interest. The car is usually the security for the loan, so the lender can take it back if you stop paying.',
					'This calculator first works out how much you will borrow. It starts with the price, then adds sales tax and fees. Next it takes off your down payment and trade-in. What is left is your loan amount.',
				]
			},
			{
				heading: 'How the loan amount is worked out',
				paragraphs: [
					'For example, take a $35,000 car with $3,000 down and a $5,000 trade-in. Sales tax of 7% on the $30,000 left after the trade-in is $2,100. Add $500 in fees, and you borrow $29,600.',
					'This tool charges tax on the price after the trade-in. Some places tax the full price instead, so check your local rule. If you pay tax or fees in cash, enter a bigger down payment.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The monthly payment is the number most buyers watch. But the total cost shows what the car really costs you. It includes your down payment, every loan payment, tax and fees.',
					'In the default example, the car costs $35,000. The total cost is $38,083.20, which is your $3,000 down payment plus every loan payment. Your $5,000 trade-in counts on top of that.',
				]
			},
			{
				heading: 'How the loan term changes the cost',
				paragraphs: [
					'The table uses the $29,600 loan above at 6.9%. A longer term gives a smaller payment, but it costs much more in interest.',
					'There is a second risk. A car loses value quickly, so on a long loan you may owe more than the car is worth.',
				],
				table: {
					caption: 'A $29,600 car loan at 6.9%',
					columns: ['Loan term', 'Monthly payment', 'Total interest'],
					rows: [
						['36 months', '$912.61', '$3,253.94'],
						['60 months', '$584.72', '$5,483.20'],
						['84 months', '$445.30', '$7,805.01'],
					]
				}
			},
			{
				heading: 'Tips for a cheaper car loan',
				paragraphs: [
					'A few steps can lower what you pay:',
				],
				list: [
					'**Get a rate quote before you visit the dealer.** Then you can compare it with the dealer’s offer.',
					'**Put more down.** A bigger down payment means a smaller loan and less interest.',
					'**Pick the shortest term that fits your budget.** Use the table above to see the trade-off.',
					'**Compare a rebate with cheap finance.** The [cash back or low interest calculator](/cash-back-or-low-interest-calculator) shows which deal costs less.',
					'**Think about leasing.** The [auto lease calculator](/auto-lease-calculator) shows the monthly cost of a lease.',
				]
			},
			{
				heading: 'Car loans in different countries',
				paragraphs: [
					'Rules differ by country. What this tool calls sales tax may be VAT, GST or a registration fee where you live, so enter your local rate and fees.',
					'In the UK, car finance often comes as hire purchase or PCP (personal contract purchase). A PCP plan ends with a large final payment. This calculator suits a standard loan with no final payment. In South Asia, the payment is called an EMI, so you can also try the [EMI calculator](/emi-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'The result covers the loan only. It does not include insurance, fuel, servicing or parking, and these can add a lot each month. A car payment that fits your budget on its own may not fit once you add them.',
					'It also assumes a fixed rate and equal monthly payments. Some dealers offer a deferred first payment or a final balloon payment, and those change the maths. Ask for a full written quote before you sign.',
				]
			}
		],
		formulas: [
			{
				title: 'Loan amount',
				expression: 'Loan = price − down payment − trade-in + tax + fees',
				variables: [
					{ symbol: 'Tax', meaning: 'sales tax % × (price − trade-in)' }
				]
			},
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments (the loan term in months)' }
				]
			},
			{
				title: 'Total cost',
				expression: 'Total cost = down payment + M × n',
				variables: [
					{ symbol: 'Total cost', meaning: 'what you pay in cash and loan payments, after the trade-in is credited' }
				]
			}
		],
		example: {
			title: 'A $35,000 car with $3,000 down, a $5,000 trade-in, 7% tax and $500 fees at 6.9% for 60 months',
			steps: [
				'Tax: 7% × ($35,000 − $5,000) = $2,100',
				'Loan: $35,000 − $3,000 − $5,000 + $2,100 + $500 = $29,600',
				'Monthly rate: r = 6.9 ÷ 12 ÷ 100 = 0.00575, n = 60',
				'M = 29,600 × 0.00575 × (1.00575)⁶⁰ ÷ ((1.00575)⁶⁰ − 1) ≈ $584.72',
				'Total cost = $3,000 + 584.72 × 60 = $38,083.20'
			],
			result: 'Monthly payment of $584.72 on a $29,600 loan. Total interest is $5,483.20.'
		},
		faq: [
			{
				q: 'How is a car loan payment calculated?',
				a: 'First the calculator finds the loan amount: price, plus tax and fees, minus down payment and trade-in. Then it uses the loan formula with your rate and term to find the monthly payment.'
			},
			{
				q: 'Why is sales tax added to the loan?',
				a: 'Many buyers roll tax and fees into the amount they finance, so the payment includes them. If you pay them in cash, enter a bigger down payment instead.'
			},
			{
				q: 'Is the trade-in value taxed?',
				a: 'It depends where you live. In many US states the tax applies only to the price after the trade-in, and this calculator works that way. Other places tax the full price, so check your local rule.'
			},
			{
				q: 'What is a good loan term for a car?',
				a: 'Choose the shortest term whose payment fits your budget. On the loan above, 36 months costs $3,253.94 in interest and 84 months costs $7,805.01.'
			},
			{
				q: 'Why is the total cost higher than the price?',
				a: 'The total cost includes interest, tax and fees. It also counts your down payment, so it shows everything you pay for the car after the trade-in credit.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Auto loans', url: 'https://www.consumerfinance.gov/' },
			{ title: 'Federal Trade Commission: Consumer advice', url: 'https://consumer.ftc.gov/' },
		],
		disclaimer:
			'Estimates only. Your real tax, fees, trade-in value and loan rate depend on your location, dealer and lender.'
	}
});
