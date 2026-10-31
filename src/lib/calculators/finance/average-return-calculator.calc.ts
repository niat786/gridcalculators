import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, money, num, pct, plural } from '../format';
import meta from './average-return-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;

const DEFAULT_RETURNS: RowValue[] = [
	{ label: 'Year 1', ret: 25 },
	{ label: 'Year 2', ret: -10 },
	{ label: 'Year 3', ret: 15 },
	{ label: 'Year 4', ret: 8 },
	{ label: 'Year 5', ret: -5 },
	{ label: 'Year 6', ret: 20 },
	{ label: 'Year 7', ret: 12 },
	{ label: 'Year 8', ret: 6 }
];

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Annualized return', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calculate from',
			type: 'select',
			display: 'segmented',
			default: 'edges',
			options: [
				{ label: 'Start and end value', value: 'edges' },
				{ label: 'Yearly returns', value: 'yearly' }
			]
		},
		{ id: 'start', label: 'Starting amount', type: 'number', default: 10000, min: 0.01, max: 1_000_000_000, step: 100, prefix: '$' },
		{
			id: 'end',
			label: 'Ending amount',
			type: 'number',
			default: 25000,
			min: 0,
			max: 1_000_000_000,
			step: 100,
			prefix: '$',
			visibleWhen: mode('edges')
		},
		{
			id: 'years',
			label: 'Number of years',
			type: 'number',
			default: 10,
			min: 0.1,
			max: 100,
			step: 1,
			suffix: 'years',
			help: 'Decimals are fine, such as 2.5.',
			visibleWhen: mode('edges')
		},
		{
			id: 'returns',
			label: 'Yearly returns',
			type: 'rows',
			columns: [
				{ id: 'label', label: 'Year', type: 'text', default: '', placeholder: 'Label' },
				{ id: 'ret', label: 'Return', type: 'number', default: 0, min: -99.99, max: 1000, suffix: '%' }
			],
			default: DEFAULT_RETURNS,
			minRows: 1,
			maxRows: 100,
			addLabel: 'Add year',
			help: 'Enter each year as a percentage. Use a minus sign for a loss.',
			visibleWhen: mode('yearly')
		}
	],
	calculate(v): CalculationResult {
		const start = Number(v.start);
		if (!Number.isFinite(start) || !(start > 0)) return invalid('Enter a starting amount above zero.');

		if (v.mode === 'yearly') {
			const rows = (v.returns as RowValue[]) ?? [];
			if (rows.length < 1) return invalid('Enter at least one yearly return.');
			const rets: number[] = [];
			for (const row of rows) {
				const r = Number(row.ret);
				if (!Number.isFinite(r) || r <= -100) return invalid('Enter a return for every year, above −100%.');
				rets.push(r);
			}
			const n = rets.length;
			const arithmetic = rets.reduce((s, r) => s + r, 0) / n;
			const growth = rets.reduce((g, r) => g * (1 + r / 100), 1);
			const annualized = (Math.pow(growth, 1 / n) - 1) * 100;
			const endAmount = start * growth;
			const gap = Math.abs(arithmetic - annualized) < 1e-9 ? 0 : arithmetic - annualized;
			let value = start;
			const table = {
				title: 'Value at the end of each year',
				collapsed: false,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'ret', label: 'Return', align: 'end' as const },
					{ key: 'value', label: 'Value', align: 'end' as const }
				],
				rows: rets.map((r, i) => {
					value *= 1 + r / 100;
					return { year: String(rows[i].label || `Year ${i + 1}`), ret: pct(r, 2), value: money(value) };
				})
			};
			return {
				primaryResult: pct(annualized, 2),
				primaryLabel: 'Annualized return (geometric mean)',
				summary:
					Math.abs(arithmetic - annualized) < 0.005
						? `The simple average and the annualized return are both ${pct(annualized, 2)} a year, because every year’s return was the same.`
						: `The simple average is ${pct(arithmetic, 2)}, but your money ${annualized < 0 ? 'shrank' : 'grew'} at ${pct(Math.abs(annualized), 2)} a year. The simple average overstates the real growth.`,
				secondaryMetrics: [
					{ label: 'Arithmetic mean (simple average)', value: pct(arithmetic, 2) },
					{ label: 'Overstatement from averaging', value: `${num(gap, 2)} points` },
					{ label: 'Total return', value: pct((growth - 1) * 100, 2) },
					{ label: 'Ending amount', value: money(endAmount) },
					{ label: 'Years', value: plural(n, 'year') }
				],
				table
			};
		}

		const end = Number(v.end);
		const years = Number(v.years);
		if (!Number.isFinite(end) || end < 0) return invalid('Enter an ending amount of zero or more.');
		if (!Number.isFinite(years) || !(years > 0 && years <= 100)) return invalid('Enter a number of years above zero, up to 100.');

		const ratio = end / start;
		const cagr = (Math.pow(ratio, 1 / years) - 1) * 100;
		const total = (ratio - 1) * 100;
		const word = end >= start ? 'grew' : 'fell';
		return {
			primaryResult: pct(cagr, 2),
			primaryLabel: 'Annualized return (CAGR)',
			summary: `Your money ${word} ${pct(Math.abs(total), 2)} in total, which is ${pct(cagr, 2)} a year on average.`,
			secondaryMetrics: [
				{ label: 'Total return', value: pct(total, 2) },
				{ label: 'Total gain', value: money(end - start) },
				{ label: 'Growth multiple', value: `${num(ratio, 3)}×` },
				{ label: 'Ending amount', value: money(end) },
				{ label: 'Years', value: `${num(years, 2)} years` }
			]
		};
	},
	content: {
		intro:
			'Use this average return calculator to find the yearly rate at which an investment grew. Enter a start and end value, or a list of yearly returns, and see the annualized return next to the simple average.',
		howTo: [
			'Choose how to calculate: from a start and end value, or from a list of yearly returns.',
			'For start and end value, enter the starting amount, the ending amount and the number of years.',
			'For yearly returns, enter each year’s return as a percentage. Use a minus sign for a loss.',
			'Read the annualized return, then compare it with the simple average and the total return.'
		],
		about: [
			{
				heading: 'What is an average return?',
				paragraphs: [
					'An average return tells you how much an investment gained each year, on average. There are two common ways to work it out, and they give different answers when returns go up and down.',
					'The first is the arithmetic mean, which is the simple average. The second is the annualized return, also called the geometric mean or CAGR (compound annual growth rate). The annualized return is the one that matches what happened to your money.'
				]
			},
			{
				heading: 'Why the simple average can mislead',
				paragraphs: [
					'Gains and losses do not cancel out evenly. Suppose you gain 50% in year one and then lose 50% in year two. The simple average is 0%, but you ended with $7,500 from $10,000. That is a 25% loss in total, or about −13.4% a year.',
					'The reason is that a loss is taken from a bigger balance after a gain. The more your returns swing, the bigger the gap between the two averages. If every year has the same return, the two are equal.'
				]
			},
			{
				heading: 'How the annualized return is calculated',
				paragraphs: [
					'With a start and an end value, divide the end by the start, raise it to the power of one over the number of years, and subtract 1. With yearly returns, multiply the growth factors of every year first, then take the same root.',
					'The formulas below show both. For regular monthly investing, a single start and end value is not enough, so use the [IRR calculator](/irr-calculator) instead.'
				]
			},
			{
				heading: 'Examples of annualized returns',
				paragraphs: [
					'Time matters when you read a total gain. The same total return means very different yearly returns over different periods. All rows below start from $10,000.'
				],
				table: {
					caption: 'Start $10,000',
					columns: ['End value', 'Years', 'Total return', 'Annualized return'],
					rows: [
						['$15,000', '5', '50%', '8.45%'],
						['$20,000', '7', '100%', '10.41%'],
						['$25,000', '10', '150%', '9.6%'],
						['$8,000', '3', '−20%', '−7.17%']
					]
				}
			},
			{
				heading: 'Tips for reading a return',
				paragraphs: ['A single number cannot describe an investment. Keep these points in mind:'],
				list: [
					'**Returns are not guaranteed.** Past returns do not predict future ones.',
					'**Check the period.** A short period can look very good or very bad. Longer records say more.',
					'**Include costs.** Fees and tax lower the return you keep. See the effect of fund costs in the [mutual fund calculator](/mutual-fund-calculator).',
					'**Compare in real terms.** Adjust for rising prices with the [inflation calculator](/inflation-calculator).',
					'**For one deal, use ROI.** The [ROI calculator](/roi-calculator) gives the total return on a single purchase.'
				]
			}
		],
		formulas: [
			{
				title: 'Annualized return from start and end value (CAGR)',
				expression: 'CAGR = (End ÷ Start)^(1 ÷ n) − 1',
				variables: [
					{ symbol: 'End', meaning: 'ending amount' },
					{ symbol: 'Start', meaning: 'starting amount' },
					{ symbol: 'n', meaning: 'number of years' }
				]
			},
			{
				title: 'Annualized return from yearly returns',
				expression: 'Annualized = ((1 + r₁) × (1 + r₂) × … × (1 + rₙ))^(1 ÷ n) − 1',
				variables: [
					{ symbol: 'r₁ … rₙ', meaning: 'return for each year, as a decimal (8% is 0.08)' },
					{ symbol: 'n', meaning: 'number of years' }
				]
			},
			{
				title: 'Simple average',
				expression: 'Mean = (r₁ + r₂ + … + rₙ) ÷ n',
				variables: [{ symbol: 'Mean', meaning: 'arithmetic mean of the yearly returns' }]
			}
		],
		example: {
			title: 'Eight years of yearly returns on 10,000',
			steps: [
				'Growth factors: 1.25 × 0.90 × 1.15 × 1.08 × 0.95 × 1.20 × 1.12 × 1.06 ≈ 1.891049',
				'Arithmetic mean: (25 − 10 + 15 + 8 − 5 + 20 + 12 + 6) ÷ 8 = 71 ÷ 8 = 8.88%',
				'Annualized return: 1.891049^(1 ÷ 8) − 1 ≈ 8.29%',
				'Ending amount: 10,000 × 1.891049 = $18,910.49'
			],
			result:
				'The arithmetic mean is 8.88%, but the annualized return is 8.29%. The 10,000 grows to $18,910.49.'
		},
		faq: [
			{
				q: 'How do I calculate average return?',
				a: 'For the simple average, add the yearly returns and divide by the number of years. For the annualized return, divide the end value by the start value, take the root for the number of years, and subtract 1.'
			},
			{
				q: 'What is the difference between arithmetic and geometric average return?',
				a: 'The arithmetic average adds the returns and divides. The geometric average (annualized return) allows for compounding. When returns vary, the geometric average is lower and matches your real growth.'
			},
			{
				q: 'What is CAGR?',
				a: 'CAGR means compound annual growth rate. It is the steady yearly rate that would take you from the start value to the end value over the same time.'
			},
			{
				q: 'Can I use this if I added money along the way?',
				a: 'Not accurately. Deposits and withdrawals change the result. For cash flows at different times, use an IRR calculator.'
			},
			{
				q: 'Why is my annualized return lower than my average?',
				a: 'Because losses hurt more than equal gains help. A 50% loss needs a 100% gain to recover. The more volatile your returns, the bigger the gap.'
			},
			{
				q: 'Does a high past return mean a high future return?',
				a: 'No. Past returns do not predict future ones. Treat an average return as a record of what happened, not a promise.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. This tool ignores fees, tax and inflation and is not financial advice.'
	}
});
