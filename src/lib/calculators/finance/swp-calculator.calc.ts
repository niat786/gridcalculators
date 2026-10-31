import { defineCalculator, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './swp-calculator.meta';

export interface SwpResult {
	/** Balance at the end of the period (unrounded). Zero once the money has run out. */
	balance: number;
	/** Total withdrawn, including any final partial withdrawal (unrounded). */
	withdrawn: number;
	/** Growth added over the period (unrounded). */
	growth: number;
	/** 1-based month in which the balance could no longer cover the withdrawal, or null. */
	runOutMonth: number | null;
	/** Withdrawals made in the year and balance at each year end (index 0 = year 1). */
	years: { withdrawn: number; balance: number }[];
}

/**
 * Monthly SWP simulation. Each month the opening balance earns annual ÷ 12, then the withdrawal is
 * taken at the END of the month. If the balance is smaller than the withdrawal, the rest is taken
 * and the plan is marked as running out in that month.
 * Without a run-out, this matches the closed form B(n) = P(1+i)ⁿ − W × ((1+i)ⁿ − 1) ÷ i.
 */
export function simulateSwp(corpus: number, withdrawal: number, annualPct: number, months: number): SwpResult {
	const i = annualPct / 1200;
	let balance = corpus;
	let withdrawn = 0;
	let growth = 0;
	let runOutMonth: number | null = null;
	const years: { withdrawn: number; balance: number }[] = [];
	let yearWithdrawn = 0;

	for (let m = 1; m <= months; m++) {
		const g = balance * i;
		balance += g;
		growth += g;
		if (balance <= withdrawal) {
			yearWithdrawn += balance;
			withdrawn += balance;
			balance = 0;
			if (runOutMonth === null) runOutMonth = m;
		} else {
			balance -= withdrawal;
			yearWithdrawn += withdrawal;
			withdrawn += withdrawal;
		}
		if (m % 12 === 0) {
			years.push({ withdrawn: yearWithdrawn, balance });
			yearWithdrawn = 0;
		}
	}
	return { balance, withdrawn, growth, runOutMonth, years };
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'corpus', label: 'Starting corpus', type: 'number', default: 5000000, min: 1, max: 1_000_000_000_000, step: 10000, prefix: '$', help: 'Amount invested at the start' },
		{ id: 'withdrawal', label: 'Monthly withdrawal', type: 'number', default: 30000, min: 1, max: 100_000_000, step: 500, prefix: '$', suffix: '/mo' },
		{ id: 'rate', label: 'Expected annual return', type: 'number', default: 8, min: 0, max: 50, step: 0.1, suffix: '%' },
		{ id: 'years', label: 'Withdrawal period', type: 'number', default: 10, min: 1, max: 50, step: 1, decimal: false, suffix: 'years' }
	],
	calculate(v: InputValues) {
		const corpus = Number(v.corpus);
		const withdrawal = Number(v.withdrawal);
		const rate = Number(v.rate);
		const years = Number(v.years);
		if (
			!(corpus > 0) ||
			!Number.isFinite(corpus) ||
			!(withdrawal > 0) ||
			!Number.isFinite(withdrawal) ||
			!(rate >= 0 && rate <= 50) ||
			!(years >= 1 && years <= 50) ||
			!Number.isInteger(years)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Balance at the end',
				summary: 'Enter a corpus and a monthly withdrawal above zero, a return from 0% to 50%, and 1 to 50 years.'
			};
		}

		const months = years * 12;
		const sim = simulateSwp(corpus, withdrawal, rate, months);
		const finalBalance = Math.round(sim.balance);
		const totalWithdrawn = Math.round(sim.withdrawn);
		const growth = Math.round(sim.growth);
		const withdrawalsMade = sim.runOutMonth ?? months;

		const runOutText =
			sim.runOutMonth === null
				? 'Not within the period'
				: `Month ${sim.runOutMonth} (year ${Math.ceil(sim.runOutMonth / 12)})`;

		const summary =
			sim.runOutMonth === null
				? `Your corpus lasts the full ${plural(years, 'year')} and ${money(finalBalance, true)} is left.`
				: `The money runs out in month ${sim.runOutMonth} (year ${Math.ceil(sim.runOutMonth / 12)}), so the plan ends there.`;

		let cumulative = 0;
		const chartData: Record<string, number>[] = [{ year: 0, balance: corpus, withdrawn: 0 }];
		const rows: Record<string, string>[] = [];
		sim.years.forEach((y, idx) => {
			cumulative += y.withdrawn;
			chartData.push({ year: idx + 1, balance: Math.round(y.balance), withdrawn: Math.round(cumulative) });
			rows.push({
				year: String(idx + 1),
				withdrawn: money(Math.round(y.withdrawn), true),
				balance: money(Math.round(y.balance), true)
			});
		});

		return {
			primaryResult: money(finalBalance, true),
			primaryLabel: `Balance after ${plural(years, 'year')}`,
			summary,
			secondaryMetrics: [
				{ label: 'Total withdrawn', value: money(totalWithdrawn, true) },
				{ label: 'Growth earned', value: money(growth, true) },
				{ label: 'Money runs out', value: runOutText },
				{ label: 'Months with a withdrawal', value: plural(withdrawalsMade, 'month') },
				{ label: 'Monthly withdrawal', value: money(withdrawal, true) },
				{ label: 'Starting corpus', value: money(corpus, true) }
			],
			chart: {
				type: 'line',
				title: 'Remaining balance and total withdrawn over time',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Remaining balance' },
					{ key: 'withdrawn', label: 'Total withdrawn' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Year-by-year withdrawals',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'withdrawn', label: 'Withdrawn in year', align: 'end' },
					{ key: 'balance', label: 'Balance at year end', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this SWP calculator to see how long a lump sum can pay you a fixed amount every month while the rest stays invested. It shows the balance left at the end and the month the money runs out, if it does. The maths works in any currency.',
		howTo: [
			'Enter the amount you have invested at the start.',
			'Enter the fixed amount you want to withdraw each month.',
			'Enter the expected yearly return and the number of years you need the money to last.',
			'Read the final balance and the run-out month, then open the table for each year.'
		],
		about: [
			{
				heading: 'What is a systematic withdrawal plan?',
				paragraphs: [
					'A systematic withdrawal plan (SWP) pays you a fixed sum from your investment every month. The part you haven’t withdrawn stays invested and keeps earning.',
					'In a way, it is the mirror image of a SIP. A [SIP](/sip-calculator) builds a corpus (your pot of savings). An SWP spends it slowly. For this reason, many retired people use it to get a regular income without selling everything at once.'
				]
			},
			{
				heading: 'How the SWP balance is calculated',
				paragraphs: [
					'Each month, the calculator first adds one month of return to your balance. The yearly return divided by 12 gives the monthly return. Then it takes out your withdrawal at the end of the month.',
					'If the balance is smaller than the withdrawal, you receive what is left and the plan ends that month. So the calculator shows this as the run-out month.',
					'The closed-form version of this is in the formulas below. It matches the month-by-month result whenever the money doesn’t run out.'
				]
			},
			{
				heading: 'How the withdrawal size changes how long money lasts',
				paragraphs: [
					'The withdrawal is the biggest lever. The table below starts with ₹50,00,000 at 8% a year for 10 years. Small rises in the monthly amount cut the final balance quickly, and a high enough amount empties the pot early.'
				],
				table: {
					caption: '₹50,00,000 at 8% for 10 years',
					columns: ['Monthly withdrawal', 'Balance after 10 years', 'Result'],
					rows: [
						['₹20,000', '₹74,39,280', 'Lasts'],
						['₹30,000', '₹56,09,820', 'Lasts'],
						['₹40,000', '₹37,80,360', 'Lasts'],
						['₹50,000', '₹19,50,899', 'Lasts'],
						['₹60,000', '₹1,21,439', 'Almost gone'],
						['₹65,000', '₹0', 'Runs out in month 109'],
						['₹70,000', '₹0', 'Runs out in month 98']
					]
				}
			},
			{
				heading: 'What a lasting plan looks like',
				paragraphs: [
					'At 8%, ₹50,00,000 earns about ₹33,333 a month in growth (₹50,00,000 × 8% ÷ 12). If you withdraw less than that, the balance can grow. If you withdraw more, you eat into the principal.',
					'The effect grows over a longer time. For example, over 30 years, a withdrawal of ₹30,000 a month leaves ₹99,67,865. However, a withdrawal of ₹35,000 a month leaves only ₹25,16,068. Both assume the full 8% every year, which real markets rarely give.',
					'Remember that prices rise. A flat ₹30,000 buys less each year, so you may need to raise the withdrawal later. As a result, the money may run out sooner than this calculator shows.'
				]
			},
			{
				heading: 'Tips for planning withdrawals',
				paragraphs: ['Use these points to make the plan more realistic:'],
				list: [
					'**Test a lower return.** Run the numbers at 6% as well as 8%. A bad early market hurts an SWP more than a bad late one.',
					'**Keep a buffer.** Hold a year or two of expenses in a safe place, such as an [FD](/fd-calculator).',
					'**Mind the tax.** Part of each withdrawal is a gain, and gains are taxed. Estimate it with the [capital gains tax calculator](/capital-gains-tax-calculator-india).',
					'**Compare other income options.** The [SCSS calculator](/scss-calculator) and the [post office MIS calculator](/post-office-mis-calculator) show fixed income with no market risk.',
					'**Combine with a pension.** If you have an NPS account, see what it pays with the [NPS calculator](/nps-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly balance',
				expression: 'Balance = Balance × (1 + r ÷ 12) − W, each month',
				variables: [
					{ symbol: 'r', meaning: 'expected annual return as a decimal (8% = 0.08)' },
					{ symbol: 'W', meaning: 'monthly withdrawal, taken at the end of the month' }
				]
			},
			{
				title: 'Balance after n months (no run-out)',
				expression: 'B(n) = P × (1 + i)ⁿ − W × ((1 + i)ⁿ − 1) ÷ i, with i = r ÷ 12',
				variables: [
					{ symbol: 'P', meaning: 'starting corpus' },
					{ symbol: 'n', meaning: 'number of months' }
				]
			}
		],
		example: {
			title: '₹50,00,000 with ₹30,000 withdrawn each month for 10 years at 8%',
			steps: [
				'Monthly rate: i = 8 ÷ 12 ÷ 100 ≈ 0.0066667, and n = 10 × 12 = 120',
				'Growth factor: (1 + i)¹²⁰ ≈ 2.219640',
				'Corpus grown: ₹50,00,000 × 2.219640 ≈ ₹1,10,98,201',
				'Withdrawals grown: ₹30,000 × (2.219640 − 1) ÷ 0.0066667 ≈ ₹54,88,381',
				'Balance: ₹1,10,98,201 − ₹54,88,381 ≈ ₹56,09,820',
				'Total withdrawn: 120 × ₹30,000 = ₹36,00,000'
			],
			result: 'Balance after 10 years ₹56,09,820. Total withdrawn ₹36,00,000. The money does not run out.'
		},
		faq: [
			{
				q: 'What is a systematic withdrawal plan?',
				a: 'An SWP is a plan that sells a fixed amount of your investment each month and pays it to you. The balance that remains keeps earning the return you expect.'
			},
			{
				q: 'How much can I withdraw each month without running out?',
				a: 'It depends on the return and the time. As a guide, a withdrawal below the monthly growth (corpus × yearly return ÷ 12) can leave the balance intact. Test low returns, because real markets vary.'
			},
			{
				q: 'Why does the return apply before the withdrawal?',
				a: 'This calculator adds one month of growth to the opening balance, then takes the withdrawal at the end of the month. Withdrawing first would leave the balance earning less, so the result would be a little lower.'
			},
			{
				q: 'What happens when the money runs out?',
				a: 'The last withdrawal is whatever is left, and the plan ends in that month. The calculator shows the run-out month and the number of months you were paid.'
			},
			{
				q: 'Does this include tax, exit loads or inflation?',
				a: 'No. Taxes on gains, exit loads and inflation are not included. A withdrawal that rises with inflation will run out sooner than a flat one.'
			},
			{
				q: 'Can I use this SWP calculator outside India?',
				a: 'Yes. The maths is the same for any investment that pays out monthly. Switch the currency at the top of the calculator.'
			}
		],
		sources: [
			{
				title: 'FundsIndia — SWP calculator',
				url: 'https://www.fundsindia.com/calculators/swp-calculator'
			},
			{ title: 'AMFI — Association of Mutual Funds in India', url: 'https://www.amfiindia.com/' }
		],
		disclaimer:
			'This is an estimate for illustration only. It is not financial advice, and actual returns and withdrawals can differ.'
	}
});
