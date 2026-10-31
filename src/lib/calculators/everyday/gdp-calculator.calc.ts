import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './gdp-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'consumption',
			label: 'Consumer spending (C)',
			help: 'Household spending on goods and services. Enter every amount in the same unit, such as billions.',
			type: 'number',
			default: 14000,
			min: 0,
			max: 1000000000,
			step: 1,
			prefix: '$'
		},
		{
			id: 'investment',
			label: 'Business investment (I)',
			help: 'Equipment, buildings, inventories and new housing.',
			type: 'number',
			default: 3500,
			min: 0,
			max: 1000000000,
			step: 1,
			prefix: '$'
		},
		{
			id: 'government',
			label: 'Government spending (G)',
			help: 'Government purchases of goods and services. Leave out transfers such as pensions.',
			type: 'number',
			default: 4000,
			min: 0,
			max: 1000000000,
			step: 1,
			prefix: '$'
		},
		{
			id: 'exports',
			label: 'Exports (X)',
			help: 'Goods and services sold abroad.',
			type: 'number',
			default: 2800,
			min: 0,
			max: 1000000000,
			step: 1,
			prefix: '$'
		},
		{
			id: 'imports',
			label: 'Imports (M)',
			help: 'Goods and services bought from abroad.',
			type: 'number',
			default: 3100,
			min: 0,
			max: 1000000000,
			step: 1,
			prefix: '$'
		}
	],
	calculate(v): CalculationResult {
		const c = Number(v.consumption);
		const i = Number(v.investment);
		const g = Number(v.government);
		const x = Number(v.exports);
		const m = Number(v.imports);
		if ([c, i, g, x, m].some((n) => !Number.isFinite(n) || n < 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Gross domestic product',
				summary: 'Enter each amount as zero or more.'
			};
		}
		const net = x - m;
		const gdp = c + i + g + net;
		if (!(gdp > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Gross domestic product',
				summary: 'GDP must be above zero to work out the shares.'
			};
		}
		const share = (n: number) => pct((n / gdp) * 100, 1);

		const summary =
			net < 0
				? `Imports are larger than exports, so net exports take ${money(-net, true)} off GDP.`
				: net > 0
					? `Exports are larger than imports, so net exports add ${money(net, true)} to GDP.`
					: 'Exports and imports balance, so net exports add nothing to GDP.';

		return {
			primaryResult: money(gdp, true),
			primaryLabel: 'Gross domestic product',
			summary,
			secondaryMetrics: [
				{ label: 'Consumption share', value: share(c) },
				{ label: 'Investment share', value: share(i) },
				{ label: 'Government share', value: share(g) },
				{ label: 'Net exports (X − M)', value: money(net, true) },
				{ label: 'Net exports share', value: share(net) }
			],
			table: {
				title: 'Each part of GDP',
				columns: [
					{ key: 'part', label: 'Component' },
					{ key: 'amount', label: 'Amount', align: 'end' },
					{ key: 'share', label: 'Share of GDP', align: 'end' }
				],
				rows: [
					{ part: 'Consumption (C)', amount: money(c, true), share: share(c) },
					{ part: 'Investment (I)', amount: money(i, true), share: share(i) },
					{ part: 'Government (G)', amount: money(g, true), share: share(g) },
					{ part: 'Exports (X)', amount: money(x, true), share: share(x) },
					{ part: 'Imports (M), subtracted', amount: money(-m, true), share: share(-m) },
					{ part: 'Net exports (X − M)', amount: money(net, true), share: share(net) },
					{ part: 'GDP', amount: money(gdp, true), share: pct(100, 0) }
				]
			}
		};
	},
	content: {
		intro:
			'Work out gross domestic product (GDP) by the expenditure approach. Add up spending on consumption, business investment, government purchases and net exports, and see how much each part contributes. Enter every amount in the same unit, such as billions of your currency.',
		howTo: [
			'Enter consumer spending, business investment and government spending.',
			'Enter exports and imports.',
			'Read GDP, the net exports figure and the share of GDP that each part makes up.',
			'Check the table to see how each part adds to or takes from the total.'
		],
		about: [
			{
				heading: 'What GDP measures',
				paragraphs: [
					'GDP is the total market value of the final goods and services produced inside a country over a set period, usually a quarter or a year. It is the most widely used measure of the size of an economy.',
					'Economists can measure GDP in three ways: by spending, by income or by production. In theory, all three give the same answer. This calculator uses the spending method, which is the most common.'
				]
			},
			{
				heading: 'The four parts of spending',
				paragraphs: [
					'Consumption (C) is what households spend on goods and services, such as food, rent and healthcare. Investment (I) is spending by businesses on equipment, buildings and stock, plus new homes. Government spending (G) covers things the state buys, such as roads, schools and public staff.',
					'Net exports (X − M) is exports minus imports. Exports add to GDP because they are made at home. Imports are subtracted, because they are spent on output made abroad. Transfers such as pensions are not counted in G, because no new goods or services are bought.'
				]
			},
			{
				heading: 'Nominal and real GDP',
				paragraphs: [
					'Nominal GDP uses the prices of the year it was produced. If prices rise, nominal GDP can grow even when the economy produces no more. Real GDP removes that effect, so it is better for comparing years.',
					'Official statistics agencies publish real and nominal figures. When you read a news story about growth, check which one it uses. The [inflation calculator](/inflation-calculator) shows how prices change the value of money over time.'
				]
			},
			{
				heading: 'GDP per person and growth rates',
				paragraphs: [
					'To compare countries of different sizes, economists divide GDP by population. This gives GDP per person, which is a rough average and not a typical income. Growth rates are found by comparing GDP in two periods. If the figures are in different currencies, convert them first with the [currency converter](/currency-converter).',
					'For example, if GDP rises from 20,000 to 21,000, that is growth of 5%. The [percentage calculator](/percentage-calculator) works out this kind of change in one step.'
				]
			},
			{
				heading: 'What GDP does not show',
				paragraphs: [
					'GDP does not show how income is shared between people. A country can grow strongly while many households see little change. It also leaves out most unpaid work, such as caring for children or family members, and much informal activity.',
					'GDP does not measure health, education, the environment or happiness. Other measures, such as life expectancy or household income surveys, can give a fuller picture alongside it.'
				]
			}
		],
		formulas: [
			{
				title: 'Expenditure approach',
				expression: 'GDP = C + I + G + (X − M)',
				variables: [
					{ symbol: 'C', meaning: 'consumer spending by households' },
					{ symbol: 'I', meaning: 'business investment, including housing and inventories' },
					{ symbol: 'G', meaning: 'government purchases of goods and services' },
					{ symbol: 'X', meaning: 'exports' },
					{ symbol: 'M', meaning: 'imports' }
				]
			},
			{
				title: 'Share of GDP',
				expression: 'Share = component ÷ GDP × 100%',
				variables: []
			},
			{
				title: 'Real GDP (for reference)',
				expression: 'Real GDP = nominal GDP ÷ GDP deflator × 100',
				variables: [{ symbol: 'GDP deflator', meaning: 'a price index, set to 100 in the base year' }]
			}
		],
		example: {
			title: 'An economy with C = 14,000, I = 3,500, G = 4,000, X = 2,800 and M = 3,100 (billions)',
			steps: [
				'Add the domestic spending: 14,000 + 3,500 + 4,000 = 21,500',
				'Net exports: 2,800 − 3,100 = −300',
				'GDP: 21,500 + (−300) = 21,200, or $21,200 billion',
				'Consumption share: 14,000 ÷ 21,200 = 66%'
			],
			result: 'GDP of $21,200 (billions), with net exports of −$300.'
		},
		faq: [
			{
				q: 'What is the difference between nominal and real GDP?',
				a: 'Nominal GDP values output at the prices of the year it was produced. Real GDP removes the effect of price changes, so you can compare output across years. Real GDP is nominal GDP divided by a price index (the GDP deflator), multiplied by 100 with the base year set to 100.'
			},
			{
				q: 'Why are imports subtracted?',
				a: 'Consumption, investment and government spending can include goods made abroad. Imports are subtracted so only domestic production counts, and exports are added because they are made at home.'
			},
			{
				q: 'Does GDP count unpaid work or the informal economy?',
				a: 'Not fully. National accounts count market transactions and some estimated values. Unpaid household work and much informal activity are excluded or only partly estimated.'
			},
			{
				q: 'Is GDP the same as wealth or well-being?',
				a: 'No. GDP measures the value of goods and services produced in a period. It does not show how income or wealth is shared, or how healthy or happy people are.'
			},
			{
				q: 'Why does the GDP figure change after it is published?',
				a: 'Statistics agencies revise their estimates as more data arrives. The first figure is an early estimate, so later revisions can be larger or smaller than the first release.'
			}
		],
		sources: [{ title: 'U.S. Bureau of Economic Analysis (BEA), national accounts', url: 'https://www.bea.gov' }]
	}
});
