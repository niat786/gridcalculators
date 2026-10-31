import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct } from '../format';
import meta from './sales-tax-calculator.meta';

/** Round to whole cents so the displayed amounts always add up. */
const cents = (n: number) => Math.round(n * 100) / 100;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calculation',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Add tax', value: 'add' },
				{ label: 'Remove tax', value: 'remove' }
			]
		},
		{
			id: 'amount',
			label: 'Price',
			type: 'number',
			default: 100,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			prefix: '$',
			help: 'Before tax in Add tax mode. Including tax in Remove tax mode.'
		},
		{ id: 'rate', label: 'Sales tax rate', type: 'number', default: 8, min: 0, max: 100, step: 0.01, suffix: '%' }
	],
	calculate(v): CalculationResult {
		const remove = String(v.mode) === 'remove';
		const label = remove ? 'Net price (before tax)' : 'Total with tax';
		const amount = Number(v.amount);
		const rate = Number(v.rate);

		if (!(amount >= 0) || !Number.isFinite(amount) || !(rate >= 0 && rate <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Enter a price of zero or more and a tax rate from 0% to 100%.'
			};
		}

		if (!remove) {
			const tax = cents((amount * rate) / 100);
			const total = cents(amount + tax);
			return {
				primaryResult: money(total),
				primaryLabel: label,
				summary: `${money(tax)} of sales tax on ${money(amount)} at ${pct(rate)}.`,
				secondaryMetrics: [
					{ label: 'Net price', value: money(amount) },
					{ label: 'Sales tax', value: money(tax) }
				]
			};
		}

		const net = cents(amount / (1 + rate / 100));
		const tax = cents(amount - net);
		return {
			primaryResult: money(net),
			primaryLabel: label,
			summary: `${money(tax)} of sales tax is included in ${money(amount)} at ${pct(rate)}.`,
			secondaryMetrics: [
				{ label: 'Sales tax', value: money(tax) },
				{ label: 'Total with tax', value: money(amount) }
			]
		};
	},
	content: {
		intro: 'Use this sales tax calculator to work out the tax on a price, or to find the price before tax when you only know the total. Switch modes, enter a rate, and read the result.',
		howTo: [
			'Pick Add tax if you have a price before tax, or Remove tax if you have a total that already includes it.',
			'Enter the price and the sales tax rate that applies where you are buying or selling.',
			'Read the tax amount and the total or net price in the result.'
		],
		about: [
			{
				heading: 'What is sales tax?',
				paragraphs: [
					'Sales tax is a tax added to the price of goods and some services when you buy them. The seller collects it and passes it to the government. The rate is a percentage of the price.',
					'The United States and Canada use sales taxes in many places, and rates can differ by state, province or city. Many other countries use a value-added tax (VAT) or a goods and services tax (GST) instead. The maths is the same, but the rules differ.'
				]
			},
			{
				heading: 'How to add sales tax to a price',
				paragraphs: [
					'To add tax, multiply the price before tax by the rate. Then add that tax to the price. For example, $250 at 7.5% has tax of $18.75, so the total is $268.75.',
					'The calculator rounds the tax to the nearest cent, so the amounts you see always add up.'
				],
				table: {
					caption: 'A $100 price at common rates',
					columns: ['Sales tax rate', 'Tax', 'Total'],
					rows: [
						['5%', '$5.00', '$105.00'],
						['7%', '$7.00', '$107.00'],
						['8%', '$8.00', '$108.00'],
						['10%', '$10.00', '$110.00']
					]
				}
			},
			{
				heading: 'How to remove sales tax from a total',
				paragraphs: [
					'Sometimes you only know the total with tax, such as on a receipt. In that case, divide the total by 1 plus the rate. A $107 total at a 7% rate gives $107 ÷ 1.07 = $100.00 before tax.',
					'Don’t just subtract the rate from the total. Taking 7% off $107 gives $99.51, which is wrong because the tax was added to the smaller price, not the larger one.'
				]
			},
			{
				heading: 'Things that change the sales tax you pay',
				paragraphs: ['The rate on your receipt can differ from the headline rate. Check these points:'],
				list: [
					'**Combined rates.** Several levels of government can each add a rate. The total at your address is what counts.',
					'**Exempt goods.** Some places charge no tax, or a lower one, on items such as basic food or medicine.',
					'**Discounts and coupons.** Some rules tax the price after a store discount. Use the [discount calculator](/discount-calculator) to find the sale price first.',
					'**VAT and GST countries.** If you shop where VAT applies, try the [VAT calculator](/vat-calculator) or the [GST calculator](/gst-calculator). Canadian shoppers can use the [Canada sales tax calculator](/canada-sales-tax-calculator).'
				]
			},
			{
				heading: 'Tips for shoppers and sellers',
				paragraphs: ['This calculator is handy in a few everyday situations:'],
				list: [
					'**Budgeting a purchase.** Add the tax to the sticker price before you decide if you can afford it.',
					'**Checking a receipt.** Remove the tax from a total to see if the pre-tax price matches the shelf price.',
					'**Setting prices.** If you sell goods, work out the tax-inclusive price your customers will see.',
					'**Splitting costs.** Divide a taxed total fairly by working out each person’s pre-tax share first. The [percentage calculator](/percentage-calculator) can help.'
				]
			}
		],
		formulas: [
			{
				title: 'Adding tax',
				expression: 'Tax = Net price × r ÷ 100',
				variables: [
					{ symbol: 'r', meaning: 'sales tax rate as a percentage' },
					{ symbol: 'Net price', meaning: 'price before tax' }
				]
			},
			{
				expression: 'Total = Net price + Tax',
				variables: []
			},
			{
				title: 'Removing tax',
				expression: 'Net price = Total ÷ (1 + r ÷ 100)',
				variables: [{ symbol: 'Total', meaning: 'price that already includes tax' }]
			},
			{
				expression: 'Tax = Total − Net price',
				variables: []
			}
		],
		example: {
			title: 'A $250 purchase with 7.5% sales tax',
			steps: [
				'Tax: $250 × 7.5 ÷ 100 = $18.75',
				'Total: $250 + $18.75 = $268.75',
				'Check by removing tax: $268.75 ÷ 1.075 = $250.00',
				'Tax from the total: $268.75 − $250.00 = $18.75'
			],
			result: 'Total with tax $268.75. Sales tax $18.75.'
		},
		faq: [
			{
				q: 'How do I calculate sales tax?',
				a: 'Multiply the price by the tax rate as a decimal. For example, 8% of $100 is $100 × 0.08 = $8. Add that to the price to get the total of $108.'
			},
			{
				q: 'Is sales tax added before or after a discount?',
				a: 'It depends on where you are. In many places sales tax applies to the price after a store discount, but manufacturer coupons can be treated differently. Check your local rules before you price goods.'
			},
			{
				q: 'Why does the net price look a cent off when I remove tax?',
				a: 'Tax is rounded to the nearest cent, and the net price is worked back from the total. A one-cent difference is normal rounding, not a mistake.'
			},
			{
				q: 'Where do I find the right sales tax rate?',
				a: 'Sales tax can be set by the state, county and city together, so the combined rate for your address is what applies. Your local tax authority publishes these rates.'
			},
			{
				q: 'Is sales tax the same as VAT?',
				a: 'No. Sales tax is charged once at the point of sale, while VAT is charged at each stage of production and sale. Use the VAT calculator for VAT-based prices.'
			}
		],
		sources: [
			{ title: 'Tax Foundation', url: 'https://taxfoundation.org/' }
		],
		disclaimer: 'Estimates only. Sales tax rules and rates vary by location and product, so confirm the rate with your local tax authority.'
	}
});
