import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './roi-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'invested',
			label: 'Amount invested',
			type: 'number',
			default: 10000,
			min: 0,
			max: 1_000_000_000_000,
			step: 100,
			prefix: '$'
		},
		{
			id: 'returned',
			label: 'Amount returned',
			type: 'number',
			default: 14000,
			min: 0,
			max: 1_000_000_000_000,
			step: 100,
			prefix: '$',
			help: 'What the investment is worth at the end, including any income you kept.'
		},
		{
			id: 'years',
			label: 'Investment length',
			type: 'number',
			default: 1,
			min: 0.01,
			max: 100,
			step: 0.5,
			suffix: 'years',
			help: 'Optional. Leave blank to treat it as 1 year.'
		}
	],
	calculate(v): CalculationResult {
		const invested = Number(v.invested);
		const returned = Number(v.returned);
		const yearsInput = Number(v.years);
		const years = Number.isNaN(yearsInput) ? 1 : yearsInput;

		if (
			!(invested > 0) ||
			!Number.isFinite(invested) ||
			!(returned >= 0) ||
			!Number.isFinite(returned) ||
			!(years > 0 && years <= 100)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Return on investment',
				summary: 'Enter an amount invested above zero, an amount returned, and a length up to 100 years.'
			};
		}

		const gain = returned - invested;
		const roi = (gain / invested) * 100;
		// Annualized ROI = (returned ÷ invested)^(1 ÷ years) − 1
		const annualized = (Math.pow(returned / invested, 1 / years) - 1) * 100;
		const length = years === 1 ? '1 year' : `${num(years, 2)} years`;

		return {
			primaryResult: pct(roi),
			primaryLabel: 'Return on investment',
			summary: `You ${gain >= 0 ? 'gained' : 'lost'} ${money(Math.abs(gain))} over ${length}.`,
			secondaryMetrics: [
				{ label: 'Gain or loss', value: money(gain) },
				{ label: 'Annualized ROI', value: pct(annualized) },
				{ label: 'Investment length', value: length }
			]
		};
	},
	content: {
		intro:
			'Use this ROI calculator to find the return on investment for a purchase, a project or a business deal. Enter what you put in and what you got back, and see the gain, the ROI and the annualized ROI.',
		howTo: [
			'Enter the amount you invested.',
			'Enter the amount returned, which is what the investment is worth at the end, including any income you kept.',
			'Enter how long you held it, in years. Decimals are fine, so 0.5 means six months.',
			'Read the ROI, then check the annualized ROI to compare deals of different lengths.'
		],
		about: [
			{
				heading: 'What is ROI?',
				paragraphs: [
					'ROI means return on investment. It tells you how much you gained or lost compared with what you put in, as a percentage. A 40% ROI means you made $40 on every $100 invested.',
					'ROI is popular because it is simple. You can use it for shares, property, a business, a piece of equipment or an advertising campaign.'
				]
			},
			{
				heading: 'How ROI is calculated',
				paragraphs: [
					'Subtract the amount invested from the amount returned. This is your gain. Then divide the gain by the amount invested and multiply by 100.',
					'The annualized ROI goes one step further. It turns the total return into a steady yearly rate, so you can compare a 1-year deal with a 5-year deal fairly.'
				]
			},
			{
				heading: 'Why the time period matters',
				paragraphs: [
					'ROI on its own ignores time. A 40% ROI sounds great, but it means very different things after 2 years and after 10 years. The table below uses $10,000 that grows to $14,000.'
				],
				table: {
					caption: '$10,000 grows to $14,000',
					columns: ['Time held', 'ROI', 'Annualized ROI'],
					rows: [
						['1 year', '40%', '40%'],
						['2 years', '40%', '18.32%'],
						['5 years', '40%', '6.96%'],
						['10 years', '40%', '3.42%']
					]
				}
			},
			{
				heading: 'Using ROI for everyday decisions',
				paragraphs: [
					'ROI is not only for investors. For example, say you spend $500 on a tool and it earns you $650 in a year. The gain is $150, so the ROI is 30%.',
					'The same idea works for a course, a piece of equipment or a marketing campaign. Just be sure to count the full cost, and to put a fair value on what you got back.'
				]
			},
			{
				heading: 'What ROI does not tell you',
				paragraphs: [
					'ROI is only as good as the numbers you enter. Include every cost, such as fees, repairs, tax and the time you spent. If you leave costs out, the ROI looks better than it was.',
					'It also says nothing about risk. A high ROI from a risky deal is not the same as a lower ROI from a safe one. Returns are not guaranteed, and past returns do not predict future ones.'
				]
			},
			{
				heading: 'Tips for using ROI well',
				paragraphs: ['A few habits make the result more reliable:'],
				list: [
					'**Count all costs.** Add fees and running costs to the amount invested, or subtract them from the return.',
					'**Use annualized ROI to compare deals.** The same ROI over a longer time is a weaker result.',
					'**Use IRR when cash comes in stages.** Try the [IRR calculator](/irr-calculator) when you get money at different times.',
					'**Check payback too.** The [payback period calculator](/payback-period-calculator) shows how long it takes to get your money back.',
					'**For business pricing,** the [margin calculator](/margin-calculator) shows profit as a share of sales.'
				]
			}
		],
		formulas: [
			{
				title: 'Return on investment',
				expression: 'ROI = (Returned − Invested) ÷ Invested × 100',
				variables: [
					{ symbol: 'Returned', meaning: 'amount the investment is worth at the end, including income kept' },
					{ symbol: 'Invested', meaning: 'amount you put in' }
				]
			},
			{
				title: 'Annualized ROI',
				expression: 'Annualized ROI = (Returned ÷ Invested)^(1 ÷ n) − 1',
				variables: [{ symbol: 'n', meaning: 'number of years you held the investment' }]
			}
		],
		example: {
			title: '$10,000 invested and worth $14,000 after 2 years',
			steps: [
				'ROI: ($14,000 − $10,000) ÷ $10,000 × 100 = 40%',
				'Gain: $14,000 − $10,000 = $4,000',
				'Annualized: (14,000 ÷ 10,000)^(1 ÷ 2) − 1 = √1.4 − 1 ≈ 0.1832',
				'Annualized ROI ≈ 18.32% a year'
			],
			result: 'ROI 40%, gain $4,000.00, annualized ROI 18.32%.'
		},
		faq: [
			{
				q: 'How do I calculate ROI?',
				a: 'Subtract the amount invested from the amount returned, divide by the amount invested, and multiply by 100. For $10,000 turning into $14,000, ROI is 40%.'
			},
			{
				q: 'What is a good ROI?',
				a: 'It depends on the risk and the time. Compare the annualized ROI with what a safer option would pay. A deal that pays only a little more than a savings account may not be worth the risk.'
			},
			{
				q: 'What is the difference between ROI and annualized ROI?',
				a: 'ROI is the total return over the whole period. Annualized ROI converts it to a yearly rate, so you can compare deals of different lengths.'
			},
			{
				q: 'Can ROI be negative?',
				a: 'Yes. A negative ROI means you lost money. If $10,000 falls to $7,500 over 2 years, the ROI is −25%, or about −13.4% a year.'
			},
			{
				q: 'What is the difference between ROI and IRR?',
				a: 'ROI is one total percentage and ignores timing. IRR allows for cash that comes in or goes out at different times, so it suits projects with several payments.'
			},
			{
				q: 'Should I include fees and tax?',
				a: 'Yes. Add all costs for a true picture. Enter the amount returned after fees and tax if you want the return you keep.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' },
			{ title: 'Investor.gov (U.S. SEC) — Interest rate', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/interest-rate' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. Results depend on the figures you enter. This tool is not financial advice.'
	}
});
