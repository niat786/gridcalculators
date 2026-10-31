import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct } from '../format';
import meta from './discount-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'price',
			label: 'Original price',
			type: 'number',
			default: 80,
			min: 0,
			max: 100_000_000,
			step: 0.01,
			prefix: '$'
		},
		{
			id: 'discount',
			label: 'Discount (percent off)',
			type: 'number',
			default: 25,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%'
		},
		{
			id: 'second',
			label: 'Second discount',
			type: 'number',
			default: 0,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'Applied to the price after the first discount. Leave at 0 for none.'
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const d1 = Number(v.discount);
		const second = Number(v.second);
		const d2 = Number.isNaN(second) ? 0 : second;

		if (!(price > 0) || !Number.isFinite(price) || !(d1 >= 0 && d1 <= 100) || !(d2 >= 0 && d2 <= 100)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Final price',
				summary: 'Enter an original price above zero and discounts from 0% to 100%.'
			};
		}

		const afterFirst = price * (1 - d1 / 100);
		const final = afterFirst * (1 - d2 / 100);
		const saved = price - final;
		const effective = (saved / price) * 100;

		return {
			primaryResult: money(final),
			primaryLabel: 'Final price',
			summary: `You save ${money(saved)}, an effective discount of ${pct(effective)} off the original price.`,
			secondaryMetrics: [
				{ label: 'After first discount', value: money(afterFirst) },
				{ label: 'You save', value: money(saved) },
				{ label: 'Effective discount', value: pct(effective) }
			]
		};
	},
	content: {
		intro:
			'Use this discount calculator to find the final price after a percent off, and to see how much you save. You can also add a second discount on top, and the tool shows the true combined discount.',
		howTo: [
			'Enter the original price before any discount.',
			'Enter the discount as a percentage off.',
			'If there is a second offer, such as a coupon on a sale price, enter it in the second discount field.',
			'Read the final price, the amount you save and the effective discount.'
		],
		about: [
			{
				heading: 'How a percent discount works',
				paragraphs: [
					'A discount of 25% means you pay 75% of the price. To find the sale price, multiply the original price by (1 − discount ÷ 100). To find how much you save, subtract the sale price from the original price.',
					'For example, an $80 item at 25% off costs $80 × 0.75 = $60. You save $20.'
				]
			},
			{
				heading: 'Quick reference for common discounts',
				paragraphs: [
					'Some percentages come up again and again. The table shows each one on a $100 item, so you can scale it to any price. For example, 20% off a $350 item saves $70.'
				],
				table: {
					caption: 'Common discounts on a $100 item',
					columns: ['Discount', 'You save', 'You pay'],
					rows: [
						['10%', '$10', '$90'],
						['20%', '$20', '$80'],
						['30%', '$30', '$70'],
						['50%', '$50', '$50']
					]
				}
			},
			{
				heading: 'Why two discounts do not add up',
				paragraphs: [
					'The second discount applies to the price after the first one. So it takes a percentage off a smaller number. Taking 25% off and then 10% off is not the same as 35% off.',
					'On an $80 item, 25% off gives $60. Then 10% off $60 is $6, so the final price is $54. You saved $26, which is an effective discount of 32.5%.'
				]
			},
			{
				heading: 'Examples of stacked discounts',
				paragraphs: [
					'The table below shows how much two offers really save. In each case, the effective discount is lower than the two percentages added together.'
				],
				table: {
					caption: 'Effective discount after two offers in a row',
					columns: ['Original price', 'First discount', 'Second discount', 'Final price', 'Effective discount'],
					rows: [
						['$80', '25%', '10%', '$54.00', '32.5%'],
						['$200', '20%', '20%', '$128.00', '36%'],
						['$200', '40%', '0%', '$120.00', '40%']
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The final price is what you pay before tax. The “after first discount” line shows the price between the two offers, which helps when a store applies a sale first and a coupon second.',
					'The effective discount is the number to compare. It tells you the real percentage off the original price, so you can judge two different offers fairly. A higher effective discount always means a lower final price on the same item.'
				]
			},
			{
				heading: 'Tips for shoppers',
				paragraphs: ['A few habits help you spot a real bargain:'],
				list: [
					'**Compare the final price.** A bigger percentage on a higher starting price can cost more than a smaller one on a lower price.',
					'**Check the original price.** A “was” price should be a real earlier price. In the US, the FTC has guidance on deceptive pricing.',
					'**Look at the order of offers.** If two offers apply to the price after the first one, they stack as shown above.',
					'**Add tax and shipping.** Sales tax can be added after the discount. Use the [sales tax calculator](/sales-tax-calculator) where sales tax applies, or the [VAT calculator](/vat-calculator) where VAT applies.',
					'**Need a different percentage?** The [percentage calculator](/percentage-calculator) covers other cases, like finding the percent off from two prices.'
				]
			},
			{
				heading: 'Discounts in business',
				paragraphs: [
					'If you sell goods, discounts cut your profit more than they seem to. Before you offer one, check what is left of your margin with the [margin calculator](/margin-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Final price',
				expression: 'Final = Original × (1 − d₁) × (1 − d₂)',
				variables: [
					{ symbol: 'Original', meaning: 'price before any discount' },
					{ symbol: 'd₁', meaning: 'first discount as a decimal (25% is 0.25)' },
					{ symbol: 'd₂', meaning: 'second discount as a decimal, applied to the reduced price (0 if none)' }
				]
			},
			{
				title: 'Amount saved and effective discount',
				expression: 'Saved = Original − Final;  Effective discount = Saved ÷ Original × 100',
				variables: [{ symbol: 'Effective discount', meaning: 'the combined percentage off the original price' }]
			}
		],
		example: {
			title: 'An $80 item with 25% off, then 10% off the reduced price',
			steps: [
				'First discount: $80 × (1 − 0.25) = $60.00',
				'Second discount: $60 × (1 − 0.10) = $54.00',
				'You save: $80 − $54 = $26.00',
				'Effective discount: $26 ÷ $80 × 100 = 32.5%'
			],
			result: 'Final price $54.00. The effective discount is 32.5%, not 35%.'
		},
		faq: [
			{
				q: 'How do you calculate a discount?',
				a: 'Multiply the original price by the discount percentage divided by 100. That is the amount you save. Subtract it from the original price to get the final price.'
			},
			{
				q: 'How do you calculate a 20% discount?',
				a: 'Multiply the price by 0.80 to get the final price. For $200, that is $160. You save $40.'
			},
			{
				q: 'Why is 20% off plus 20% off not 40% off?',
				a: 'The second 20% is taken from the already reduced price. On $200, the first discount leaves $160. The second takes $32 off, so the final price is $128, which is 36% off.'
			},
			{
				q: 'How do I find the original price from the sale price?',
				a: 'Divide the sale price by (1 − discount). If a $60 sale price is 25% off, the original was 60 ÷ 0.75 = $80.'
			},
			{
				q: 'Does the order of two discounts matter?',
				a: 'No. Percentage discounts multiply, so 25% then 10% gives the same final price as 10% then 25%. The effective discount is the same either way.'
			},
			{
				q: 'Does this include tax?',
				a: 'No. It shows the price before sales tax or VAT. Add tax after the discount if it applies where you shop.'
			}
		],
		sources: [
			{ title: 'U.S. eCFR — 16 CFR Part 233, Guides Against Deceptive Pricing', url: 'https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-233' }
		],
		disclaimer:
			'The result is a simple price calculation. Store rules, taxes and rounding may change the price you pay.'
	}
});
