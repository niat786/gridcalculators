import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './compound-interest-calculator.meta';

/** Compounding periods per year. */
const PERIODS: Record<string, number> = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'principal', label: 'Initial deposit', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'monthly',
			label: 'Monthly contribution',
			type: 'number',
			default: 200,
			min: 0,
			max: 1_000_000,
			step: 10,
			prefix: '$',
			suffix: '/mo',
			help: 'Added at the end of each month.'
		},
		{ id: 'rate', label: 'Annual interest rate', type: 'number', default: 6, min: 0, max: 100, step: 0.01, suffix: '%' },
		{ id: 'years', label: 'Years', type: 'number', default: 10, min: 1, max: 100, step: 1, suffix: 'years', decimal: false },
		{
			id: 'compounding',
			label: 'Compounding',
			type: 'select',
			display: 'menu',
			default: 'monthly',
			options: [
				{ label: 'Annually', value: 'annually' },
				{ label: 'Quarterly', value: 'quarterly' },
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Daily', value: 'daily' }
			]
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.principal);
		const monthly = Number(v.monthly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const n = PERIODS[String(v.compounding)];
		if (
			!(principal >= 0) ||
			!(monthly >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(Number.isInteger(years) && years >= 1 && years <= 100) ||
			n === undefined
		) {
			return { primaryResult: DASH, primaryLabel: 'Future value', summary: 'Check the deposit, rate and years.' };
		}

		// Interest is compounded n times a year. Contributions arrive monthly, so convert the
		// schedule to an effective monthly rate: (1 + r ÷ n)^(n ÷ 12) − 1.
		const monthRate = Math.pow(1 + rate / 100 / n, n / 12) - 1;

		let balance = principal;
		let contributed = principal;
		const chartData: Record<string, number>[] = [{ year: 0, balance, contributed }];
		const rows: Record<string, string>[] = [];
		for (let y = 1; y <= years; y++) {
			for (let m = 0; m < 12; m++) balance = balance * (1 + monthRate) + monthly;
			contributed += monthly * 12;
			const interest = balance - contributed;
			chartData.push({ year: y, balance, contributed });
			rows.push({
				year: String(y),
				contributed: money(contributed, true),
				interest: money(interest, true),
				balance: money(balance, true)
			});
		}

		const interest = balance - contributed;
		const effectiveAnnual = Math.pow(1 + rate / 100 / n, n) - 1;

		return {
			primaryResult: money(balance),
			primaryLabel: 'Future value',
			summary: `After ${plural(years, 'year')} you put in ${money(contributed, true)} and earn ${money(interest, true)} in interest.`,
			secondaryMetrics: [
				{ label: 'Total contributions', value: money(contributed) },
				{ label: 'Total interest earned', value: money(interest) },
				{ label: 'Effective annual rate', value: pct(effectiveAnnual * 100, 3) }
			],
			chart: {
				type: 'line',
				title: 'Balance compared with total contributed',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Balance' },
					{ key: 'contributed', label: 'Total contributed' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Yearly breakdown',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'contributed', label: 'Contributed', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this compound interest calculator to see how a starting deposit and regular monthly savings grow over time. You can compare the final balance with the total you put in.',
		howTo: [
			'Enter your starting deposit and the amount you add each month.',
			'Enter the annual interest rate and how many years you plan to save or invest.',
			'Choose how often interest is added to your balance: yearly, quarterly, monthly or daily.',
			'Read the future value, then open the yearly breakdown to see the growth year by year.'
		],
		about: [
			{
				heading: 'What is compound interest?',
				paragraphs: [
					'Compound interest is interest that earns interest. In the first period, you earn interest on your deposit (the amount you start with). After that, you earn interest on the deposit plus all the interest added so far.',
					'This is why growth looks slow at first and then speeds up. Time matters more than most people expect. The longer money stays in, the more the compounding does for you.',
					'Compare this with [simple interest](/simple-interest-calculator), where you earn interest only on the original amount.'
				]
			},
			{
				heading: 'How compound interest is calculated',
				paragraphs: [
					'The calculator first turns your annual rate into an effective monthly rate that matches your compounding schedule. Then it grows the balance month by month and adds your contribution at the end of each month.',
					'You can see the exact formulas below. If you add nothing each month, the answer is the classic formula: deposit × (1 + rate ÷ periods) raised to the number of periods.'
				]
			},
			{
				heading: 'How compounding frequency changes the result',
				paragraphs: [
					'The more often interest is added, the sooner it starts earning more interest. However, the gain is small at normal rates. The table below uses $1,000 at 5% for 10 years with no extra deposits.'
				],
				table: {
					caption: '$1,000 at 5% for 10 years',
					columns: ['Compounding', 'Final balance', 'Effective annual rate'],
					rows: [
						['Annually', '$1,628.89', '5%'],
						['Monthly', '$1,647.01', '5.116%'],
						['Daily', '$1,648.66', '5.127%']
					]
				}
			},
			{
				heading: 'Why time and regular saving matter',
				paragraphs: [
					'Saving a fixed amount each month and leaving it alone shows the effect of time clearly. The table below uses $200 a month at 6%, compounded monthly, starting from zero.'
				],
				table: {
					caption: '$200 a month at 6%, no starting deposit',
					columns: ['Years', 'You put in', 'Interest earned', 'Final balance'],
					rows: [
						['10', '$24,000', '$8,776', '$32,776'],
						['20', '$48,000', '$44,408', '$92,408'],
						['30', '$72,000', '$128,903', '$200,903']
					]
				}
			},
			{
				heading: 'Tips for using the result',
				paragraphs: ['A projection is only as good as the rate you enter. Here are some ways to use it sensibly:'],
				list: [
					'**Try a few rates.** Returns are never guaranteed, so test a low, a middle and a high rate and plan around the low one.',
					'**Think in real terms.** Prices rise over time, so a balance buys less in the future. Check the effect with the [inflation calculator](/inflation-calculator).',
					'**Allow for fees and tax.** Both reduce what you keep, and this tool does not include them.',
					'**Save regularly.** If you invest every month in India, the [SIP calculator](/sip-calculator) uses the same idea.',
					'**Work backwards.** The [future value calculator](/future-value-calculator) and [savings calculator](/savings-calculator) help you set a target.'
				]
			}
		],
		formulas: [
			{
				title: 'Effective monthly rate',
				expression: 'i = (1 + r ÷ n)^(n ÷ 12) − 1',
				variables: [
					{ symbol: 'i', meaning: 'interest rate per month, adjusted for the compounding schedule' },
					{ symbol: 'r', meaning: 'annual interest rate as a decimal (6% is 0.06)' },
					{ symbol: 'n', meaning: 'compounding periods per year (1, 4, 12 or 365)' }
				]
			},
			{
				title: 'Future value',
				expression: 'FV = P × (1 + i)ᴺ + C × ((1 + i)ᴺ − 1) ÷ i',
				variables: [
					{ symbol: 'FV', meaning: 'balance at the end of the period' },
					{ symbol: 'P', meaning: 'initial deposit' },
					{ symbol: 'C', meaning: 'monthly contribution, added at the end of each month' },
					{ symbol: 'N', meaning: 'number of months (years × 12)' }
				]
			}
		],
		example: {
			title: '$10,000 to start, $200 a month, 6% for 10 years, compounded monthly',
			steps: [
				'Monthly rate: i = (1 + 0.06 ÷ 12)¹ − 1 = 0.005',
				'Months: N = 10 × 12 = 120',
				'Growth of the deposit: $10,000 × 1.005¹²⁰ ≈ $18,193.97',
				'Growth of contributions: $200 × (1.005¹²⁰ − 1) ÷ 0.005 ≈ $32,775.87',
				'Future value: $18,193.97 + $32,775.87 ≈ $50,969.84',
				'Total contributed: $10,000 + $200 × 120 = $34,000, so interest is $16,969.84'
			],
			result: 'Future value ≈ $50,969.84. You put in $34,000 and earn about $16,969.84 in interest.'
		},
		faq: [
			{
				q: 'How does compound interest work?',
				a: 'You earn interest on your deposit, and then you earn interest on that interest too. Each time interest is added, the base grows, so the next payment is a little bigger. Over many years this adds up to far more than simple interest.'
			},
			{
				q: 'How does compounding frequency change the result?',
				a: 'More frequent compounding adds interest sooner, so the balance grows a little faster. At normal rates the gap between monthly and daily is small. It grows with higher rates and longer periods.'
			},
			{
				q: 'When are contributions added?',
				a: 'Each monthly contribution is added at the end of the month. It starts earning interest from the next month.'
			},
			{
				q: 'What is the difference between simple and compound interest?',
				a: 'Simple interest is paid only on the original amount. Compound interest is also paid on interest you have already earned, so balances grow faster over long periods.'
			},
			{
				q: 'How long does it take for money to double?',
				a: 'A quick guide is the rule of 72. Divide 72 by the annual rate. At 6%, that gives about 12 years. It is only an estimate, but it works well for rates between about 4% and 12%.'
			},
			{
				q: 'Does this include taxes, fees or inflation?',
				a: 'No. Taxes on interest or gains, account fees and inflation are not included. Your real return can be lower than the rate you enter.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. This tool does not account for taxes, fees or inflation, and it is not financial advice.'
	}
});
