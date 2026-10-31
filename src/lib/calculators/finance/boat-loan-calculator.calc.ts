import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './boat-loan-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

const TERMS = [60, 72, 84, 96, 120, 144, 180, 240];

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Boat price', type: 'number', default: 45000, min: 0, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 5000, min: 0, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'trade', label: 'Trade-in value', type: 'number', default: 0, min: 0, max: 100_000_000, step: 500, prefix: '$', help: 'Value of a boat or vehicle you hand over.' },
		{ id: 'taxPct', label: 'Sales tax', type: 'number', default: 6, min: 0, max: 30, step: 0.1, suffix: '%', help: 'Your local rate on the taxable price.' },
		{
			id: 'taxAfter',
			label: 'Tax is charged after trade-in',
			type: 'toggle',
			default: true,
			help: 'Some places tax the price minus the trade-in. Others tax the full price. Check your local rule.'
		},
		{ id: 'fees', label: 'Fees added to the loan', type: 'number', default: 500, min: 0, max: 10_000_000, step: 50, prefix: '$', help: 'Registration, documentation, delivery and similar charges.' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 8.5, min: 0, max: 40, step: 0.01, suffix: '%', help: 'Annual rate' },
		{
			id: 'term',
			label: 'Loan term',
			type: 'select',
			display: 'menu',
			default: '60',
			options: TERMS.map((m) => ({ label: `${m} months (${m / 12} years)`, value: String(m) }))
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const down = Number(v.down);
		const trade = Number(v.trade);
		const taxPct = Number(v.taxPct);
		const fees = Number(v.fees);
		const rate = Number(v.rate);
		const n = Number(v.term);
		const primaryLabel = 'Monthly payment';

		if (
			!Number.isFinite(price) || price < 0 ||
			!Number.isFinite(down) || down < 0 ||
			!Number.isFinite(trade) || trade < 0 ||
			!(taxPct >= 0 && taxPct <= 30) ||
			!(fees >= 0) ||
			!(rate >= 0 && rate <= 40) ||
			!Number.isInteger(n) || n < 1 || n > 600
		) {
			return { primaryResult: DASH, primaryLabel, summary: 'Check the prices, tax, rate and term. The term must be a whole number of months.' };
		}

		const taxable = v.taxAfter ? Math.max(0, price - trade) : price;
		const tax = (taxable * taxPct) / 100;
		const financed = price + tax + fees - down - trade;
		if (!(financed > 0)) {
			return { primaryResult: DASH, primaryLabel, summary: 'Your down payment and trade-in cover the whole cost, so no loan is needed.' };
		}

		const monthly = payment(financed, rate, n);
		const totalPayments = monthly * n;
		const totalInterest = Math.max(0, totalPayments - financed);
		const totalCost = down + totalPayments;

		return {
			primaryResult: money(monthly),
			primaryLabel,
			summary: `Borrowing ${money(financed, true)} at ${num(rate, 3)}% over ${plural(n, 'month')}.`,
			secondaryMetrics: [
				{ label: 'Amount financed', value: money(financed) },
				{ label: 'Sales tax', value: money(tax) },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total of loan payments', value: money(totalPayments) },
				{ label: 'Total cost, with down payment', value: money(totalCost) }
			]
		};
	},
	content: {
		intro:
			'Use this boat loan calculator to estimate your monthly payment and the full cost of financing a boat. It adds sales tax and fees, subtracts your down payment and trade-in, and shows total interest.',
		howTo: [
			'Enter the boat price, your down payment and any trade-in value.',
			'Enter the sales tax rate, choose if tax applies after the trade-in, and add the fees you finance.',
			'Enter the interest rate and choose a term, from 5 to 20 years.',
			'Read the monthly payment, the total interest and the total cost.',
		],
		about: [
			{
				heading: 'How a boat loan works',
				paragraphs: [
					'A boat loan is a secured loan. Because the boat is the security, the lender can take it if you stop paying. You repay the amount financed, plus interest, in equal monthly payments.',
					'Boat loans often run longer than car loans, so this tool offers terms from 5 to 20 years. A longer term lowers the payment, but it adds a lot of interest.',
				]
			},
			{
				heading: 'How the amount financed is worked out',
				paragraphs: [
					'First, the calculator takes the price and adds sales tax and fees. Next, it subtracts your down payment and trade-in. For example, a $45,000 boat with 6% tax, $500 in fees and $5,000 down means you finance $43,200.',
					'Tax rules vary, because some places tax the full price and others tax the price after the trade-in. A toggle in the tool lets you choose.',
				]
			},
			{
				heading: 'How the term changes the cost',
				paragraphs: [
					'The table uses the $43,200 loan at 8.5%. The table shows three of the terms the tool offers. Each longer term costs far more in interest.',
				],
				table: {
					caption: 'A $43,200 boat loan at 8.5%',
					columns: ['Loan term', 'Monthly payment', 'Total interest'],
					rows: [
						['5 years (60 months)', '$886.31', '$9,978.85'],
						['10 years (120 months)', '$535.62', '$21,074.18'],
						['15 years (180 months)', '$425.41', '$33,373.35'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is the monthly payment on the amount financed. Under it, you see the sales tax, the total interest and the total of loan payments. The last line adds your down payment, so it shows everything you pay for the boat.',
					'In the default case, the payments total $53,178.85, and with the $5,000 down payment the total cost is $58,178.85.',
				]
			},
			{
				heading: 'Costs beyond the loan',
				paragraphs: [
					'But a boat also has running costs that the loan does not cover:',
				],
				list: [
					'**Insurance.** Most lenders ask for it, and the price depends on the boat and where you use it.',
					'**Storage or mooring.** Marina fees, trailers and winter storage can be large.',
					'**Maintenance and fuel.** Engines and hulls need regular care.',
					'**Value loss.** Like cars, boats usually lose value over time. See the [depreciation calculator](/depreciation-calculator).',
					'**A car loan comparison.** The [auto loan calculator](/auto-loan-calculator) works the same way for vehicles.',
				]
			},
			{
				heading: 'Boat loans in different countries',
				paragraphs: [
					'Rules differ by country. Taxes may be VAT, GST or a registration charge, and some places add them at purchase or at registration. Lenders may also ask for a survey or a larger down payment, so ask early. Enter the rate your lender offers and the local tax you expect.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes a fixed rate and equal payments, so it does not include insurance, storage, running costs or any balloon payment. Check the real cost of borrowing with the [APR calculator](/apr-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Amount financed',
				expression: 'Financed = Price + Tax + Fees − Down payment − Trade-in\nTax = (Price − Trade-in) × Tax rate, or Price × Tax rate',
				variables: [
					{ symbol: 'Tax', meaning: 'sales tax, on the price after trade-in if that option is on' },
					{ symbol: 'Fees', meaning: 'charges you finance with the loan' }
				]
			},
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'amount financed' },
					{ symbol: 'r', meaning: 'monthly rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments' }
				]
			},
			{
				title: 'Totals',
				expression: 'Total interest = M × n − P\nTotal cost = Down payment + M × n',
				variables: []
			}
		],
		example: {
			title: 'A $45,000 boat with $5,000 down over 5 years at 8.5%',
			steps: [
				'Tax: 6% × $45,000 = $2,700 (no trade-in)',
				'Amount financed: 45,000 + 2,700 + 500 fees − 5,000 down = $43,200',
				'Monthly rate: r = 8.5 ÷ 12 ÷ 100 = 0.0070833, and n = 60',
				'M = 43,200 × r × (1 + r)⁶⁰ ÷ ((1 + r)⁶⁰ − 1) ≈ $886.31',
				'Total payments = 886.31 × 60 = $53,178.85, so interest = 53,178.85 − 43,200 = $9,978.85'
			],
			result:
				'Monthly payment of $886.31. Total interest of $9,978.85, and a total cost of $58,178.85 with the down payment.'
		},
		faq: [
			{
				q: 'How do I calculate a boat loan payment?',
				a: 'First find the amount financed: price plus tax and fees, minus down payment and trade-in. Then use the loan formula with your rate and term. This calculator does both steps.'
			},
			{
				q: 'What is a typical boat loan term?',
				a: 'Terms vary a lot. This calculator offers 5 to 20 years. Longer terms lower the monthly payment but raise the total interest, as the table above shows.'
			},
			{
				q: 'Does sales tax apply after the trade-in?',
				a: 'It depends where you live. In some places, tax is charged only on the price after the trade-in. In others, it is charged on the full price. The toggle lets you match your local rule.'
			},
			{
				q: 'Why is my total cost higher than the boat price?',
				a: 'The total cost includes tax, fees and interest, as well as your down payment. A long loan can add thousands in interest.'
			},
			{
				q: 'How much down payment do I need for a boat?',
				a: 'It depends on the lender, the boat and your record. A larger down payment lowers the loan and the interest. Ask lenders about their minimums.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'Federal Trade Commission: Consumer advice', url: 'https://consumer.ftc.gov/' },
		],
		disclaimer:
			'Estimates only. Lenders set the actual rate, fees and terms. Boat ownership has costs beyond the loan.'
	}
});
