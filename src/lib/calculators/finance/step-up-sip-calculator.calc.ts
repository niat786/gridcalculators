import { defineCalculator, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './step-up-sip-calculator.meta';

interface YearEnd {
	/** Monthly contribution in the last month of the year. */
	monthly: number;
	/** Total paid in up to the end of the year (unrounded). */
	invested: number;
	/** Value at the end of the year (unrounded). */
	value: number;
}

/**
 * Month-by-month SIP simulation. Each contribution is paid at the START of its month and earns
 * the monthly rate (annual ÷ 12) from then on: balance = (balance + contribution) × (1 + i).
 * monthlyFor(y) gives the contribution during year y (0-based). With a constant amount this is
 * the standard SIP formula, so a flat SIP here matches sipFutureValue in sip-calculator.calc.ts.
 */
export function simulateSip(annualPct: number, years: number, monthlyFor: (yearIndex: number) => number): YearEnd[] {
	const i = annualPct / 1200;
	let value = 0;
	let invested = 0;
	const ends: YearEnd[] = [];
	for (let m = 0; m < years * 12; m++) {
		const y = Math.floor(m / 12);
		const c = monthlyFor(y);
		value = (value + c) * (1 + i);
		invested += c;
		if ((m + 1) % 12 === 0) ends.push({ monthly: c, invested, value });
	}
	return ends;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'monthly', label: 'Starting monthly investment', type: 'number', default: 10000, min: 100, max: 10_000_000, step: 500, prefix: '$', suffix: '/mo' },
		{
			id: 'stepType',
			label: 'Step-up type',
			type: 'select',
			display: 'segmented',
			default: 'percent',
			options: [
				{ label: 'Percentage', value: 'percent' },
				{ label: 'Fixed amount', value: 'fixed' }
			]
		},
		{
			id: 'stepPct',
			label: 'Yearly step-up',
			type: 'number',
			default: 10,
			min: 0,
			max: 100,
			step: 0.5,
			suffix: '%',
			help: 'Applied every 12 months, compounding on the last SIP',
			visibleWhen: (v) => v.stepType !== 'fixed'
		},
		{
			id: 'stepAmount',
			label: 'Yearly increase',
			type: 'number',
			default: 1000,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			suffix: '/mo',
			help: 'Added to the monthly amount every 12 months',
			visibleWhen: (v) => v.stepType === 'fixed'
		},
		{ id: 'rate', label: 'Expected annual return', type: 'number', default: 12, min: 0, max: 50, step: 0.1, suffix: '%' },
		{ id: 'years', label: 'Investment period', type: 'number', default: 10, min: 1, max: 50, step: 1, decimal: false, suffix: 'years' }
	],
	calculate(v: InputValues) {
		const start = Number(v.monthly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const fixed = v.stepType === 'fixed';
		const step = fixed ? Number(v.stepAmount) : Number(v.stepPct);
		const valid =
			start > 0 &&
			Number.isFinite(start) &&
			rate >= 0 &&
			rate <= 50 &&
			years >= 1 &&
			years <= 50 &&
			Number.isInteger(years) &&
			Number.isFinite(step) &&
			step >= 0 &&
			(fixed || step <= 100);
		if (!valid) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Maturity value with step-up',
				summary: 'Enter an amount above zero, a return from 0% to 50%, a step-up, and 1 to 50 years.'
			};
		}

		// Year y (0-based) contribution. Percentage steps compound: P × (1 + s)^y. Fixed steps add: P + y × F.
		const withStepUp = (y: number) => (fixed ? start + y * step : start * Math.pow(1 + step / 100, y));
		const stepUp = simulateSip(rate, years, withStepUp);
		const flat = simulateSip(rate, years, () => start);

		const last = stepUp[years - 1];
		const lastFlat = flat[years - 1];
		const maturity = Math.round(last.value);
		const invested = Math.round(last.invested);
		const flatValue = Math.round(lastFlat.value);
		const flatInvested = Math.round(lastFlat.invested);

		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [{ year: 0, value: 0, flatValue: 0 }];
		for (let y = 1; y <= years; y++) {
			const e = stepUp[y - 1];
			const f = flat[y - 1];
			chartData.push({ year: y, value: Math.round(e.value), flatValue: Math.round(f.value) });
			rows.push({
				year: String(y),
				monthly: money(Math.round(e.monthly), true),
				invested: money(Math.round(e.invested), true),
				value: money(Math.round(e.value), true),
				flat: money(Math.round(f.value), true)
			});
		}

		const stepText = fixed ? `${money(step, true)} a month each year` : `${num(step, 2)}% each year`;

		return {
			primaryResult: money(maturity, true),
			primaryLabel: 'Maturity value with step-up',
			summary: `Starting at ${money(start, true)} a month, rising ${stepText}, over ${plural(years, 'year')} at ${num(rate, 2)}% a year.`,
			secondaryMetrics: [
				{ label: 'Total invested (step-up)', value: money(invested, true) },
				{ label: 'Estimated returns (step-up)', value: money(maturity - invested, true) },
				{ label: 'Monthly SIP in final year', value: money(Math.round(last.monthly), true) },
				{ label: 'Flat SIP invested', value: money(flatInvested, true) },
				{ label: 'Flat SIP value', value: money(flatValue, true) },
				{ label: 'Extra from step-up', value: money(maturity - flatValue, true) }
			],
			chart: {
				type: 'line',
				title: 'Maturity value: step-up SIP vs flat SIP',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'value', label: 'Step-up SIP' },
					{ key: 'flatValue', label: 'Flat SIP' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Year-by-year step-up schedule',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'monthly', label: 'Monthly SIP', align: 'end' },
					{ key: 'invested', label: 'Invested to date', align: 'end' },
					{ key: 'value', label: 'Step-up value', align: 'end' },
					{ key: 'flat', label: 'Flat SIP value', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this step-up SIP calculator to see how much a SIP could grow if you raise the monthly amount every year. It also shows a flat SIP side by side, so you can see what the yearly increase adds. The maths works in any currency.',
		howTo: [
			'Enter your starting monthly investment.',
			'Choose a percentage or a fixed amount for the yearly increase, then enter it.',
			'Enter the expected yearly return and the number of years.',
			'Compare the step-up maturity value with the flat SIP value shown below it.'
		],
		about: [
			{
				heading: 'What is a step-up SIP?',
				paragraphs: [
					'A step-up SIP is a SIP where the monthly amount goes up at fixed intervals, usually once a year. For example, you might start at ₹10,000 a month and add 10% each year.',
					'It suits people whose pay rises over time. Your investing grows with your income, so you don’t need to remember to raise it. If you want to see a flat plan first, use the [SIP calculator](/sip-calculator).'
				]
			},
			{
				heading: 'How the step-up is calculated',
				paragraphs: [
					'This calculator works month by month. In each month, it adds that month’s SIP to the balance and then grows the balance by one month of return (the yearly return divided by 12).',
					'With a percentage step-up, each year’s amount is the previous year’s amount times (1 + step-up). With a fixed step-up, the same rupee amount is added each year. The amount changes only once every 12 months.',
					'If you set the step-up to zero, the result matches the flat SIP exactly.'
				]
			},
			{
				heading: 'How much difference does the step-up make?',
				paragraphs: [
					'Quite a lot. The table below uses ₹10,000 a month for 10 years at 12%. A flat SIP grows to ₹23,23,391 on ₹12,00,000 invested.'
				],
				table: {
					caption: 'Starting at ₹10,000 a month for 10 years at 12%',
					columns: ['Yearly step-up', 'Total invested', 'Maturity value'],
					rows: [
						['None (flat SIP)', '₹12,00,000', '₹23,23,391'],
						['5% a year', '₹15,09,347', '₹27,86,942'],
						['10% a year', '₹19,12,491', '₹33,74,326'],
						['15% a year', '₹24,36,446', '₹41,18,727'],
						['20% a year', '₹31,15,042', '₹50,61,327'],
						['₹1,000 more each year', '₹17,40,000', '₹31,45,356']
					]
				}
			},
			{
				heading: 'Start smaller, step up every year',
				paragraphs: [
					'A step-up can make a lower start easier to manage. Take a SIP of ₹5,000 a month for 15 years at 12%. With a 10% yearly step-up, it grows to ₹43,41,925. Without a step-up, the same SIP reaches ₹25,22,880.',
					'By comparison, a flat SIP of ₹10,000 for 15 years reaches ₹50,45,760. So starting at half the amount and stepping up closes much of the gap.',
					'Keep in mind that a higher step-up also means you invest more in later years. Check that your future pay can really carry it. A 10% step-up for 20 years takes ₹10,000 up to ₹61,159 a month.'
				]
			},
			{
				heading: 'Tips for using a step-up SIP',
				paragraphs: ['A few points help you get a realistic plan:'],
				list: [
					'**Match the step-up to your pay rise.** If your income grows 8% a year, a 20% step-up won’t last.',
					'**Use a percentage when income grows steadily.** Use a fixed amount if you prefer a simple, predictable increase.',
					'**Test a low return.** Try 8% and 10% along with 12% before you set a goal.',
					'**Pair it with an end plan.** When you stop investing, the [SWP calculator](/swp-calculator) shows how the corpus can pay you each month.',
					'**Mix safe and market-linked options.** The [PPF calculator](/ppf-calculator) and [lumpsum calculator](/lumpsum-calculator) help you compare.',
					'**Think about tax.** Gains are taxed when you sell. See the [capital gains tax calculator](/capital-gains-tax-calculator-india).'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly amount in year y',
				expression: 'Percentage: P × (1 + s)ʸ⁻¹     Fixed: P + (y − 1) × F',
				variables: [
					{ symbol: 'P', meaning: 'starting monthly investment' },
					{ symbol: 's', meaning: 'yearly step-up as a decimal (10% = 0.10)' },
					{ symbol: 'F', meaning: 'fixed yearly increase in the monthly amount' },
					{ symbol: 'y', meaning: 'year number, starting at 1' }
				]
			},
			{
				title: 'Growth, month by month',
				expression: 'Balance = (Balance + monthly amount) × (1 + i), with i = annual return ÷ 12 ÷ 100',
				variables: [
					{ symbol: 'i', meaning: 'monthly return' }
				]
			}
		],
		example: {
			title: '₹10,000 a month, rising 10% a year, for 10 years at 12% a year',
			steps: [
				'Year 1 pays ₹10,000 a month. Year 10 pays ₹10,000 × 1.1⁹ ≈ ₹23,579 a month.',
				'Total invested = 12 × ₹10,000 × (1 + 1.1 + … + 1.1⁹) ≈ ₹19,12,491',
				'Each month, add that month’s SIP, then grow the balance by 1% (12% ÷ 12)',
				'Maturity value after 120 months ≈ ₹33,74,326',
				'Flat SIP at ₹10,000 a month for the same period ≈ ₹23,23,391',
				'Extra from the step-up ≈ ₹10,50,935'
			],
			result: 'Step-up maturity ₹33,74,326 on ₹19,12,491 invested. Flat SIP ₹23,23,391 on ₹12,00,000 invested.'
		},
		faq: [
			{
				q: 'What is a step-up SIP?',
				a: 'A step-up SIP increases the amount you invest in regular steps, for example every year. It suits people whose income rises over time.'
			},
			{
				q: 'How is a step-up SIP calculated?',
				a: 'Each month, the SIP amount is added to the balance and the balance grows by one month of return. Once a year, the SIP amount rises by your chosen percentage or fixed sum.'
			},
			{
				q: 'Should I use a percentage or a fixed amount?',
				a: 'A percentage keeps your increase in step with a growing income. A fixed amount gives a steady, predictable increase. Use whichever matches how your budget will grow.'
			},
			{
				q: 'Is a step-up SIP better than a flat SIP?',
				a: 'It usually gives a bigger corpus, because you invest more. But it also asks more of your budget later. The calculator shows both so you can see the cost and the gain.'
			},
			{
				q: 'Does the calculator include tax, charges or inflation?',
				a: 'No. It does not deduct taxes, fees or inflation, and it assumes the same return every month. Real returns vary, so treat the result as an estimate.'
			},
			{
				q: 'Can I use this step-up SIP calculator outside India?',
				a: 'Yes. The method works for any monthly plan that rises each year. Switch the currency at the top of the calculator.'
			}
		],
		sources: [
			{
				title: 'Bajaj AMC — How to use a step-up SIP calculator to plan financial goals',
				url: 'https://www.bajajamc.com/knowledge-centre/how-to-use-a-step-up-sip-calculator-to-plan-financial-goals'
			},
			{ title: 'AMFI — Association of Mutual Funds in India', url: 'https://www.amfiindia.com/' }
		],
		disclaimer:
			'This is an estimate for illustration only. It is not investment advice, and mutual fund returns are not guaranteed.'
	}
});
