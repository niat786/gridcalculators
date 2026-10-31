import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './irr-calculator.meta';

/** Net present value with the first flow at time 0 and each later row one period further on. */
export function npv(flows: number[], rate: number): number {
	let total = 0;
	for (let t = 0; t < flows.length; t++) total += flows[t] / Math.pow(1 + rate, t);
	return Math.abs(total) < 1e-9 ? 0 : total;
}

/** Internal rate of return per period by bisection. Returns null when NPV does not change sign. */
export function irr(flows: number[]): number | null {
	let lo = -0.99;
	let hi = 10;
	let fLo = npv(flows, lo);
	const fHi = npv(flows, hi);
	if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || (fLo > 0) === (fHi > 0)) return null;
	for (let i = 0; i < 300; i++) {
		const mid = (lo + hi) / 2;
		const fMid = npv(flows, mid);
		if (fMid === 0) return mid;
		if ((fMid > 0) === (fLo > 0)) {
			lo = mid;
			fLo = fMid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

/** Periods (counted by row, first row = 0) until the running total turns positive, or null. */
export function paybackPeriods(flows: number[]): number | null {
	let cumulative = flows[0];
	if (cumulative >= 0) return 0;
	for (let t = 1; t < flows.length; t++) {
		const next = cumulative + flows[t];
		if (next >= 0) return t - 1 + -cumulative / flows[t];
		cumulative = next;
	}
	return null;
}

const DEFAULT_ROWS: RowValue[] = [
	{ label: 'Year 0', amount: -10000 },
	{ label: 'Year 1', amount: 3000 },
	{ label: 'Year 2', amount: 4000 },
	{ label: 'Year 3', amount: 4000 },
	{ label: 'Year 4', amount: 3000 },
	{ label: 'Year 5', amount: 2000 }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'flows',
			label: 'Cash flows',
			type: 'rows',
			columns: [
				{ id: 'label', label: 'Period', type: 'text', default: '', placeholder: 'Label' },
				{ id: 'amount', label: 'Cash flow', type: 'number', default: 0, prefix: '$' }
			],
			default: DEFAULT_ROWS,
			minRows: 2,
			maxRows: 60,
			addLabel: 'Add period',
			help: 'Enter the first row as the investment, usually negative. Rows are equal time steps.'
		},
		{
			id: 'rate',
			label: 'Discount rate',
			type: 'number',
			default: 8,
			min: 0,
			max: 100,
			step: 0.1,
			suffix: '%',
			help: 'Per period. Used for NPV.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const rows = (v.flows as RowValue[]) ?? [];
		const rate = Number(v.rate);
		const labelOf = (row: RowValue, i: number) => String(row.label || `Row ${i + 1}`);
		const invalid = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Internal rate of return',
			summary
		});

		if (rows.length < 2) return invalid('Enter at least two cash flows: the investment and one return.');
		const flows: number[] = [];
		for (const row of rows) {
			const amount = Number(row.amount);
			if (!Number.isFinite(amount)) return invalid('Enter an amount for every cash flow.');
			flows.push(amount);
		}
		if (!(rate >= 0 && rate <= 100)) return invalid('Enter a discount rate between 0% and 100%.');
		if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) {
			return invalid(
				'IRR needs at least one negative and one positive cash flow. Enter the investment as a negative and the returns as positive.'
			);
		}

		const r = irr(flows);
		if (r === null) {
			return invalid('No IRR was found. The cash flows never cross zero between −99% and 1,000% per period.');
		}

		const npvAtRate = npv(flows, rate / 100);
		const payback = paybackPeriods(flows);
		const total = flows.reduce((s, f) => s + f, 0);

		let cumulative = 0;
		const table = {
			title: 'Cash flows, present value and running total',
			collapsed: true,
			columns: [
				{ key: 'period', label: 'Period' },
				{ key: 'flow', label: 'Cash flow', align: 'end' as const },
				{ key: 'pv', label: 'Present value', align: 'end' as const },
				{ key: 'running', label: 'Running total', align: 'end' as const }
			],
			rows: rows.map((row, t) => {
				const flow = flows[t];
				cumulative += flow;
				return {
					period: labelOf(row, t),
					flow: money(flow),
					pv: money(flow / Math.pow(1 + rate / 100, t)),
					running: money(cumulative)
				};
			})
		};

		const above = r * 100 > rate;
		return {
			primaryResult: pct(Math.abs(r) < 5e-7 ? 0 : r * 100, 2),
			primaryLabel: 'Internal rate of return (per period)',
			summary: above
				? `The return is above your ${pct(rate, 2)} discount rate, so NPV is positive at that rate.`
				: `The return is at or below your ${pct(rate, 2)} discount rate, so NPV is zero or negative at that rate.`,
			secondaryMetrics: [
				{ label: `NPV at ${pct(rate, 2)}`, value: money(npvAtRate) },
				{ label: 'Payback period', value: payback === null ? 'Not reached' : `${num(payback, 2, 2)} periods` },
				{ label: 'Net total of cash flows', value: money(total) },
				{ label: 'Cash flows entered', value: num(flows.length, 0) }
			],
			table
		};
	},
	content: {
		intro:
			'Use this IRR calculator to find the internal rate of return of a series of cash flows. It also shows the NPV at your own discount rate and the payback period.',
		howTo: [
			'Enter the first row as your investment. It is usually a negative number.',
			'Add one row for each later period with the cash you expect to receive. Rows must be equal time steps, such as years.',
			'Enter your discount rate, which is the return you require per period.',
			'Read the IRR, then check the NPV and the payback period.'
		],
		about: [
			{
				heading: 'What is the internal rate of return?',
				paragraphs: [
					'The internal rate of return (IRR) is the single rate of return that fits a whole series of cash flows. It is the discount rate at which the net present value (NPV) of all the flows is exactly zero.',
					'In plain terms, it answers this: what steady yearly return would turn my money out today into the money I get back later? It works when cash comes in at different times, unlike a simple [ROI](/roi-calculator).'
				]
			},
			{
				heading: 'How IRR is found',
				paragraphs: [
					'There is no direct formula for IRR when there are several flows. The calculator tries rates until the NPV reaches zero, using a repeated halving search between −99% and 1,000% per period.',
					'The answer is a rate per period. If your rows are years, it is a yearly rate. If your rows are months, it is a monthly rate, so you may want to convert it.'
				]
			},
			{
				heading: 'How to read the result',
				paragraphs: [
					'Compare the IRR with your discount rate, the minimum return you would accept. If the IRR is higher, the NPV at your rate is positive, and the project beats your target. If it is lower, it does not.',
					'The table below compares two projects that each cost $10,000, using an 8% discount rate.'
				],
				table: {
					caption: 'Two projects, each costing $10,000 up front',
					columns: ['Project', 'Cash back', 'IRR', 'NPV at 8%', 'Payback'],
					rows: [
						['A', '$3,000, $4,000, $4,000, $3,000, $2,000 over years 1 to 5', '19.25%', '$2,948.72', '2.75 years'],
						['B', '$16,000 in year 5', '9.86%', '$889.33', '4.63 years']
					]
				}
			},
			{
				heading: 'IRR and discount rate: how NPV changes',
				paragraphs: [
					'NPV falls as the discount rate rises. For project A, the NPV is $2,948.72 at 8%, $972.95 at 15% and −$1,107.84 at 25%. It crosses zero at the IRR of 19.25%.',
					'This is why IRR is also the break-even rate. If your required return is higher than the IRR, the project loses value on those terms.'
				]
			},
			{
				heading: 'Limits to keep in mind',
				paragraphs: ['IRR is useful, but it has weak spots:'],
				list: [
					'**It needs a negative and a positive flow.** Without both, there is no IRR.',
					'**Some flows have more than one IRR.** This can happen when signs switch more than once, such as a late clean-up cost.',
					'**It assumes you can reinvest at the IRR.** That can be unrealistic for a very high IRR.',
					'**It ignores size.** A small project can have a high IRR but add little money. Check the NPV too.',
					'**Returns are not guaranteed.** Cash flows are forecasts, and past returns do not predict future ones.'
				]
			},
			{
				heading: 'Related tools',
				paragraphs: [
					'To see how fast a project pays back, use the [payback period calculator](/payback-period-calculator). To discount a single future amount, use the [present value calculator](/present-value-calculator). For a simple start-and-end growth rate, try the [average return calculator](/average-return-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Net present value',
				expression: 'NPV = CF₀ + CF₁ ÷ (1 + r) + CF₂ ÷ (1 + r)² + … + CFₙ ÷ (1 + r)ⁿ',
				variables: [
					{ symbol: 'CFₜ', meaning: 'cash flow in period t (negative for money you pay, positive for money you receive)' },
					{ symbol: 'r', meaning: 'discount rate per period as a decimal' },
					{ symbol: 'n', meaning: 'last period' }
				]
			},
			{
				title: 'Internal rate of return',
				expression: 'Find r so that NPV = 0',
				variables: [{ symbol: 'r', meaning: 'the IRR, per period' }]
			}
		],
		example: {
			title: 'A $10,000 investment that returns cash over five years',
			steps: [
				'Cash flows: −$10,000, $3,000, $4,000, $4,000, $3,000, $2,000',
				'Solve NPV = 0 for r: IRR ≈ 19.25% per year',
				'NPV at 8%: −$10,000 + $3,000 ÷ 1.08 + $4,000 ÷ 1.08² + … ≈ $2,948.72',
				'Running total turns positive in year 3: 2 + 3,000 ÷ 4,000 = 2.75 years'
			],
			result:
				'The IRR is 19.25% a year, the NPV at 8% is $2,948.72, and the payback period is 2.75 years.'
		},
		faq: [
			{
				q: 'What is a good IRR?',
				a: 'It depends on your required return and the risk. A project is worth considering when its IRR is above your discount rate. A higher IRR is better only if you trust the cash flow forecasts.'
			},
			{
				q: 'What is the difference between IRR and NPV?',
				a: 'NPV is a money amount: the value created at your discount rate. IRR is a rate: the discount rate where NPV is zero. Use both, because IRR ignores the size of the project.'
			},
			{
				q: 'What is the difference between IRR and ROI?',
				a: 'ROI is the total gain divided by the cost, and ignores timing. IRR takes timing into account, so it suits cash flows spread over several periods.'
			},
			{
				q: 'Why does the calculator say there is no IRR?',
				a: 'IRR needs at least one negative and one positive cash flow. If every flow has the same sign, no rate can bring NPV to zero.'
			},
			{
				q: 'Is the IRR a yearly rate?',
				a: 'It is a rate per period. If each row is a year, it is yearly. For monthly rows, the result is monthly, so convert it before comparing with yearly rates.'
			},
			{
				q: 'Can IRR be negative?',
				a: 'Yes. If you get back less than you put in, the IRR is below zero. It means the money lost value over the period.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' },
			{ title: 'Investor.gov (U.S. SEC) — Interest rate', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/interest-rate' }
		],
		disclaimer:
			'Estimates only. Cash flows are forecasts, investment returns are not guaranteed, and past returns do not predict future ones. This tool is not financial advice.'
	}
});
