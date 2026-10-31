import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct } from '../format';
import meta from './commission-calculator.meta';

const modeOptions = [
	{ label: 'Flat rate', value: 'flat' },
	{ label: 'Tiered', value: 'tiered' }
];

/**
 * Commission on sales. Flat: one rate on every sale. Tiered: the first rate applies up to the
 * threshold, and the second rate applies only to the sales above it.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'sale', label: 'Sale amount', type: 'number', default: 25000, min: 0, max: 1_000_000_000, step: 500, prefix: '$', help: 'Total sales you are paid on.' },
		{
			id: 'rate',
			label: 'Commission rate',
			type: 'number',
			default: 5,
			min: 0,
			max: 100,
			step: 0.1,
			suffix: '%',
			help: 'Flat mode: applies to all sales. Tiered mode: applies up to the threshold.'
		},
		{ id: 'base', label: 'Base pay', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'Fixed pay on top of commission, if any.' },
		{ id: 'mode', label: 'Commission structure', type: 'select', display: 'segmented', default: 'flat', options: modeOptions },
		{
			id: 'threshold',
			label: 'Tier threshold',
			type: 'number',
			default: 20000,
			min: 0,
			max: 1_000_000_000,
			step: 500,
			prefix: '$',
			help: 'Sales up to this amount earn the first rate.',
			visibleWhen: (v) => v.mode === 'tiered'
		},
		{
			id: 'rate2',
			label: 'Rate above threshold',
			type: 'number',
			default: 8,
			min: 0,
			max: 100,
			step: 0.1,
			suffix: '%',
			visibleWhen: (v) => v.mode === 'tiered'
		}
	],
	calculate(v): CalculationResult {
		const sale = Number(v.sale);
		const rate = Number(v.rate);
		const base = Number(v.base);
		const tiered = v.mode === 'tiered';
		const threshold = Number(v.threshold);
		const rate2 = Number(v.rate2);

		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Total earnings',
			summary: 'Enter a sale amount, a rate from 0 to 100%, and any base pay.'
		});

		if (
			!(sale >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(base >= 0) ||
			(v.mode !== 'flat' && v.mode !== 'tiered') ||
			(tiered && !(threshold >= 0 && rate2 >= 0 && rate2 <= 100))
		) {
			return invalid();
		}

		const commission = tiered
			? (Math.min(sale, threshold) * rate) / 100 + (Math.max(0, sale - threshold) * rate2) / 100
			: (sale * rate) / 100;
		const total = base + commission;
		const effective = sale > 0 ? (commission / sale) * 100 : 0;

		const summary = tiered
			? `${pct(rate, 2)} on the first ${money(threshold)} of sales, then ${pct(rate2, 2)} on the rest.`
			: `${pct(rate, 2)} on ${money(sale)} of sales.`;

		return {
			primaryResult: money(total),
			primaryLabel: 'Total earnings',
			summary,
			secondaryMetrics: [
				{ label: 'Commission', value: money(commission) },
				{ label: 'Base pay', value: money(base) },
				{ label: 'Effective commission rate', value: pct(effective, 2) }
			]
		};
	},
	content: {
		intro:
			'Use this commission calculator to work out what you earn on sales. It handles a flat rate and a tiered plan, and it can add any base pay on top.',
		howTo: [
			'Enter your total sales for the period.',
			'Enter your commission rate. For a tiered plan, this is the rate up to the threshold.',
			'Add any fixed base pay you receive on top of commission.',
			'For a tiered plan, enter the threshold and the higher rate that applies to sales above it.'
		],
		about: [
			{
				heading: 'What is sales commission?',
				paragraphs: [
					'Commission is pay you earn as a share of what you sell. It rewards results, so you earn more when you sell more. Some people are paid commission only, but others get a base pay (a fixed amount) plus commission.',
					'The terms of a plan can differ a lot between employers and countries. For example, some plans pay on revenue and others on profit. So always check your own agreement. This calculator covers the most common structures, so you can test the numbers before you rely on them.'
				]
			},
			{
				heading: 'Flat and tiered commission',
				paragraphs: [
					'With a flat plan, one rate applies to all your sales. At 5%, $25,000 in sales earns $1,250.',
					'With a tiered plan, the rate changes as sales grow. The first rate applies up to a threshold. The second rate applies only to the sales above it. However, this is not the same as paying the higher rate on everything, so the effective rate lands between the two.'
				]
			},
			{
				heading: 'How a tiered plan pays',
				paragraphs: [
					'The table below uses a plan that pays 5% on the first $20,000 of sales and 8% above that, plus $2,000 base pay.'
				],
				table: {
					caption: '5% up to $20,000, 8% above it, $2,000 base pay',
					columns: ['Sales', 'Commission', 'Effective rate', 'Total earnings'],
					rows: [
						['$15,000', '$750', '5%', '$2,750'],
						['$30,000', '$1,800', '6%', '$3,800'],
						['$50,000', '$3,400', '6.8%', '$5,400']
					]
				}
			},
			{
				heading: 'Flat compared with tiered',
				paragraphs: [
					'On $30,000 of sales with $2,000 base pay, a flat 5% plan pays $3,500 in total. The tiered plan above pays $3,800. The tier rewards you for sales past the threshold, so it can help you reach a target.',
					'If you are choosing between offers, test your likely sales in both modes. A higher rate with a very high threshold can pay less than a flat rate.'
				]
			},
			{
				heading: 'Things to check and tips',
				paragraphs: ['This calculator shows pay before tax. However, a few other points matter too:'],
				list: [
					'**Tax and deductions.** Commission is usually taxed as income. For US pay, the [take-home pay calculator](/take-home-pay-calculator) estimates what you keep. Elsewhere, check your local tax rules.',
					'**What counts as a sale.** Some plans pay on revenue, some on profit, and some only after the customer pays. Read your terms.',
					'**Returns and clawbacks.** Some employers take back commission on returned goods or cancelled orders.',
					'**Business side.** If you are setting prices, see the [margin calculator](/margin-calculator). The [salary calculator](/salary-calculator) converts pay between hourly, monthly and yearly amounts.',
					'**Planning.** Commission can swing from month to month, so a [budget](/budget-calculator) based on your lowest months is safer.'
				]
			}
		],
		formulas: [
			{
				title: 'Flat commission',
				expression: 'Commission = Sales × Rate',
				variables: [
					{ symbol: 'Sales', meaning: 'total sales you are paid on' },
					{ symbol: 'Rate', meaning: 'commission rate as a decimal (5% is 0.05)' }
				]
			},
			{
				title: 'Tiered commission',
				expression: 'Commission = min(Sales, T) × Rate₁ + max(0, Sales − T) × Rate₂',
				variables: [
					{ symbol: 'T', meaning: 'tier threshold' },
					{ symbol: 'Rate₁', meaning: 'rate on sales up to the threshold' },
					{ symbol: 'Rate₂', meaning: 'rate on sales above the threshold' }
				]
			},
			{
				title: 'Total earnings and effective rate',
				expression: 'Total = Base pay + Commission;  Effective rate = Commission ÷ Sales',
				variables: [{ symbol: 'Base pay', meaning: 'fixed pay on top of commission, if any' }]
			}
		],
		example: {
			title: '$30,000 in sales on a tiered plan, with $2,000 base pay',
			steps: [
				'First tier: $20,000 × 5% = $1,000',
				'Above the threshold: ($30,000 − $20,000) × 8% = $800',
				'Commission: $1,000 + $800 = $1,800',
				'Total earnings: $2,000 base pay + $1,800 commission = $3,800'
			],
			result: 'Your total earnings are $3,800, which is an effective commission rate of 6% on sales.'
		},
		faq: [
			{
				q: 'How do you calculate commission?',
				a: 'Multiply your sales by the commission rate. For $25,000 at 5%, that is 25,000 × 0.05 = $1,250. Add any base pay to get your total earnings.'
			},
			{
				q: 'What is a tiered commission?',
				a: 'It is a plan where the rate changes as your sales grow. You earn the first rate up to a threshold, and a different rate on the sales above it.'
			},
			{
				q: 'Is the higher rate paid on all my sales once I pass the threshold?',
				a: 'Not in this calculator. The higher rate applies only to the part above the threshold. Some employers pay it on everything, so check your plan.'
			},
			{
				q: 'What is an effective commission rate?',
				a: 'It is your total commission divided by your total sales. On a tiered plan, it sits between the lower and the higher rate.'
			},
			{
				q: 'Is commission taxed differently?',
				a: 'It depends on your country. In the US, the IRS treats commissions as wages. Many countries tax commission as normal income. This tool shows pay before tax.'
			},
			{
				q: 'Can I find the sales I need for a target income?',
				a: 'Yes, by trial. Change the sales amount until the total earnings match your goal. For a flat plan, divide the commission you want by the rate.'
			}
		],
		sources: [
			{ title: 'Internal Revenue Service — Publication 15, Employer’s Tax Guide', url: 'https://www.irs.gov/pub/irs-pdf/p15.pdf' }
		],
		disclaimer:
			'Estimates only. Your pay plan, tax and deductions may differ, so check your own agreement. This tool is not financial or legal advice.'
	}
});
