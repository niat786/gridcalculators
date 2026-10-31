import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './lease-calculator.meta';

const when = (id: string, value: string) => (v: InputValues) => v[id] === value;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'asset', label: 'Asset value', type: 'number', default: 25000, min: 0.01, max: 100_000_000, step: 500, prefix: '$', help: 'Price or value of the item at the start of the lease.' },
		{
			id: 'resMode',
			label: 'Residual value entered as',
			type: 'select',
			display: 'segmented',
			default: 'percent',
			options: [
				{ label: 'Percent of value', value: 'percent' },
				{ label: 'Amount', value: 'amount' }
			]
		},
		{
			id: 'resPct',
			label: 'Residual value',
			type: 'number',
			default: 45,
			min: 0,
			max: 100,
			step: 1,
			suffix: '%',
			help: 'Expected value at the end, as a share of the asset value.',
			visibleWhen: when('resMode', 'percent')
		},
		{
			id: 'resAmt',
			label: 'Residual value',
			type: 'number',
			default: 11250,
			min: 0,
			max: 100_000_000,
			step: 500,
			prefix: '$',
			help: 'Expected value at the end of the lease.',
			visibleWhen: when('resMode', 'amount')
		},
		{ id: 'term', label: 'Lease term', type: 'number', default: 36, min: 1, max: 120, step: 1, suffix: 'months', decimal: false },
		{
			id: 'rateType',
			label: 'Rate entered as',
			type: 'select',
			display: 'segmented',
			default: 'rate',
			options: [
				{ label: 'Interest rate', value: 'rate' },
				{ label: 'Money factor', value: 'factor' }
			]
		},
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate.', visibleWhen: when('rateType', 'rate') },
		{
			id: 'mf',
			label: 'Money factor',
			type: 'number',
			default: 0.0025,
			min: 0,
			max: 0.04,
			step: 0.0001,
			help: 'Common in vehicle leases. Annual rate = money factor × 2,400.',
			visibleWhen: when('rateType', 'factor')
		},
		{
			id: 'timing',
			label: 'Payment timing',
			type: 'select',
			display: 'segmented',
			default: 'advance',
			options: [
				{ label: 'Start (advance)', value: 'advance' },
				{ label: 'End (arrears)', value: 'arrears' }
			]
		}
	],
	calculate(v): CalculationResult {
		const asset = Number(v.asset);
		const n = Number(v.term);
		const annualPct = v.rateType === 'factor' ? Number(v.mf) * 2400 : Number(v.rate);
		const residual = v.resMode === 'amount' ? Number(v.resAmt) : (asset * Number(v.resPct)) / 100;
		const advance = v.timing === 'advance';
		const primaryLabel = 'Payment per month';

		if (
			!Number.isFinite(asset) || !(asset > 0) ||
			!Number.isFinite(residual) || residual < 0 || residual >= asset ||
			!Number.isInteger(n) || n < 1 || n > 120 ||
			!Number.isFinite(annualPct) || annualPct < 0 || annualPct > 100
		) {
			return {
				primaryResult: DASH,
				primaryLabel,
				summary: 'Enter an asset value, a residual value below the asset value, and a term of 1 to 120 months.'
			};
		}

		// Payment that repays the asset value down to the residual value.
		// Arrears: P = (A(1+r)ⁿ − R) × r ÷ ((1+r)ⁿ − 1). Advance: divide by (1 + r).
		const r = annualPct / 1200;
		let payment: number;
		if (r === 0) {
			payment = (asset - residual) / n;
		} else {
			const f = Math.pow(1 + r, n);
			payment = ((asset * f - residual) * r) / (f - 1);
			if (advance) payment /= 1 + r;
		}

		const total = payment * n;
		const depreciation = asset - residual;
		const impliedInterest = Math.max(0, total - depreciation);
		const moneyFactor = annualPct / 2400;

		return {
			primaryResult: money(payment),
			primaryLabel,
			summary: `Paid ${advance ? 'at the start' : 'at the end'} of each month. The residual value of ${money(residual, true)} is what the item is worth at the end.`,
			secondaryMetrics: [
				{ label: 'Total of payments', value: money(total) },
				{ label: 'Value used up (asset less residual)', value: money(depreciation) },
				{ label: 'Implied interest (rent charge)', value: money(impliedInterest) },
				{ label: 'Residual value at end', value: money(residual) },
				{ label: 'Annual interest rate', value: pct(annualPct, 3) },
				{ label: 'Money factor', value: num(moneyFactor, 6) }
			]
		};
	},
	content: {
		intro:
			'Use this lease calculator to find the regular payment on a lease for a car, equipment or other asset. Enter the asset value, the residual value, the term and the rate, and see what you pay.',
		howTo: [
			'Enter the value of the asset at the start of the lease.',
			'Enter the residual value as a percentage or as an amount.',
			'Enter the term in months, and the rate as an interest rate or a money factor.',
			'Choose if payments are made at the start or the end of each month, then read the payment.',
		],
		about: [
			{
				heading: 'What a lease payment covers',
				paragraphs: [
					'A lease lets you use an asset for a set time without buying it. Your payments cover two things. First, the value the asset loses during the lease. Second, the interest on the money tied up in it. For a vehicle, see the [auto lease calculator](/auto-lease-calculator).',
					'At the end, the asset is worth its **residual value**. You pay for the drop from the starting value to the residual, plus interest.',
				]
			},
			{
				heading: 'Payments at the start or the end of the month',
				paragraphs: [
					'In an **advance** lease, you pay at the start of each month. In an **arrears** lease, you pay at the end. Advance payments come earlier, so each one is a little smaller.',
					'For example, take a $25,000 asset with a 45% residual ($11,250) over 36 months at 6%. The payment is $472.19 in advance and $474.55 in arrears.',
				],
				table: {
					caption: 'A $25,000 asset, 45% residual, 36 months, 6% rate',
					columns: ['Payment timing', 'Monthly payment', 'Total of payments'],
					rows: [
						['Start of month (advance)', '$472.19', '$16,998.86'],
						['End of month (arrears)', '$474.55', '$17,083.86'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is the payment per month. Under it you see the total of payments, the value used up, and the implied interest. The implied interest is the part of your payments that is not paying for lost value.',
					'In the example, the value used up is $13,750. Total payments are $16,998.86, so the implied interest is $3,248.86. The tool also shows the money factor, which is the annual rate divided by 2,400.',
				]
			},
			{
				heading: 'Tips when comparing leases',
				paragraphs: [
					'These points make leases easier to compare:',
				],
				list: [
					'**Compare the total of payments.** Add up all payments and any fees, because the monthly figure alone can mislead.',
					'**Check the residual.** A higher residual makes the payment lower, but it can also mean a larger purchase price later.',
					'**Ask about end-of-lease costs.** Some leases charge for wear, extra use or early exit.',
					'**For cars, use the car tool.** The [auto lease calculator](/auto-lease-calculator) adds MSRP and sales tax, so it fits a dealer quote better.',
					'**Think about value loss.** The [depreciation calculator](/depreciation-calculator) shows how an asset’s value falls over time.',
				]
			},
			{
				heading: 'Leases in different countries',
				paragraphs: [
					'Lease rules, tax treatment and names differ by country. Equipment leasing, vehicle contract hire and finance leases all have their own terms. This tool is a simple payment model, so it does not cover taxes or local accounting rules. For a loan instead of a lease, try the [loan calculator](/loan-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not include fees, taxes, insurance, maintenance or end-of-lease charges. It also assumes a fixed rate and equal payments, so ask the lessor for a full quote that lists every charge.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment (payments in arrears)',
				expression: 'P = (A × (1 + r)ⁿ − R) × r ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'A', meaning: 'asset value at the start' },
					{ symbol: 'R', meaning: 'residual value at the end' },
					{ symbol: 'r', meaning: 'monthly rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments' }
				]
			},
			{
				title: 'Payments in advance',
				expression: 'P (advance) = P (arrears) ÷ (1 + r)',
				variables: [{ symbol: 'r', meaning: 'monthly rate, as above' }]
			},
			{
				title: 'Money factor',
				expression: 'Annual rate (%) = money factor × 2,400\nMonthly rate = money factor × 2',
				variables: [{ symbol: 'MF', meaning: 'money factor, as used in vehicle leases' }]
			},
			{
				title: 'Totals',
				expression: 'Total of payments = P × n\nImplied interest = Total of payments − (A − R)',
				variables: []
			}
		],
		example: {
			title: 'A $20,000 asset with an $8,000 residual, 36 months at 6%',
			steps: [
				'Monthly rate: r = 6 ÷ 12 ÷ 100 = 0.005',
				'Payments in arrears: (20,000 × 1.005³⁶ − 8,000) × 0.005 ÷ (1.005³⁶ − 1) ≈ $405.0632',
				'Payments in advance: 405.0632 ÷ 1.005 ≈ $403.0480',
				'Total of payments: 403.0480 × 36 ≈ $14,509.73',
				'Implied interest: 14,509.73 − (20,000 − 8,000) = $2,509.73'
			],
			result:
				'Advance payments of $403.05 a month. Total payments of $14,509.73, which includes $2,509.73 of implied interest.'
		},
		faq: [
			{
				q: 'How do I calculate a lease payment?',
				a: 'Find the payment that repays the asset value down to the residual value, with interest, over the term. The formula above does this. Enter your values and the calculator solves it.'
			},
			{
				q: 'What is a residual value?',
				a: 'It is the expected value of the asset at the end of the lease. The payment covers the drop from the starting value to the residual, plus interest.'
			},
			{
				q: 'What is the difference between advance and arrears payments?',
				a: 'Advance payments are made at the start of each month, and arrears payments at the end. Advance payments are slightly smaller, because you pay each one earlier.'
			},
			{
				q: 'What is a money factor?',
				a: 'It is a lease way of stating the interest rate. Multiply it by 2,400 to get the annual rate. For example, 0.0025 equals 6%.'
			},
			{
				q: 'Can I use this for a car lease?',
				a: 'Yes, if you know the asset value and the residual. For a full car lease with MSRP and sales tax, use the [auto lease calculator](/auto-lease-calculator).'
			},
		],
		sources: [
			{ title: 'Federal Reserve Board: Keys to vehicle leasing', url: 'https://www.federalreserve.gov/pubs/leasing/resource/introduction/what.htm' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. Your lease contract sets the real payment, fees and end-of-lease terms.'
	}
});
