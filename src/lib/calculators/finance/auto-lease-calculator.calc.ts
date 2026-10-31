import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './auto-lease-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'msrp', label: 'MSRP', type: 'number', default: 40000, min: 1, max: 100_000_000, step: 100, prefix: '$', help: 'Manufacturer’s suggested retail price' },
		{ id: 'price', label: 'Negotiated price', type: 'number', default: 36000, min: 1, max: 100_000_000, step: 100, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 2000, min: 0, max: 100_000_000, step: 100, prefix: '$', help: 'Capitalized cost reduction' },
		{ id: 'tradeIn', label: 'Trade-in value', type: 'number', default: 0, min: 0, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'residualPct',
			label: 'Residual value',
			type: 'number',
			default: 60,
			min: 0,
			max: 100,
			step: 0.1,
			suffix: '%',
			help: 'Share of MSRP the car is expected to be worth at lease end'
		},
		{ id: 'months', label: 'Lease term (months)', type: 'number', default: 36, min: 1, max: 120, step: 1, suffix: 'months', decimal: false },
		{
			id: 'moneyMode',
			label: 'Finance rate',
			type: 'select',
			display: 'segmented',
			default: 'mf',
			options: [
				{ label: 'Money factor', value: 'mf' },
				{ label: 'APR', value: 'apr' }
			]
		},
		{
			id: 'moneyFactor',
			label: 'Money factor',
			type: 'number',
			default: 0.00125,
			min: 0,
			max: 0.1,
			step: 0.00001,
			help: 'Multiply by 2,400 to get the APR',
			visibleWhen: (v) => v.moneyMode !== 'apr'
		},
		{
			id: 'aprRate',
			label: 'APR',
			type: 'number',
			default: 3,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'Divide by 2,400 to get the money factor',
			visibleWhen: (v) => v.moneyMode === 'apr'
		},
		{ id: 'tax', label: 'Sales tax', type: 'number', default: 7, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Applied to the monthly charge' }
	],
	calculate(v): CalculationResult {
		const msrp = Number(v.msrp);
		const price = Number(v.price);
		const down = Number(v.down);
		const tradeIn = Number(v.tradeIn);
		const residualPct = Number(v.residualPct);
		const months = Number(v.months);
		const taxPct = Number(v.tax);
		const useApr = String(v.moneyMode) === 'apr';
		const moneyFactor = useApr ? Number(v.aprRate) / 2400 : Number(v.moneyFactor);
		const aprOk = Number(v.aprRate) >= 0 && Number(v.aprRate) <= 100;

		const cap = price - down - tradeIn;
		const inputsOk =
			msrp > 0 &&
			Number.isFinite(msrp) &&
			price > 0 &&
			down >= 0 &&
			tradeIn >= 0 &&
			cap > 0 &&
			residualPct >= 0 &&
			residualPct <= 100 &&
			Number.isInteger(months) &&
			months >= 1 &&
			months <= 120 &&
			taxPct >= 0 &&
			taxPct <= 30 &&
			(useApr ? aprOk : moneyFactor >= 0 && moneyFactor <= 0.1);
		if (!inputsOk) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Check the prices (the down payment and trade-in must be less than the negotiated price), the residual, the term and the finance rate.'
			};
		}

		const residual = msrp * (residualPct / 100);
		const depreciation = (cap - residual) / months;
		const financeFee = (cap + residual) * moneyFactor;
		const subtotal = depreciation + financeFee;
		const salesTax = subtotal * (taxPct / 100);
		const monthly = subtotal + salesTax;

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `Depreciation ${money(depreciation)} plus finance ${money(financeFee)} plus tax ${money(salesTax)} a month, over ${plural(months, 'month')}.`,
			secondaryMetrics: [
				{ label: 'Adjusted cap cost', value: money(cap) },
				{ label: 'Residual value', value: money(residual) },
				{ label: 'Depreciation fee', value: money(depreciation) },
				{ label: 'Finance fee', value: money(financeFee) },
				{ label: 'Sales tax per month', value: money(salesTax) },
				{ label: 'Total of payments', value: money(monthly * months) }
			]
		};
	},
	content: {
		intro:
			'Use this auto lease calculator to estimate the monthly payment on a car lease. Enter the price, the residual value and the money factor, and see how depreciation, finance charge and tax make up the payment.',
		howTo: [
			'Enter the MSRP and the negotiated price of the car.',
			'Enter your down payment, any trade-in, the residual value and the lease term.',
			'Enter the finance rate as a money factor or as an APR.',
			'Add the sales tax rate and read your monthly payment.',
		],
		about: [
			{
				heading: 'How a car lease payment is built',
				paragraphs: [
					'In a lease, you pay for the part of the car’s value that you use, not the whole car. For this reason, your payment has three parts. The **depreciation fee** covers the drop in value over the lease. The **finance fee** is the interest-like charge. The **sales tax** is added on top in many places.',
					'Three numbers matter most: the capitalised cost (the negotiated price minus your down payment and trade-in), the residual value and the money factor.',
				]
			},
			{
				heading: 'Residual value and money factor',
				paragraphs: [
					'The **residual value** is what the car is expected to be worth at the end. It is usually set as a share of the MSRP. A higher residual means less depreciation to pay for, so the payment is lower.',
					'The **money factor** is the lease way of showing the interest rate. Multiply it by 2,400 to get an APR. For example, a money factor of 0.00125 equals an APR of 3%.',
				]
			},
			{
				heading: 'A worked example and what moves the payment',
				paragraphs: [
					'Take a car with a $40,000 MSRP and a $36,000 price. With $2,000 down, the cap cost is $34,000. A 60% residual is $24,000. Over 36 months, the payment is $374.80.',
					'Small changes matter. For example, if the residual is 55% instead of 60%, the payment rises to $431.57. A longer lease also spreads the depreciation out, as the table shows.',
				],
				table: {
					caption: 'A $40,000 MSRP car, $36,000 price, $2,000 down, 60% residual, 0.00125 money factor, 7% tax',
					columns: ['Lease term', 'Monthly payment', 'Total of payments'],
					rows: [
						['36 months', '$374.80', '$13,492.70'],
						['48 months', '$300.49', '$14,423.60'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is the monthly payment, tax included. The breakdown shows the cap cost, the residual value, the depreciation fee, the finance fee and the monthly tax. The last line is the total of all payments.',
					'Remember that the down payment is paid on top of that total. In the default case, the $2,000 down payment plus $13,492.70 in payments comes to $15,492.70 over 36 months.',
				]
			},
			{
				heading: 'Tips for a better lease',
				paragraphs: [
					'First, a few steps can lower the cost:',
				],
				list: [
					'**Negotiate the price.** The capitalised cost is the biggest lever. Treat it like a purchase price.',
					'**Ask for the money factor.** Dealers don’t always show it, but you can convert any APR with the formula above.',
					'**Check the mileage limit.** Extra miles are charged at the end, so pick a limit that fits how you drive.',
					'**Compare with buying.** The [auto loan calculator](/auto-loan-calculator) shows what the same car costs on a loan.',
					'**Check any rebate deal.** The [cash back or low interest calculator](/cash-back-or-low-interest-calculator) helps compare offers.',
				]
			},
			{
				heading: 'Leasing in different countries',
				paragraphs: [
					'Leases are called different things around the world. In the UK, a common form is personal contract hire (PCH). Sales tax on leases varies, too, because some places tax each payment and others tax the price up front.',
					'For leases of other items, see the [lease calculator](/lease-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not include the acquisition fee, the disposition fee, registration, mileage charges or insurance. It also applies tax to the monthly charge, but local rules differ. So ask your dealer for a written quote that lists all fees.',
				]
			}
		],
		formulas: [
			{
				title: 'Adjusted cap cost',
				expression: 'Cap = negotiated price − down payment − trade-in',
				variables: []
			},
			{
				title: 'Residual value',
				expression: 'Residual = MSRP × residual % ÷ 100',
				variables: []
			},
			{
				title: 'Monthly payment',
				expression: 'Payment = [(Cap − Residual) ÷ n + (Cap + Residual) × MF] × (1 + tax ÷ 100)',
				variables: [
					{ symbol: 'n', meaning: 'lease term in months' },
					{ symbol: 'MF', meaning: 'money factor. APR = MF × 2,400, so MF = APR ÷ 2,400' },
					{ symbol: 'tax', meaning: 'sales tax rate, applied to the monthly charge' }
				]
			}
		],
		example: {
			title: 'A $40,000 MSRP car at $36,000 over 36 months',
			steps: [
				'Cap cost: 36,000 − 2,000 down − 0 trade-in = $34,000',
				'Residual: 60% of $40,000 = $24,000',
				'Depreciation fee: (34,000 − 24,000) ÷ 36 = $277.78',
				'Finance fee: (34,000 + 24,000) × 0.00125 = $72.50',
				'Sales tax: (277.78 + 72.50) × 7% = $24.52',
				'Monthly payment: 277.78 + 72.50 + 24.52 = $374.80'
			],
			result: 'Monthly payment of $374.80, made up of $277.78 depreciation, $72.50 finance and $24.52 tax.'
		},
		faq: [
			{
				q: 'How is a car lease payment calculated?',
				a: 'Add the depreciation fee and the finance fee, then add sales tax. Depreciation is the cap cost minus the residual, divided by the months. Finance is the cap cost plus the residual, times the money factor.'
			},
			{
				q: 'What is a money factor?',
				a: 'It is the lease version of an interest rate. Multiply it by 2,400 to get the APR. A money factor of 0.00125 equals 3% APR.'
			},
			{
				q: 'What is a residual value?',
				a: 'It is the car’s expected value at the end of the lease. A higher residual lowers your monthly payment, because you pay for less depreciation.'
			},
			{
				q: 'Is it better to lease or buy?',
				a: 'It depends on how long you keep the car, how far you drive and your budget. Leasing usually has lower monthly payments, but you own nothing at the end. Compare both with the [auto loan calculator](/auto-loan-calculator).'
			},
			{
				q: 'Does a bigger down payment lower a lease payment?',
				a: 'Yes, because it lowers the cap cost. But if the car is lost or stolen early, that cash may not come back, so many people keep the down payment small.'
			},
		],
		sources: [
			{ title: 'Federal Reserve Board: Keys to vehicle leasing', url: 'https://www.federalreserve.gov/pubs/leasing/resource/introduction/what.htm' },
			{ title: 'Federal Trade Commission: Consumer advice', url: 'https://consumer.ftc.gov/' },
		],
		disclaimer:
			'Estimates only. Your lease contract sets the real payment, fees and mileage terms. Get a written quote before you sign.'
	}
});
