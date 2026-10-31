import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './zakat-calculator.meta';
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, ZAKAT_RATE, ZAKAT_SOURCES } from '../data/zakat';

const cents = (n: number) => Math.round(n * 100 + 1e-9) / 100;
const asset = (id: string, label: string, def: number, help?: string) =>
	({ id, label, type: 'number', default: def, min: 0, max: 1_000_000_000_000, prefix: '$', help }) as const;

export default defineCalculator({
	meta,
	inputs: [
		asset('cash', 'Cash and bank balances', 20000),
		{ id: 'goldG', label: 'Gold you own', type: 'number', default: 0, min: 0, max: 1_000_000, suffix: 'grams', help: 'Gold held as savings. Scholars differ on jewellery worn regularly, so ask yours.' },
		{ id: 'goldP', label: 'Gold price per gram', type: 'number', default: 770, min: 0, max: 100_000_000, prefix: '$', help: 'Type today’s price in your currency. This tool has no live prices.' },
		{ id: 'silverG', label: 'Silver you own', type: 'number', default: 0, min: 0, max: 10_000_000, suffix: 'grams' },
		{ id: 'silverP', label: 'Silver price per gram', type: 'number', default: 15, min: 0, max: 100_000_000, prefix: '$', help: 'Type today’s price in your currency. This tool has no live prices.' },
		asset('invest', 'Investments and shares', 0, 'Market value of what you hold for investment.'),
		asset('stock', 'Business inventory', 0, 'Goods held for sale, at their market value.'),
		asset('owed', 'Money owed to you', 0, 'Only debts you expect to be repaid.'),
		asset('debts', 'Short-term debts you owe', 0, 'Debts due now or soon, such as this year’s instalments.'),
		{
			id: 'nisab',
			label: 'Nisab based on',
			type: 'select',
			display: 'segmented',
			default: 'silver',
			options: [
				{ label: 'Silver (595 g)', value: 'silver' },
				{ label: 'Gold (85 g)', value: 'gold' }
			],
			help: 'Scholars differ. Silver gives a lower threshold; others use gold.'
		},
		{ id: 'hawl', label: 'Held above nisab for one lunar year', type: 'toggle', default: true }
	],
	calculate(v): CalculationResult {
		const label = 'Zakat due';
		const num_ = (k: string) => Number(v[k]);
		const keys = ['cash', 'goldG', 'goldP', 'silverG', 'silverP', 'invest', 'stock', 'owed', 'debts'];
		if (keys.some((k) => !Number.isFinite(num_(k)) || num_(k) < 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter zero or more in every box (use 0 for none).' };
		}
		const silverBased = String(v.nisab) !== 'gold';
		const price = silverBased ? num_('silverP') : num_('goldP');
		if (!(price > 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: `Enter today’s ${silverBased ? 'silver' : 'gold'} price per gram to find the nisab.` };
		}
		if ((num_('goldG') > 0 && !(num_('goldP') > 0)) || (num_('silverG') > 0 && !(num_('silverP') > 0))) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a price per gram for the gold or silver you own.' };
		}

		const goldValue = num_('goldG') * num_('goldP');
		const silverValue = num_('silverG') * num_('silverP');
		const assets = num_('cash') + goldValue + silverValue + num_('invest') + num_('stock') + num_('owed');
		const net = assets - num_('debts');
		const nisabGrams = silverBased ? NISAB_SILVER_GRAMS : NISAB_GOLD_GRAMS;
		const nisabValue = nisabGrams * price;
		const metrics = [
			{ label: 'Total zakatable assets', value: money(assets) },
			{ label: 'Debts deducted', value: money(num_('debts')) },
			{ label: 'Net zakatable wealth', value: money(net) },
			{ label: `Nisab (${nisabGrams} g of ${silverBased ? 'silver' : 'gold'})`, value: money(nisabValue) },
			{ label: 'Zakat rate', value: pct(ZAKAT_RATE * 100) }
		];

		if (!(net >= nisabValue)) {
			return {
				primaryResult: money(0),
				primaryLabel: label,
				summary: `Your net wealth of ${money(net)} is below the nisab of ${money(nisabValue)}, so no zakat is due.`,
				secondaryMetrics: metrics
			};
		}
		if (!v.hawl) {
			return {
				primaryResult: money(0),
				primaryLabel: label,
				summary: `You are above the nisab, but zakat falls due only after your wealth has stayed at or above it for one lunar year. It would then be ${money(cents(net * ZAKAT_RATE))}.`,
				secondaryMetrics: metrics
			};
		}
		const zakat = cents(net * ZAKAT_RATE);
		return {
			primaryResult: money(zakat),
			primaryLabel: label,
			summary: `${pct(ZAKAT_RATE * 100)} of ${money(net)} net wealth, which is above the nisab of ${money(nisabValue)} (${num(nisabGrams, 0)} g of ${silverBased ? 'silver' : 'gold'}).`,
			secondaryMetrics: metrics
		};
	},
	content: {
		intro: `Use this zakat calculator to estimate the zakat on your wealth. Add up your cash, gold, silver, investments, business stock and money owed to you, subtract the debts you must pay soon, and check the nisab. If you reach it, zakat is ${pct(ZAKAT_RATE * 100)} of your net wealth.`,
		howTo: [
			'Enter your cash and other wealth. For gold and silver, type the grams you own and today’s price per gram.',
			'Enter the short-term debts you owe.',
			'Choose whether the nisab is based on silver or gold. Use the view your own scholar follows.',
			'Keep “held for one lunar year” on if your wealth has stayed above the nisab for that long, then read the zakat due.'
		],
		about: [
			{
				heading: 'What is zakat?',
				paragraphs: [
					'Zakat is a yearly charitable payment that Muslims give from their savings. Also, it is one of the five pillars of Islam. The word comes from an Arabic root linked with purification and growth.',
					`The usual rate is ${pct(ZAKAT_RATE * 100)} of your qualifying wealth. It is due when your wealth is at or above the nisab (the minimum amount) and has been held for one lunar year (the hawl).`
				]
			},
			{
				heading: 'What is the nisab?',
				paragraphs: [
					`The nisab is the threshold that makes zakat due. For example, Islamic Relief gives it as ${NISAB_GOLD_GRAMS} grams of gold or ${NISAB_SILVER_GRAMS} grams of silver. You turn that into money using today’s price per gram, which you type in. This tool has no live prices.`,
					'Scholars differ on which metal to use. The Hanafi school uses silver, which gives a lower threshold. Other schools use gold. Some sources also give slightly different gram weights, so choose the view your own scholar follows.'
				]
			},
			{
				heading: 'What counts as zakatable wealth?',
				paragraphs: ['In general, the following count when you hold them above your needs. Views differ on some of them, so treat this as a guide.'],
				list: [
					'**Cash and bank balances,** including savings.',
					'**Gold and silver** held as savings. Scholars differ on jewellery worn regularly.',
					'**Investments and shares** held for investment, at market value.',
					'**Business inventory** held for sale, at market value.',
					'**Money owed to you** that you expect to get back.'
				]
			},
			{
				heading: 'Which debts can you subtract?',
				paragraphs: [
					'Zakat Foundation of America says that only necessary debts that are due can be deducted. So this calculator takes off the short-term debts you enter, such as bills and this year’s instalments.',
					'A long-term loan, such as a mortgage, is treated differently by different scholars. Some deduct only the instalments due in the year. Others take another view. So if this affects you, ask a scholar.'
				]
			},
			{
				heading: 'Tips for working out your zakat',
				paragraphs: ['A little preparation also makes the calculation easier.'],
				list: [
					'Pick one date each year, such as the start of Ramadan, and total your wealth on that day.',
					'Use the [Hijri date converter](/hijri-date-converter) to find the lunar date of your zakat day.',
					'If you hold money in another currency, convert it with the [currency converter](/currency-converter).',
					'Ask a trusted scholar about pensions, property, jewellery and loans.',
					'For inheritance shares, see the [Islamic inheritance calculator](/islamic-inheritance-calculator). For halal property finance, see the [Islamic home finance calculator](/islamic-home-finance-calculator).'
				]
			}
		],
		formulas: [
			{
				expression: `Net wealth = cash + gold + silver + investments + inventory + money owed − debts due.   Zakat = ${pct(ZAKAT_RATE * 100)} × net wealth, if net wealth ≥ nisab`,
				variables: [
					{ symbol: 'nisab', meaning: `The value of ${NISAB_SILVER_GRAMS} g of silver, or of ${NISAB_GOLD_GRAMS} g of gold, at the price per gram you enter.` },
					{ symbol: 'lunar year', meaning: 'Zakat is due once your wealth has stayed at or above the nisab for one lunar year (about 354 days).' }
				]
			}
		],
		example: {
			title: 'Cash 20,000 in your currency, silver nisab at 15 per gram',
			steps: [
				`Nisab: ${NISAB_SILVER_GRAMS} g × 15 = ${(NISAB_SILVER_GRAMS * 15).toLocaleString('en-US')}.`,
				'Net wealth: 20,000, with no gold, shares or debts. This is above the nisab, so zakat is due.',
				`Zakat: ${pct(ZAKAT_RATE * 100)} × 20,000 = ${(20000 * ZAKAT_RATE).toLocaleString('en-US')}.`
			],
			result: '500.00'
		},
		faq: [
			{
				q: 'How is zakat calculated?',
				a: `Add your zakatable assets, subtract the debts due soon, and compare the total with the nisab. If it is at or above the nisab for a full lunar year, zakat is ${pct(ZAKAT_RATE * 100)} of the net amount.`
			},
			{
				q: 'Should I use the gold or the silver nisab?',
				a: `Scholars differ. The Hanafi school and some charities use silver (${NISAB_SILVER_GRAMS} g), a lower threshold. Other schools use gold (${NISAB_GOLD_GRAMS} g). Choose the view your own scholar follows.`
			},
			{
				q: 'Which debts can I subtract?',
				a: 'Necessary debts that are due now or soon, such as bills and this year’s instalments. Views differ on long loans. Ask a scholar if your situation is unusual.'
			},
			{
				q: 'Does zakat apply to jewellery?',
				a: 'Scholars differ. Some say gold jewellery worn regularly is exempt. Others say zakat is due on it once it reaches the nisab. Ask the scholar you follow. This tool counts the grams you enter.'
			},
			{
				q: 'Does this use live gold and silver prices?',
				a: 'No. Prices change daily and differ by country, so you type today’s price per gram yourself. The numbers it starts with are only examples.'
			}
		],
		sources: ZAKAT_SOURCES,
		disclaimer:
			'A guide only, not a fatwa. Views differ on jewellery, pensions, property and debts, so please consult a trusted scholar about your own circumstances.'
	}
});
