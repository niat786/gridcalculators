import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './payback-period-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;

const DEFAULT_FLOWS: RowValue[] = [
	{ label: 'Year 1', amount: 6000 },
	{ label: 'Year 2', amount: 9000 },
	{ label: 'Year 3', amount: 12000 },
	{ label: 'Year 4', amount: 15000 },
	{ label: 'Year 5', amount: 18000 },
	{ label: 'Year 6', amount: 20000 }
];

/**
 * Years until the running total of flows covers the investment, interpolated inside the year.
 * `flows[t]` is the cash inflow in year t + 1. Returns null when it is never reached.
 */
export function paybackYears(investment: number, flows: number[]): number | null {
	let cumulative = 0;
	for (let t = 0; t < flows.length; t++) {
		const cf = flows[t];
		if (cf > 0 && cumulative + cf >= investment) return t + (investment - cumulative) / cf;
		cumulative += cf;
	}
	return null;
}

const years = (x: number) => `${num(x, 2, 2)} years`;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Cash inflows',
			type: 'select',
			display: 'segmented',
			default: 'even',
			options: [
				{ label: 'Even each year', value: 'even' },
				{ label: 'Uneven each year', value: 'uneven' }
			]
		},
		{ id: 'investment', label: 'Initial investment', type: 'number', default: 50000, min: 0.01, max: 100_000_000, step: 500, prefix: '$' },
		{
			id: 'rate',
			label: 'Discount rate',
			type: 'number',
			default: 10,
			min: 0,
			max: 100,
			step: 0.1,
			suffix: '%',
			help: 'Yearly rate, used for discounted payback and NPV.'
		},
		{
			id: 'inflow',
			label: 'Yearly cash inflow',
			type: 'number',
			default: 15000,
			min: 0.01,
			max: 100_000_000,
			step: 500,
			prefix: '$',
			visibleWhen: mode('even')
		},
		{
			id: 'years',
			label: 'Years of cash inflow',
			type: 'number',
			default: 10,
			min: 1,
			max: 50,
			step: 1,
			suffix: 'years',
			decimal: false,
			visibleWhen: mode('even')
		},
		{
			id: 'flows',
			label: 'Yearly cash inflows',
			type: 'rows',
			columns: [
				{ id: 'label', label: 'Year', type: 'text', default: '', placeholder: 'Label' },
				{ id: 'amount', label: 'Cash inflow', type: 'number', default: 0, min: 0, prefix: '$' }
			],
			default: DEFAULT_FLOWS,
			minRows: 1,
			maxRows: 60,
			addLabel: 'Add year',
			help: 'One row per year, in order. Enter inflows as positive numbers.',
			visibleWhen: mode('uneven')
		}
	],
	calculate(v): CalculationResult {
		const investment = Number(v.investment);
		const rate = Number(v.rate);
		const primaryLabel = 'Simple payback period';
		const invalid = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel, summary });

		if (!Number.isFinite(investment) || !(investment > 0)) return invalid('Enter an initial investment above zero.');
		if (!(rate >= 0 && rate <= 100)) return invalid('Enter a discount rate between 0% and 100%.');

		let flows: number[];
		let simple: number | null;
		if (v.mode === 'uneven') {
			const rows = (v.flows as RowValue[]) ?? [];
			if (rows.length < 1) return invalid('Enter at least one yearly cash inflow.');
			flows = [];
			for (const row of rows) {
				const amount = Number(row.amount);
				if (!Number.isFinite(amount) || amount < 0) return invalid('Enter a cash inflow of zero or more for every year.');
				flows.push(amount);
			}
			simple = paybackYears(investment, flows);
		} else {
			const inflow = Number(v.inflow);
			const n = Number(v.years);
			if (!Number.isFinite(inflow) || !(inflow > 0)) return invalid('Enter a yearly cash inflow above zero.');
			if (!Number.isInteger(n) || n < 1 || n > 50) return invalid('Enter a whole number of years from 1 to 50.');
			flows = Array.from({ length: n }, () => inflow);
			simple = investment / inflow <= n + 1e-9 ? investment / inflow : null; // not reached within the years of inflow
		}

		const d = rate / 100;
		const discounted = flows.map((cf, t) => cf / Math.pow(1 + d, t + 1));
		const discountedPayback = paybackYears(investment, discounted);
		const pvTotal = discounted.reduce((s, x) => s + x, 0);
		const npv = pvTotal - investment;
		const totalInflows = flows.reduce((s, x) => s + x, 0);

		let cumulative = 0;
		let cumulativePv = 0;
		const table = {
			title: 'Year by year',
			collapsed: true,
			columns: [
				{ key: 'year', label: 'Year' },
				{ key: 'inflow', label: 'Inflow', align: 'end' as const },
				{ key: 'running', label: 'Running total', align: 'end' as const },
				{ key: 'pv', label: 'Present value', align: 'end' as const },
				{ key: 'pvRunning', label: 'Running PV', align: 'end' as const }
			],
			rows: flows.map((cf, t) => {
				cumulative += cf;
				cumulativePv += discounted[t];
				return {
					year: `Year ${num(t + 1, 0)}`,
					inflow: money(cf),
					running: money(cumulative),
					pv: money(discounted[t]),
					pvRunning: money(cumulativePv)
				};
			})
		};

		const discText = discountedPayback === null ? 'Not reached' : years(discountedPayback);
		return {
			primaryResult: simple === null ? 'Not reached' : years(simple),
			primaryLabel,
			summary:
				discountedPayback === null
					? `At ${pct(rate, 2)} a year, the investment is not paid back within the cash inflows you entered.`
					: `At ${pct(rate, 2)} a year, the discounted payback is ${years(discountedPayback)}.`,
			secondaryMetrics: [
				{ label: 'Discounted payback period', value: discText },
				{ label: `Net present value at ${pct(rate, 2)}`, value: money(npv) },
				{ label: 'Total cash inflows', value: money(totalInflows) },
				{ label: 'Net profit (inflows less investment)', value: money(totalInflows - investment) }
			],
			table
		};
	},
	content: {
		intro:
			'Use this payback period calculator to find how long an investment takes to earn back its cost. It shows the simple payback period and the discounted payback period, plus the net present value (NPV).',
		howTo: [
			'Enter the initial investment, which is the amount you pay at the start.',
			'Choose even or uneven cash inflows. For even inflows, enter one yearly amount and the number of years. For uneven inflows, enter each year in turn.',
			'Enter your discount rate, the yearly return you require. It is used for the discounted payback and the NPV.',
			'Read the simple and discounted payback periods, then check the NPV.'
		],
		about: [
			{
				heading: 'What is the payback period?',
				paragraphs: [
					'The payback period is the time it takes for the cash an investment brings in to equal what you paid for it. A machine that costs $50,000 and saves $15,000 a year pays for itself in a little over three years.',
					'It is popular because it is easy to understand. For example, business owners use it for equipment, solar panels, renovations and new projects. So the shorter the payback, the sooner you are back to break-even.'
				]
			},
			{
				heading: 'Simple and discounted payback',
				paragraphs: [
					'Simple payback adds up the cash inflows year by year until the total reaches the investment. However, if the payback falls part-way through a year, the calculator estimates the fraction of that year.',
					'Discounted payback does the same, but first reduces each future inflow by your discount rate. Cash received later is worth less than cash today, so with a rate above zero the discounted payback is longer. As a result, it is the more cautious measure.'
				]
			},
			{
				heading: 'How the discount rate changes the result',
				paragraphs: [
					'The simple payback does not change with the rate, but the discounted payback and the NPV do. The table below uses a $50,000 investment that returns $15,000 a year for 10 years.'
				],
				table: {
					caption: '$50,000 investment, $15,000 a year for 10 years',
					columns: ['Discount rate', 'Simple payback', 'Discounted payback', 'NPV'],
					rows: [
						['0%', '3.33 years', '3.33 years', '$100,000.00'],
						['5%', '3.33 years', '3.74 years', '$65,826.02'],
						['10%', '3.33 years', '4.26 years', '$42,168.51'],
						['15%', '3.33 years', '4.96 years', '$25,281.53'],
						['25%', '3.33 years', '8.03 years', '$3,557.55']
					]
				}
			},
			{
				heading: 'Uneven cash flows',
				paragraphs: [
					'Many projects start slowly and then grow. The default uneven example puts $50,000 in and receives $6,000, $9,000, $12,000, $15,000, $18,000 and $20,000 in years 1 to 6. The simple payback is 4.44 years. The discounted payback at 10% is 5.59 years, and the NPV is $4,619.60.'
				]
			},
			{
				heading: 'Limits of payback period',
				paragraphs: ['Payback is a quick test, but it does not tell the whole story:'],
				list: [
					'**It ignores what happens after payback.** A project with a long life can look the same as a short one.',
					'**Simple payback ignores timing.** Use the discounted version, or check NPV, to allow for the value of time.',
					'**It relies on forecasts.** Real cash flows can be lower than planned, and returns are not guaranteed.',
					'**It is not a rate of return.** For that, use the [IRR calculator](/irr-calculator) or the [ROI calculator](/roi-calculator).',
					'**It does not show how the asset loses value.** The [depreciation calculator](/depreciation-calculator) covers that.'
				]
			}
		],
		formulas: [
			{
				title: 'Simple payback with even inflows',
				expression: 'Payback = Investment ÷ Yearly inflow',
				variables: [
					{ symbol: 'Investment', meaning: 'the amount paid at the start' },
					{ symbol: 'Yearly inflow', meaning: 'cash received each year' }
				]
			},
			{
				title: 'Discounted inflow and NPV',
				expression: 'PV of year t = Inflow ÷ (1 + r)ᵗ;  NPV = sum of all PV − Investment',
				variables: [
					{ symbol: 'r', meaning: 'discount rate per year as a decimal (10% is 0.10)' },
					{ symbol: 't', meaning: 'the year number' }
				]
			}
		],
		example: {
			title: 'A $50,000 investment that returns $15,000 a year for 10 years at 10%',
			steps: [
				'Simple payback: 50,000 ÷ 15,000 = 3.33 years',
				'Present value of each year: 15,000 ÷ 1.10ᵗ, so the discounted amounts add up to $92,168.51 over 10 years',
				'Discounted payback: the running PV reaches $50,000 during year 5, at 4.26 years',
				'NPV: −50,000 + 92,168.51 = $42,168.51'
			],
			result:
				'Simple payback of 3.33 years and discounted payback of 4.26 years. NPV at 10% is $42,168.51.'
		},
		faq: [
			{
				q: 'How do you calculate the payback period?',
				a: 'With even inflows, divide the investment by the yearly inflow. With uneven inflows, add them year by year until the total equals the investment, and estimate the fraction of the last year.'
			},
			{
				q: 'What is a good payback period?',
				a: 'It depends on the project and the business. Many people prefer shorter paybacks because they carry less risk. Compare it with your own limit and with other options.'
			},
			{
				q: 'What is the difference between simple and discounted payback?',
				a: 'Simple payback ignores the time value of money. Discounted payback reduces each future inflow by your discount rate first, so it takes longer and is more cautious.'
			},
			{
				q: 'What is NPV?',
				a: 'Net present value is the total of all discounted inflows minus the investment. A positive NPV means the project earns more than your discount rate.'
			},
			{
				q: 'What does “Not reached” mean?',
				a: 'The cash inflows you entered never add up to the investment, so the investment is not paid back in that time. Add more years or raise the inflows.'
			},
			{
				q: 'Should I use payback to decide on an investment?',
				a: 'Use it as one input, not the only one. It is a quick check for liquidity and risk. Combine it with NPV and IRR, and with your own judgement.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Cash flows are forecasts and investment returns are not guaranteed. This tool is not financial advice.'
	}
});
