import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, pct } from '../format';
import meta from './vat-calculator.meta';

/** Round to whole cents (or the smallest unit) so the displayed amounts always add up. */
const cents = (n: number) => Math.round(n * 100) / 100;
/** Currency-neutral amount: two decimals, no currency symbol. */
const amt = (n: number) => num(n, 2, 2);

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
				{ label: 'Add VAT', value: 'add' },
				{ label: 'Remove VAT', value: 'remove' }
			]
		},
		{
			id: 'amount',
			label: 'Amount',
			type: 'number',
			default: 250,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			help: 'Net (excluding VAT) in Add VAT mode. Gross (including VAT) in Remove VAT mode.'
		},
		{ id: 'rate', label: 'VAT rate', type: 'number', default: 20, min: 0, max: 100, step: 0.01, suffix: '%' }
	],
	calculate(v): CalculationResult {
		const remove = String(v.mode) === 'remove';
		const label = remove ? 'Net amount (excl. VAT)' : 'Gross amount (incl. VAT)';
		const amount = Number(v.amount);
		const rate = Number(v.rate);

		if (!(amount >= 0) || !Number.isFinite(amount) || !(rate >= 0 && rate <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'Enter an amount of zero or more and a VAT rate from 0% to 100%.'
			};
		}

		if (!remove) {
			const vat = cents((amount * rate) / 100);
			const gross = cents(amount + vat);
			return {
				primaryResult: amt(gross),
				primaryLabel: label,
				summary: `VAT at ${pct(rate)} on a net amount of ${amt(amount)} is ${amt(vat)}.`,
				secondaryMetrics: [
					{ label: 'Net amount', value: amt(amount) },
					{ label: 'VAT', value: amt(vat) }
				]
			};
		}

		const net = cents(amount / (1 + rate / 100));
		const vat = cents(amount - net);
		return {
			primaryResult: amt(net),
			primaryLabel: label,
			summary: `The VAT inside a gross amount of ${amt(amount)} at ${pct(rate)} is ${amt(vat)}.`,
			secondaryMetrics: [
				{ label: 'VAT', value: amt(vat) },
				{ label: 'Gross amount', value: amt(amount) }
			]
		};
	},
	content: {
		intro:
			'Add VAT to a net price, or take the VAT out of a gross price to see the net amount. Enter any VAT rate and this VAT calculator works in any currency.',
		howTo: [
			'Pick Add VAT if you have a price before VAT, or Remove VAT if you have a price that already includes it.',
			'Enter the amount and the VAT rate that applies to the item.',
			'Read the VAT and the gross or net amount in the result.'
		],
		about: [
			{
				heading: 'What is VAT?',
				paragraphs: [
					'VAT stands for value added tax. It is a tax on sales that businesses collect and pass on to the government. Many countries use it, and some call it GST or sales tax. The idea is the same: tax is added at each stage of a sale, and the final buyer bears the cost.',
					'Net means the price before VAT. Gross means the price with VAT included. The buyer pays the gross price, and the seller passes the VAT part to the tax authority.'
				]
			},
			{
				heading: 'How to add and remove VAT',
				paragraphs: [
					'To add VAT, multiply the net price by the rate and add the result. At 20%, that means net × 1.20.',
					'To remove VAT, divide the gross price by one plus the rate. At 20%, that means gross ÷ 1.20. The two steps are exact opposites, so you can use one to check the other.',
					'A common mistake is to take 20% off the gross price. That gives the wrong answer, because the VAT was worked out on the smaller net price. For example, 120.00 at 20% VAT is 100.00 net plus 20.00 VAT. Taking 20% off 120.00 would leave 96.00.'
				]
			},
			{
				heading: 'Which VAT rate should you use?',
				paragraphs: [
					'Each country sets its own rates, and many have a standard rate plus lower rates for some goods. Check your tax authority for the right rate for your item. If an item is zero-rated or exempt, the rate you enter may be 0%. For example, the UK has a 20% standard rate, a 5% reduced rate and a 0% rate, according to GOV.UK.',
					'This tool takes any rate from 0% to 100%. For other taxes, try the [GST calculator](/gst-calculator), the [sales tax calculator](/sales-tax-calculator) or the [GCC VAT calculator](/gcc-vat-calculator).'
				]
			},
			{
				heading: 'Tips for using the results',
				paragraphs: ['Small habits help you avoid errors when you price goods or check an invoice.'],
				list: [
					'Check whether a price is net or gross before you start.',
					'Use the same rate for every line unless the items have different rates.',
					'Round VAT to the smallest currency unit, as the calculator does, so amounts add up.',
					'Keep the net amount, the VAT and the gross amount on your invoice, because buyers and tax offices often ask for all three.',
					'Check the sale price after a markdown with the [discount calculator](/discount-calculator), then add VAT.',
					'Use the [margin calculator](/margin-calculator) to check profit on the net price, not the gross price.'
				]
			}
		],
		formulas: [
			{
				title: 'Adding VAT',
				expression: 'VAT = Net amount × r ÷ 100',
				variables: [
					{ symbol: 'r', meaning: 'VAT rate as a percentage' },
					{ symbol: 'Net amount', meaning: 'amount before VAT' }
				]
			},
			{
				expression: 'Gross amount = Net amount + VAT',
				variables: []
			},
			{
				title: 'Removing VAT',
				expression: 'Net amount = Gross amount ÷ (1 + r ÷ 100)',
				variables: [{ symbol: 'Gross amount', meaning: 'amount that already includes VAT' }]
			},
			{
				expression: 'VAT = Gross amount − Net amount',
				variables: []
			}
		],
		example: {
			title: 'A net amount of 250 with 20% VAT',
			steps: [
				'VAT: 250 × 20 ÷ 100 = 50.00',
				'Gross amount: 250 + 50.00 = 300.00',
				'Check by removing VAT: 300 ÷ 1.20 = 250.00',
				'VAT from the gross amount: 300.00 − 250.00 = 50.00'
			],
			result: 'Gross amount 300.00 including VAT of 50.00.'
		},
		faq: [
			{
				q: 'How do I calculate VAT on a price?',
				a: 'Multiply the net price by the VAT rate and divide by 100. Add the result to the net price to get the gross price. Enter your numbers above to do it for you.'
			},
			{
				q: 'What is the difference between net and gross?',
				a: 'Net is the amount before VAT and gross is the amount with VAT added. Gross is what the buyer pays, and net is what the seller keeps before passing VAT on.'
			},
			{
				q: 'Do shop prices show VAT included or added?',
				a: 'It depends on the country and the type of sale. Many consumer prices include VAT, while business-to-business prices are often shown before VAT. Check the price label.'
			},
			{
				q: 'Why do VAT rates differ between countries?',
				a: 'Each government sets its own VAT rate. Many also apply lower or zero rates to some goods and services, such as food or books.'
			},
			{
				q: 'Can I use this for GST or other sales taxes?',
				a: 'Yes, enter the rate for the tax you need. GST and sales tax can have different rules, so confirm the treatment with your local tax authority.'
			}
		],
		sources: [
			{ title: 'European Commission: Taxation and customs', url: 'https://taxation-customs.ec.europa.eu/' },
			{ title: 'GOV.UK: VAT rates', url: 'https://www.gov.uk/vat-rates' }
		],
		disclaimer:
			'Estimates only. VAT rules and rates vary by country, product and business status, so check official guidance before you invoice or file.'
	}
});
