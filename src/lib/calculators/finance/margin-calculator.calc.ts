import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct } from '../format';
import meta from './margin-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calculate from',
			type: 'select',
			display: 'segmented',
			default: 'price',
			options: [
				{ label: 'Cost and price', value: 'price' },
				{ label: 'Cost and margin', value: 'margin' }
			]
		},
		{
			id: 'cost',
			label: 'Cost per unit',
			type: 'number',
			default: 60,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			prefix: '$'
		},
		{
			id: 'price',
			label: 'Selling price',
			type: 'number',
			default: 100,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			prefix: '$',
			visibleWhen: (v) => v.mode === 'price'
		},
		{
			id: 'margin',
			label: 'Target margin',
			type: 'number',
			default: 40,
			min: 0,
			max: 99.99,
			step: 0.01,
			suffix: '%',
			help: 'Must be below 100%.',
			visibleWhen: (v) => v.mode === 'margin'
		}
	],
	calculate(v): CalculationResult {
		const cost = Number(v.cost);
		const validCost = Number.isFinite(cost) && cost > 0;

		if (String(v.mode) === 'margin') {
			const m = Number(v.margin);
			if (!validCost || !(m >= 0 && m < 100)) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Selling price',
					summary: 'Enter a cost above zero and a margin from 0% up to, but not including, 100%.'
				};
			}
			// Margin = (price − cost) ÷ price, so price = cost ÷ (1 − margin).
			const price = cost / (1 - m / 100);
			const profit = price - cost;
			const markup = (profit / cost) * 100;
			return {
				primaryResult: money(price),
				primaryLabel: 'Selling price',
				summary: `Selling at ${money(price)} keeps ${pct(m)} of each sale as gross margin.`,
				secondaryMetrics: [
					{ label: 'Profit per unit', value: money(profit) },
					{ label: 'Gross margin', value: pct(m) },
					{ label: 'Markup', value: pct(markup) }
				]
			};
		}

		const price = Number(v.price);
		if (!validCost || !Number.isFinite(price) || !(price > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Profit per unit',
				summary: 'Enter a cost above zero and a selling price above zero.'
			};
		}
		const profit = price - cost;
		const margin = (profit / price) * 100;
		const markup = (profit / cost) * 100;
		return {
			primaryResult: money(profit),
			primaryLabel: 'Profit per unit',
			summary: `Each sale earns ${money(profit)}, a ${pct(margin)} margin on the selling price.`,
			secondaryMetrics: [
				{ label: 'Gross margin', value: pct(margin) },
				{ label: 'Markup', value: pct(markup) },
				{ label: 'Selling price', value: money(price) }
			]
		};
	},
	content: {
		intro:
			'Use this margin calculator to find the profit, gross margin and markup on a product from its cost and selling price. You can also work backwards: enter your cost and the margin you want, and get the price to charge.',
		howTo: [
			'Choose whether to start from cost and price, or from cost and a target margin.',
			'Enter your cost per unit.',
			'Enter the selling price, or the margin you want to keep.',
			'Read the profit per unit, the gross margin and the markup (or the price you need to charge).'
		],
		about: [
			{
				heading: 'What is profit margin?',
				paragraphs: [
					'Gross margin is the part of the selling price that you keep as profit, shown as a percentage. If an item sells for $100 and costs you $60, you keep $40. That is a 40% gross margin.',
					'Margin tells you how much of every sale is left after the direct cost of the goods. Then you use that money to pay rent, wages, marketing and other costs.'
				]
			},
			{
				heading: 'Margin and markup are not the same',
				paragraphs: [
					'Margin is profit divided by the selling price, but markup is profit divided by the cost. They use the same profit but a different base, so markup is always the larger number.',
					'This is a common source of pricing mistakes. For example, a 50% markup does not give a 50% margin. Adding 50% to a $60 cost gives $90, and the profit of $30 is only 33.33% of that price.'
				]
			},
			{
				heading: 'Margin and markup side by side',
				paragraphs: [
					'The table below uses a cost of $60. It shows the price you need for each target margin, and also the markup that goes with it.'
				],
				table: {
					caption: 'Cost of $60 per unit',
					columns: ['Target margin', 'Selling price', 'Profit per unit', 'Markup'],
					rows: [
						['20%', '$75.00', '$15.00', '25%'],
						['25%', '$80.00', '$20.00', '33.33%'],
						['30%', '$85.71', '$25.71', '42.86%'],
						['40%', '$100.00', '$40.00', '66.67%'],
						['50%', '$120.00', '$60.00', '100%']
					]
				}
			},
			{
				heading: 'How to set a price from a margin',
				paragraphs: [
					'To reach a target margin, divide your cost by (1 − margin). For a $60 cost and a 40% margin, that is 60 ÷ 0.60 = $100. Do not just add 40% to the cost, because that gives a margin of only 28.57%.',
					'The “cost and margin” option does this for you. However, a margin must be below 100%, since you cannot keep the whole price as profit when you have a cost.'
				]
			},
			{
				heading: 'Tips and limits',
				paragraphs: ['Keep these points in mind, because they affect how you use margin to price a product:'],
				list: [
					'**This is gross margin.** It counts only the direct cost of the item. Overheads such as rent and wages come out of the margin later.',
					'**Include every direct cost.** Add shipping, packaging and any fees you pay per sale.',
					'**Discounts reduce margin fast.** See what a sale does to your price with the [discount calculator](/discount-calculator).',
					'**Taxes are separate.** Sales tax and VAT are not part of your margin. Use the [VAT calculator](/vat-calculator) to add or remove VAT.',
					'**Measure the return on a spend.** For a larger purchase or a project, the [ROI calculator](/roi-calculator) is the better fit.'
				]
			}
		],
		formulas: [
			{
				title: 'Gross margin',
				expression: 'Margin = (Price − Cost) ÷ Price × 100',
				variables: [
					{ symbol: 'Price', meaning: 'selling price per unit' },
					{ symbol: 'Cost', meaning: 'cost per unit' }
				]
			},
			{
				title: 'Markup',
				expression: 'Markup = (Price − Cost) ÷ Cost × 100',
				variables: [{ symbol: 'Price − Cost', meaning: 'profit per unit' }]
			},
			{
				title: 'Price from a target margin',
				expression: 'Price = Cost ÷ (1 − Margin)',
				variables: [{ symbol: 'Margin', meaning: 'target margin as a decimal (40% is 0.40)' }]
			}
		],
		example: {
			title: 'A product costs $60 and sells for $100',
			steps: [
				'Profit: $100 − $60 = $40',
				'Gross margin: $40 ÷ $100 × 100 = 40%',
				'Markup: $40 ÷ $60 × 100 = 66.67%'
			],
			result: 'Profit $40.00 per unit, gross margin 40%, markup 66.67%.'
		},
		faq: [
			{
				q: 'How do you calculate profit margin?',
				a: 'Subtract the cost from the selling price, divide by the selling price, and multiply by 100. For a $60 cost and a $100 price, the margin is 40%.'
			},
			{
				q: 'What is the difference between margin and markup?',
				a: 'Margin is profit as a share of the selling price. Markup is profit as a share of the cost. The same $40 profit on a $60 cost is a 40% margin and a 66.67% markup.'
			},
			{
				q: 'How do I find the selling price for a target margin?',
				a: 'Divide your cost by (1 − the margin as a decimal). For a 25% margin on a $60 cost, the price is 60 ÷ 0.75 = $80.'
			},
			{
				q: 'What is a good profit margin?',
				a: 'It depends on the industry. Some businesses work with thin margins and high volume, and others need high margins to cover costs. Compare with similar businesses and your own costs.'
			},
			{
				q: 'Why can the margin not be 100%?',
				a: 'A 100% margin would mean the whole price is profit, which is only possible with a cost of zero. For any real cost, no price reaches 100%, so the tool accepts margins up to 99.99%.'
			},
			{
				q: 'Is gross margin the same as net margin?',
				a: 'No. Gross margin counts only the cost of the goods. Net margin also subtracts overheads, interest and tax, so it is lower.'
			}
		],
		disclaimer:
			'The result is a simple price and profit calculation. It ignores overheads, tax and other costs, and it is not financial advice.'
	}
});
