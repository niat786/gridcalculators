import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num } from '../format';
import meta from './tip-calculator.meta';

const ok = (x: number) => Number.isFinite(x);

/** Round to whole cents, so 0.1 + 0.2 style float noise never changes a result. */
const cents = (x: number) => Math.round(x * 100) / 100;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'bill', label: 'Bill amount', type: 'number', default: 50, min: 0, max: 1000000, step: 0.01, prefix: '$' },
		{ id: 'tipPct', label: 'Tip', type: 'number', default: 18, min: 0, max: 100, step: 1, suffix: '%' },
		{ id: 'people', label: 'Number of people', type: 'number', default: 1, min: 1, max: 1000, step: 1, decimal: false },
		{
			id: 'roundUp',
			label: 'Round each share up to the next dollar',
			type: 'toggle',
			default: false,
			help: 'Each person pays a whole dollar amount.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const bill = Number(v.bill);
		const pct = Number(v.tipPct);
		const people = Number(v.people);
		if (!ok(bill) || bill < 0 || !ok(pct) || pct < 0 || !ok(people) || people < 1 || !Number.isInteger(people)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Per person',
				summary: 'Enter a bill, a tip percentage and at least one person.'
			};
		}

		const tip = cents((bill * pct) / 100);
		const total = cents(bill + tip);
		const exactShare = total / people;
		const share = v.roundUp ? Math.ceil(cents(exactShare)) : cents(exactShare);

		return {
			primaryResult: money(share, Boolean(v.roundUp)),
			primaryLabel: people === 1 ? 'Total for you' : 'Each person pays',
			summary: `${num(pct, 2)}% tip on ${money(bill)} for ${num(people, 0)} ${people === 1 ? 'person' : 'people'}.`,
			secondaryMetrics: [
				{ label: 'Tip amount', value: money(tip) },
				{ label: 'Total with tip', value: money(total) },
				{ label: 'Tip per person', value: money(cents(tip / people)) },
				{ label: 'Total per person', value: money(cents(exactShare)) }
			]
		};
	},
	content: {
		intro:
			'Find the tip on a restaurant or service bill, the total you will pay, and how much each person owes when you split it. Enter the bill in any currency you use.',
		howTo: [
			'Enter the bill amount before tax, or the full bill if you prefer.',
			'Set the tip percentage. The default is 18%.',
			'Enter how many people are sharing the bill.',
			'Turn on rounding if you want each share to be a whole number of dollars, euros or other units.'
		],
		about: [
			{
				heading: 'How tipping works in different countries',
				paragraphs: [
					'Tipping customs vary a lot. In the United States and Canada, tipping sit-down restaurant service is normal, and 15% to 20% is a common range. In many other countries, tipping is small or not expected at all.',
					'In parts of Europe, service is often already included in the bill, and guests may round up or leave a few coins. In Japan, tipping is not customary and can even confuse staff. When you are unsure, look for a “service charge” line or ask.'
				]
			},
			{
				heading: 'Tip before or after tax',
				paragraphs: [
					'There is no single rule. In the US, many people tip on the amount before sales tax, and that is the amount this calculator is usually given. Some people tip on the full total instead.',
					'Either choice is fine. Enter the amount you want to tip on in the bill box, so the tip matches your choice. To add sales tax first, the [sales tax calculator](/sales-tax-calculator) gives the total.'
				]
			},
			{
				heading: 'Splitting a bill fairly',
				paragraphs: [
					'Splitting a bill evenly is simple. The total, with tip, is divided by the number of people. Some totals do not divide exactly, so each share may have a cent or two of rounding. Rounding each share up to a whole unit covers those small gaps and keeps payments simple.',
					'Check for a service charge before you add a tip. Many restaurants add one automatically for large groups. Adding a second tip on top can mean paying twice for the same service.'
				]
			},
			{
				heading: 'Working out a tip in your head',
				paragraphs: [
					'Finding 10% is the easiest step. Move the decimal point one place to the left. For an $84.50 bill, 10% is $8.45. For 20%, double that to get $16.90.',
					'For 15%, add half of the 10% amount to the 10% amount. For $84.50, that is $8.45 plus $4.23, which is about $12.68. The [percentage calculator](/percentage-calculator) can check any other percentage.'
				]
			},
			{
				heading: 'Tips for group bills',
				paragraphs: [
					'Decide on the tip before you order, so nobody is surprised. For a large group, you may prefer to pay a fixed amount each rather than a percentage, which is easier to split.',
					'If you are paying for a group and want to split the cost differently, work out each person’s share first. Then add their tip. The [budget calculator](/budget-calculator) helps you plan spending for a trip or a night out.'
				],
				list: [
					'Check the bill for a service charge before you tip.',
					'Round up for a simpler split, and collect the change later.',
					'Keep the tip separate from tax on your receipt, so you can check it.',
					'Use cash for small tips where that is the local custom.'
				]
			}
		],
		formulas: [
			{
				title: 'Tip and total',
				expression: 'Tip = bill × tip % ÷ 100\nTotal = bill + tip',
				variables: [
					{ symbol: 'bill', meaning: 'The bill amount before the tip' },
					{ symbol: 'tip %', meaning: 'The tip as a percentage, for example 18' }
				]
			},
			{
				title: 'Each share',
				expression: 'Share = total ÷ people\nWith rounding on, the share is rounded up to the next whole unit.',
				variables: [{ symbol: 'people', meaning: 'The number of people paying' }]
			}
		],
		example: {
			title: 'A $84.50 bill, a 20% tip, shared by 3 people',
			steps: [
				'Tip: $84.50 × 20 ÷ 100 = $16.90',
				'Total: $84.50 + $16.90 = $101.40',
				'Each share: $101.40 ÷ 3 = $33.80',
				'With rounding on: $33.80 rounds up to $34 per person'
			],
			result: 'Each person pays $33.80, or $34 with rounding on.'
		},
		faq: [
			{
				q: 'Should I tip on the bill before or after tax?',
				a: 'Tipping customs vary. In the US, many people tip on the pre-tax amount, but either choice is common. Use whichever you prefer and adjust the bill amount to match.'
			},
			{
				q: 'What tip percentage is normal?',
				a: 'In the US, 15% to 20% is a common range for sit-down restaurant service, and 18% is a frequent default. Tipping norms differ by country and by type of service.'
			},
			{
				q: 'Why round up each share?',
				a: 'Rounding up gives everyone a whole-unit amount, which makes cash and simple payments easier. The total paid is then a little more than the exact bill.'
			},
			{
				q: 'How do I work out 18% of a bill?',
				a: 'Find 20%, which is double 10%. Then take away 2%, a tenth of 20%, to get 18%. The calculator does this for you.'
			},
			{
				q: 'What if the bill already includes a service charge?',
				a: 'Do not add a second tip on top unless you want to give extra. Read the bill first, then enter the total you still need to pay in the bill box.'
			}
		]
	}
});
