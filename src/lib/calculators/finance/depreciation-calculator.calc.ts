import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, plural } from '../format';
import meta from './depreciation-calculator.meta';

const methodOptions = [
	{ label: 'Straight-line', value: 'sl' },
	{ label: 'Double-declining balance', value: 'ddb' },
	{ label: "Sum-of-the-years' digits", value: 'syd' }
];

const METHOD_NAME: Record<string, string> = {
	sl: 'Straight-line depreciation',
	ddb: 'Double-declining balance',
	syd: "Sum-of-the-years' digits"
};

/**
 * Year-by-year depreciation of an asset down to its salvage value.
 * Double-declining balance uses twice the straight-line rate on the book value, switches to
 * straight-line when that gives a larger charge, and never goes below salvage value.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'cost', label: 'Asset cost', type: 'number', default: 20000, min: 0, max: 1_000_000_000, step: 500, prefix: '$', help: 'What the asset cost to put into service.' },
		{ id: 'salvage', label: 'Salvage value', type: 'number', default: 2000, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'Estimated value at the end of its useful life.' },
		{ id: 'life', label: 'Useful life', type: 'number', default: 5, min: 1, max: 100, step: 1, decimal: false, suffix: 'years' },
		{ id: 'method', label: 'Method', type: 'select', display: 'menu', default: 'sl', options: methodOptions }
	],
	calculate(v): CalculationResult {
		const cost = Number(v.cost);
		const salvage = Number(v.salvage);
		const life = Number(v.life);
		const method = String(v.method);

		if (
			!(cost > 0) ||
			!(salvage >= 0) ||
			salvage > cost ||
			!(Number.isInteger(life) && life >= 1 && life <= 100) ||
			!['sl', 'ddb', 'syd'].includes(method)
		) {
			return { primaryResult: DASH, primaryLabel: 'First-year depreciation', summary: 'Check the cost, salvage value (not above cost) and useful life.' };
		}

		const depreciable = cost - salvage;
		const digits = (life * (life + 1)) / 2;
		let book = cost;
		let accumulated = 0;
		const charges: number[] = [];
		const rows: Record<string, string>[] = [];

		for (let t = 1; t <= life; t++) {
			const remainingLife = life - t + 1;
			let charge: number;
			if (method === 'sl') {
				charge = depreciable / life;
			} else if (method === 'ddb') {
				const declining = (book * 2) / life;
				const straight = (book - salvage) / remainingLife;
				charge = Math.min(Math.max(declining, straight), book - salvage);
			} else {
				charge = (depreciable * remainingLife) / digits;
			}
			charge = Math.max(0, Math.min(charge, book - salvage));

			charges.push(charge);
			accumulated += charge;
			book -= charge;
			rows.push({
				year: String(t),
				depreciation: money(charge),
				accumulated: money(accumulated),
				bookValue: money(book)
			});
		}

		return {
			primaryResult: money(charges[0]),
			primaryLabel: 'First-year depreciation',
			summary: `${METHOD_NAME[method]} spreads ${money(depreciable)} of cost over ${plural(life, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Total depreciation', value: money(accumulated) },
				{ label: 'Largest yearly charge', value: money(Math.max(...charges)) },
				{ label: 'Book value at end', value: money(book) }
			],
			table: {
				title: 'Year-by-year schedule',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'depreciation', label: 'Depreciation', align: 'end' },
					{ key: 'accumulated', label: 'Accumulated', align: 'end' },
					{ key: 'bookValue', label: 'Book value', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this depreciation calculator to spread the cost of an asset over its useful life. Choose straight-line, double-declining balance or sum-of-the-years’ digits and get a year-by-year schedule of charges and book value.',
		howTo: [
			'Enter the asset cost, which is what it cost to put the asset into service.',
			'Enter the salvage value, the amount you expect it to be worth at the end of its life. Use 0 if you expect nothing.',
			'Enter the useful life in whole years.',
			'Pick a method, then read the first-year charge and open the schedule for every year.'
		],
		about: [
			{
				heading: 'What is depreciation?',
				paragraphs: [
					'Depreciation is the way a business spreads the cost of an asset over the years it is used. A delivery van or a machine does not lose all its value on day one. So instead of counting the full cost as an expense at once, you share it across its useful life.',
					'The book value is the cost minus the depreciation charged so far. For example, a $20,000 machine that has been charged $7,200 has a book value of $12,800. The charge never takes the book value below the salvage value.'
				]
			},
			{
				heading: 'The three methods',
				paragraphs: ['This calculator offers the three most common methods:'],
				list: [
					'**Straight-line.** The same charge every year: (cost − salvage) ÷ life. It is the simplest method.',
					'**Double-declining balance.** A charge of twice the straight-line rate on the remaining book value each year. It is highest early and falls over time. The tool switches to straight-line in the late years when that charges more, and it stops at the salvage value.',
					'**Sum-of-the-years’ digits.** Each year gets a share of the depreciable cost. The share is the years left divided by the sum of all year numbers (15 for 5 years). It falls steadily.'
				]
			},
			{
				heading: 'How the methods compare',
				paragraphs: [
					'All three methods charge the same total over the asset’s life, but they differ in timing. The table below uses a $20,000 asset, $2,000 salvage and a 5-year life.'
				],
				table: {
					caption: 'Yearly depreciation of a $20,000 asset with $2,000 salvage over 5 years',
					columns: ['Year', 'Straight-line', 'Double-declining', 'Sum-of-the-years’ digits'],
					rows: [
						['1', '$3,600', '$8,000', '$6,000'],
						['2', '$3,600', '$4,800', '$4,800'],
						['3', '$3,600', '$2,880', '$3,600'],
						['4', '$3,600', '$1,728', '$2,400'],
						['5', '$3,600', '$592', '$1,200']
					]
				}
			},
			{
				heading: 'Which method should I use?',
				paragraphs: [
					'Straight-line suits assets that give the same use every year. However, the other two suit assets that lose value or work faster when new, such as vehicles or computers.',
					'Your choice may not be free. Accounting rules and tax rules often set which methods you can use. In the US, tax depreciation follows its own system, and in the UK it uses capital allowances. Ask an accountant before you file anything.'
				]
			},
			{
				heading: 'Related tools',
				paragraphs: [
					'Depreciation shows how an asset’s value falls on paper. Also, to see how long it takes an investment to pay for itself, use the [payback period calculator](/payback-period-calculator). For a property, the [rental property calculator](/rental-property-calculator) shows income and costs. To work out what the asset earns, try the [ROI calculator](/roi-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Straight-line',
				expression: 'Depreciation = (Cost − Salvage) ÷ Life',
				variables: [
					{ symbol: 'Cost', meaning: 'what the asset cost' },
					{ symbol: 'Salvage', meaning: 'expected value at the end of its life' },
					{ symbol: 'Life', meaning: 'useful life in years' }
				]
			},
			{
				title: 'Double-declining balance',
				expression: 'Depreciation = Book value × 2 ÷ Life',
				variables: [{ symbol: 'Book value', meaning: 'cost minus depreciation so far, at the start of the year' }]
			},
			{
				title: 'Sum-of-the-years’ digits',
				expression: 'Depreciation = (Cost − Salvage) × (years left ÷ [Life × (Life + 1) ÷ 2])',
				variables: [{ symbol: 'years left', meaning: 'life remaining at the start of the year, including that year' }]
			}
		],
		example: {
			title: '$10,000 asset, $0 salvage, 5 years, double-declining balance',
			steps: [
				'Rate: 2 ÷ 5 = 40% of book value each year',
				'Year 1: 40% × $10,000 = $4,000, book value $6,000',
				'Year 2: 40% × $6,000 = $2,400, book value $3,600',
				'Year 3: 40% × $3,600 = $1,440, book value $2,160',
				'Year 4: 40% of $2,160 is $864, but straight-line on $2,160 over 2 years is $1,080, which is larger, so switch: $1,080',
				'Year 5: $2,160 − $1,080 = $1,080 left, spread over 1 year: $1,080'
			],
			result: 'Depreciation is $4,000, $2,400, $1,440, $1,080 and $1,080, totalling $10,000, with a book value of $0 at the end.'
		},
		faq: [
			{
				q: 'How do you calculate depreciation?',
				a: 'For straight-line, subtract the salvage value from the cost and divide by the useful life. On a $20,000 asset with $2,000 salvage and a 5-year life, that is $3,600 a year.'
			},
			{
				q: 'What is salvage value?',
				a: 'It is the amount you expect the asset to be worth at the end of its useful life, for example from selling it for scrap or as a used item. It can be zero.'
			},
			{
				q: 'What is the difference between straight-line and double-declining balance?',
				a: 'Straight-line charges the same amount every year. Double-declining balance charges more in the early years and less later. The total over the asset’s life is the same.'
			},
			{
				q: 'What is book value?',
				a: 'Book value is the asset’s cost minus the depreciation charged so far. It is an accounting figure and may differ from the market value.'
			},
			{
				q: 'Can depreciation take the value below salvage value?',
				a: 'No. Each method stops when the book value reaches the salvage value. This calculator also limits the last charge so you never go below it.'
			},
			{
				q: 'Does this calculator work for tax?',
				a: 'It shows standard book depreciation. Tax rules often use different methods and rates. Check your local tax rules or ask an accountant.'
			}
		],
		sources: [
			{ title: 'IFRS Foundation — IAS 16 Property, Plant and Equipment', url: 'https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment.html' },
			{ title: 'Internal Revenue Service — Publication 946, How To Depreciate Property', url: 'https://www.irs.gov/pub/irs-pdf/p946.pdf' }
		],
		disclaimer:
			'Estimates only. Accounting and tax rules differ by country and business. This tool is not accounting, tax or financial advice.'
	}
});
