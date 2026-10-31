import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './pakistan-property-tax-calculator.meta';
import {
	PK_CGT_AFTER_JULY_2024,
	PK_CGT_BEFORE_JULY_2024,
	PK_CGT_SOURCES,
	PK_PROPERTY_SOURCES,
	PK_RATE_236C_ATL,
	PK_RATE_236K_ATL,
	PK_TAX_YEAR_LABEL,
	PK_TAX_YEAR_PERIOD
} from '../data/pk-tax-2027';

const rs = (n: number) => money(n, true);
/** Content is written at build time, so format rupees explicitly. */
const pkr = (n: number) => moneyIn('PKR', n, true);
const MAX = 1_000_000_000_000;

/** Capital gain rate for a seller on the ATL. `years` is the holding period; (1,2] counts as "over 1 to 2 years". */
export function pkCgtRate(acquired: string, type: string, years: number): number {
	if (acquired === 'after') return PK_CGT_AFTER_JULY_2024;
	const table = PK_CGT_BEFORE_JULY_2024[type as 'plot' | 'house' | 'flat'];
	if (years > 6) return 0;
	const idx = Math.max(0, Math.ceil(years) - 1);
	return table[idx];
}

const inputs: CalculatorInput[] = [
	{
		id: 'mode',
		label: 'Transaction',
		type: 'select',
		default: 'buy',
		options: [
			{ label: 'Buying (236K)', value: 'buy' },
			{ label: 'Selling (236C)', value: 'sell' }
		],
		display: 'segmented'
	},
	{
		id: 'status',
		label: 'Your tax status',
		type: 'select',
		default: 'atl',
		options: [
			{ label: 'On the Active Taxpayers List (filer)', value: 'atl' },
			{ label: 'Late filer (on the ATL)', value: 'late' }
		],
		display: 'segmented',
		help: 'People not on the ATL (non-filers) pay higher rates that are not included here.'
	},
	{
		id: 'value',
		label: 'Property value',
		type: 'number',
		default: 20_000_000,
		min: 0,
		max: MAX,
		step: 100_000,
		prefix: '$',
		decimal: false,
		help: 'Fair market value when buying; sale consideration when selling.'
	},
	{ id: 'cgt', label: 'Also work out capital gains tax', type: 'toggle', default: false, visibleWhen: (v) => v.mode === 'sell' },
	{
		id: 'cost',
		label: 'What you paid (cost)',
		type: 'number',
		default: 15_000_000,
		min: 0,
		max: MAX,
		step: 100_000,
		prefix: '$',
		decimal: false,
		visibleWhen: (v) => v.mode === 'sell' && v.cgt === true,
		help: 'Purchase price plus costs allowed against the gain.'
	},
	{
		id: 'acquired',
		label: 'Acquired',
		type: 'select',
		default: 'after',
		options: [
			{ label: 'On or after 1 July 2024', value: 'after' },
			{ label: 'On or before 30 June 2024', value: 'before' }
		],
		display: 'segmented',
		visibleWhen: (v) => v.mode === 'sell' && v.cgt === true
	},
	{
		id: 'ptype',
		label: 'Property type',
		type: 'select',
		default: 'plot',
		options: [
			{ label: 'Open plot', value: 'plot' },
			{ label: 'Constructed property', value: 'house' },
			{ label: 'Flat', value: 'flat' }
		],
		display: 'segmented',
		visibleWhen: (v) => v.mode === 'sell' && v.cgt === true && v.acquired === 'before'
	},
	{
		id: 'years',
		label: 'Holding period',
		type: 'number',
		default: 3,
		min: 0,
		max: 100,
		step: 0.5,
		suffix: 'years',
		visibleWhen: (v) => v.mode === 'sell' && v.cgt === true && v.acquired === 'before'
	}
];

function calculate(v: InputValues): CalculationResult {
	const buy = v.mode === 'buy';
	const label = buy ? 'Advance tax on purchase (236K)' : 'Advance tax on sale (236C)';
	const value = Number(v.value);
	if (!Number.isFinite(value) || value < 0 || value > MAX) {
		return { primaryResult: DASH, primaryLabel: label, summary: 'Enter the property value as zero or more.' };
	}
	if (v.status !== 'atl' && v.status !== 'late') {
		return { primaryResult: DASH, primaryLabel: label, summary: 'Choose your tax status.' };
	}

	const rate = buy ? PK_RATE_236K_ATL : PK_RATE_236C_ATL;
	const advance = value * rate;

	let cgt = 0;
	let cgtRate = 0;
	let gain = 0;
	const withCgt = !buy && v.cgt === true;
	if (withCgt) {
		const cost = Number(v.cost);
		const years = Number(v.years);
		if (!Number.isFinite(cost) || cost < 0 || cost > MAX) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter what you paid as zero or more.' };
		}
		if (v.acquired === 'before' && (!Number.isFinite(years) || years < 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter the holding period in years.' };
		}
		if (v.acquired !== 'before' && v.acquired !== 'after') {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Choose when the property was acquired.' };
		}
		gain = Math.max(0, value - cost);
		cgtRate = pkCgtRate(String(v.acquired), String(v.ptype), years);
		cgt = gain * cgtRate;
	}
	const total = advance + cgt;

	const summary = buy
		? `Buyers on the ATL pay a flat ${pct(rate * 100)} of the property value for ${PK_TAX_YEAR_LABEL}, whatever the value.`
		: withCgt
			? `Sellers on the ATL pay a flat ${pct(rate * 100)} advance tax on ${rs(value)}${gain > 0 ? `, plus ${pct(cgtRate * 100)} capital gains tax on a gain of ${rs(gain)}` : ', and there is no gain to tax'}.`
			: `Sellers on the ATL pay a flat ${pct(rate * 100)} of the sale value for ${PK_TAX_YEAR_LABEL}, whatever the value.`;

	return {
		primaryResult: rs(advance),
		primaryLabel: label,
		summary,
		secondaryMetrics: [
			{ label: 'Advance tax rate', value: pct(rate * 100) },
			{ label: 'Value taxed', value: rs(value) },
			{ label: 'Capital gain', value: withCgt ? rs(gain) : 'Not included' },
			{ label: 'Capital gains tax rate', value: withCgt ? pct(cgtRate * 100) : 'Not included' },
			{ label: 'Capital gains tax', value: withCgt ? rs(cgt) : 'Not included' },
			{ label: withCgt ? 'Advance tax + capital gains tax' : 'Total tax shown', value: rs(total) }
		]
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Use this Pakistan property tax calculator to work out FBR advance tax when you buy (section 236K) or sell (section 236C) property. It uses ${PK_TAX_YEAR_LABEL} rates (${PK_TAX_YEAR_PERIOD}). It covers people on the Active Taxpayers List and can add an estimate of capital gains tax on a sale.`,
		howTo: [
			'Choose buying or selling, and your tax status.',
			'Enter the property value: the fair market value when buying, or the sale price when selling.',
			'To add capital gains tax on a sale, switch it on. Then enter your cost, when you acquired the property and, for older purchases, the type and holding period.',
			'Read the advance tax and, if selected, the capital gains tax.'
		],
		about: [
			{
				heading: 'What are sections 236K and 236C?',
				paragraphs: [
					'Section 236K is an advance income tax that a buyer pays when a property is registered. Section 236C is an advance tax that a seller pays on the sale or transfer. “Advance” means it is collected up front, as a payment toward your income tax.',
					`This tool is for people on the Active Taxpayers List (ATL), which is the list of filers. For ${PK_TAX_YEAR_LABEL}, the Finance Act 2026 sets one rate for each section, whatever the value.`
				]
			},
			{
				heading: `Advance tax rates for ${PK_TAX_YEAR_LABEL}`,
				paragraphs: [
					'KPMG’s brief of the Finance Act 2026 describes a single rate for each section, irrespective of the value. It also says that Rule 1A of the Tenth Schedule is omitted, so late filers now face the same rates as other filers on the ATL.'
				],
				table: {
					caption: `Advance tax for filers on the ATL, ${PK_TAX_YEAR_LABEL}`,
					columns: ['Section', 'Who pays', 'Rate'],
					rows: [
						['236K', 'Buyer, on the fair market value', pct(PK_RATE_236K_ATL * 100)],
						['236C', 'Seller, on the sale consideration', pct(PK_RATE_236C_ATL * 100)]
					]
				}
			},
			{
				heading: 'Not on the Active Taxpayers List?',
				paragraphs: [
					'People who are not on the ATL, called non-filers, pay higher rates. This calculator does not cover them. Sources give conflicting figures, and we do not show a number we cannot confirm.',
					'If you are a non-filer, ask the FBR or a tax adviser for the current rate before a transaction. Capital gains tax for sellers who are not on the ATL is also not included.'
				]
			},
			{
				heading: 'Capital gains tax on property',
				paragraphs: [
					`Capital gains tax (section 37) applies to the profit when you sell. For property acquired on or after 1 July 2024, the rate for ATL sellers is a flat ${pct(PK_CGT_AFTER_JULY_2024 * 100, 0)} of the gain, whatever the holding period.`,
					'For property acquired on or before 30 June 2024, the rate falls with the holding period. After six years, it is nil. The table shows the rates by property type.'
				],
				table: {
					caption: 'Rates for property acquired on or before 30 June 2024',
					columns: ['Holding period', 'Open plot', 'Constructed property', 'Flat'],
					rows: ['Up to 1 year', 'Over 1 to 2 years', 'Over 2 to 3 years', 'Over 3 to 4 years', 'Over 4 to 5 years', 'Over 5 to 6 years'].map((label, i) => [
						label,
						pct(PK_CGT_BEFORE_JULY_2024.plot[i] * 100),
						pct(PK_CGT_BEFORE_JULY_2024.house[i] * 100),
						pct(PK_CGT_BEFORE_JULY_2024.flat[i] * 100)
					])
				}
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It leaves out provincial stamp duty, capital value tax and registration fees. They vary by province. It also does not net the advance tax against the capital gains tax, so ask an adviser how any credit applies.',
					'For your salary tax, see the [Pakistan salary tax calculator](/pakistan-salary-tax-calculator). To compare a purchase with renting, try the [rent vs buy calculator](/rent-vs-buy-calculator). For a home loan, see the [mortgage calculator](/mortgage-calculator) or the [Islamic home finance calculator](/islamic-home-finance-calculator). For money sent from abroad, the [currency converter](/currency-converter) shows mid-market rates.'
				]
			}
		],
		formulas: [
			{
				title: `Advance tax, ${PK_TAX_YEAR_LABEL} (Finance Act 2026), people on the ATL`,
				expression: `Purchase (236K): ${pct(PK_RATE_236K_ATL * 100)} × fair market value · Sale (236C): ${pct(PK_RATE_236C_ATL * 100)} × consideration`,
				variables: [
					{ symbol: 'One rate', meaning: 'Each section has a single rate, irrespective of the value.' },
					{ symbol: 'Late filers', meaning: 'Rule 1A of the Tenth Schedule is omitted, so late filers on the ATL pay the same rates.' }
				]
			},
			{
				title: 'Capital gains tax (section 37), sellers on the ATL',
				expression: 'Gain = sale value − cost · Tax = gain × rate',
				variables: [
					{ symbol: 'Acquired on or after 1 July 2024', meaning: `Flat ${pct(PK_CGT_AFTER_JULY_2024 * 100, 0)}, whatever the holding period.` },
					{ symbol: 'Acquired on or before 30 June 2024', meaning: `Open plot: ${PK_CGT_BEFORE_JULY_2024.plot.map((r) => pct(r * 100)).join(', ')} for each year of holding up to 6 years, then 0%. Constructed property: ${PK_CGT_BEFORE_JULY_2024.house.map((r) => pct(r * 100)).join(', ')}, then 0%. Flat: ${PK_CGT_BEFORE_JULY_2024.flat.map((r) => pct(r * 100)).join(', ')}, then 0%.` }
				]
			}
		],
		example: {
			title: `Buying a property worth ${pkr(20_000_000)} as a filer`,
			steps: [`Rate on purchase for people on the ATL: ${pct(PK_RATE_236K_ATL * 100)}.`, `Tax: 20,000,000 × ${pct(PK_RATE_236K_ATL * 100)} = ${pkr(20_000_000 * PK_RATE_236K_ATL)}.`],
			result: `Advance tax of ${pkr(20_000_000 * PK_RATE_236K_ATL)}.`
		},
		faq: [
			{ q: 'How much is property tax in Pakistan for filers?', a: `For ${PK_TAX_YEAR_LABEL}, buyers on the ATL pay ${pct(PK_RATE_236K_ATL * 100)} of the fair market value under section 236K. Sellers on the ATL pay ${pct(PK_RATE_236C_ATL * 100)} of the sale value under section 236C. Provincial charges are extra.` },
			{ q: 'Are late filers taxed differently?', a: 'Not for tax year 2027. Rule 1A of the Tenth Schedule is omitted, so late filers on the ATL face the same rates as other filers.' },
			{ q: 'Does this cover non-filers?', a: 'No. People who are not on the Active Taxpayers List pay higher rates. Sources give conflicting figures, so we do not show them. Ask the FBR or a tax adviser.' },
			{ q: 'Is capital gains tax the same as advance tax?', a: 'No. Advance tax is collected at registration on the whole value. Capital gains tax is charged on the profit. This tool shows both side by side and does not net one against the other.' },
			{ q: 'What is not included?', a: 'Rates for people not on the ATL, capital gains tax for sellers not on the ATL, provincial stamp duty, capital value tax, registration fees and other local charges, which vary by province.' }
		],
		sources: [...PK_PROPERTY_SOURCES, ...PK_CGT_SOURCES.slice(1)],
		disclaimer: 'Estimate only. Rates and valuations change; confirm the amount with FBR or your registrar before a transaction.'
	}
});
