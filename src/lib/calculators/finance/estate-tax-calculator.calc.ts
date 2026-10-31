import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';

import meta from './estate-tax-calculator.meta';

/** Basic exclusion amount for deaths in 2026 (OBBBA; Rev. Proc. 2025-32). */
export const EXEMPTION_2026 = 15_000_000;
export const ANNUAL_GIFT_EXCLUSION_2026 = 19_000;

/** IRC §2001(c) rate schedule: [over, base tax, rate]. */
const SCHEDULE: [number, number, number][] = [
	[0, 0, 0.18],
	[10_000, 1_800, 0.2],
	[20_000, 3_800, 0.22],
	[40_000, 8_200, 0.24],
	[60_000, 13_000, 0.26],
	[80_000, 18_200, 0.28],
	[100_000, 23_800, 0.3],
	[150_000, 38_800, 0.32],
	[250_000, 70_800, 0.34],
	[500_000, 155_800, 0.37],
	[750_000, 248_300, 0.39],
	[1_000_000, 345_800, 0.4]
];
export function tentativeTax(amount: number): number {
	if (amount <= 0) return 0;
	let row = SCHEDULE[0];
	for (const r of SCHEDULE) if (amount > r[0]) row = r;
	return row[1] + (amount - row[0]) * row[2];
}

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
/** Rates read back from the §2001(c) schedule above, so the text follows the data. */
const TOP_RATE = (tentativeTax(2_000_000) - tentativeTax(1_900_000)) / 100_000;
const START_RATE = tentativeTax(1_000) / 1_000;
const pc = (r: number) => `${Math.round(r * 100)}%`;
/** Same steps as calculate(), for the worked examples in the text. */
function estateTax(gross: number, debts: number, marital: number, charity: number, dsue: number): number {
	const base = gross - debts - marital - charity;
	return Math.max(0, tentativeTax(base) - tentativeTax(EXEMPTION_2026 + dsue));
}
const EX_GROSS = 20_000_000;
const EX_DEBTS = 500_000;
const EX_TAXABLE = EX_GROSS - EX_DEBTS;
const EX_OVER = EX_TAXABLE - EXEMPTION_2026;
const EX_TAX = estateTax(EX_GROSS, EX_DEBTS, 0, 0, 0);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'gross', label: 'Gross estate', type: 'number', default: 20_000_000, min: 0, max: 1e12, prefix: '$', help: 'Everything owned at death: property, investments, retirement accounts, life insurance you owned' },
		{ id: 'debts', label: 'Debts and expenses', type: 'number', default: 500_000, min: 0, max: 1e12, prefix: '$', help: 'Mortgages, loans, funeral and estate administration costs' },
		{ id: 'marital', label: 'Left to a US-citizen spouse', type: 'number', default: 0, min: 0, max: 1e12, prefix: '$' },
		{ id: 'charity', label: 'Left to charity', type: 'number', default: 0, min: 0, max: 1e12, prefix: '$' },
		{ id: 'gifts', label: 'Lifetime taxable gifts', type: 'number', default: 0, min: 0, max: 1e12, prefix: '$', help: 'Gifts above the yearly exclusion made since 1977' },
		{ id: 'dsue', label: 'Unused exemption from a late spouse', type: 'number', default: 0, min: 0, max: 15_000_000, prefix: '$', help: 'Portability (DSUE), if elected on their estate tax return' }
	],
	calculate(v): CalculationResult {
		const [gross, debts, marital, charity, gifts, dsue] = ['gross', 'debts', 'marital', 'charity', 'gifts', 'dsue'].map((k) => Number(v[k]));
		const label = 'Federal estate tax';
		if (![gross, debts, marital, charity, gifts, dsue].every((x) => Number.isFinite(x) && x >= 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter the estate’s values.' };
		}
		const deductions = debts + marital + charity;
		if (deductions > gross) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Deductions can’t be more than the gross estate.' };
		}
		const taxable = gross - deductions;
		const base = taxable + gifts;
		const exemption = EXEMPTION_2026 + dsue;
		const tax = Math.max(0, tentativeTax(base) - tentativeTax(exemption));
		const left = exemption - base;
		return {
			primaryResult: money(tax, true),
			primaryLabel: label,
			summary:
				tax > 0
					? `${money(base - exemption, true)} is above the exemption and taxed at 40%.`
					: `No federal estate tax: ${money(left, true)} of exemption is left unused.`,
			secondaryMetrics: [
				{ label: 'Taxable estate', value: money(taxable, true) },
				{ label: 'Plus lifetime taxable gifts', value: money(base, true) },
				{ label: 'Exemption available', value: money(exemption, true) },
				{ label: 'Amount above exemption', value: money(Math.max(0, base - exemption), true) },
				{ label: 'Effective rate on gross estate', value: pct(gross > 0 ? (tax / gross) * 100 : 0, 2) },
				{ label: 'Left to heirs after tax', value: money(Math.max(0, gross - debts - charity - tax), true) }
			]
		};
	},
	content: {
		intro: `Use this estate tax calculator to estimate the US federal estate tax due on an estate for deaths in 2026. The exemption is ${usd(EXEMPTION_2026)} per person, or ${usd(EXEMPTION_2026 * 2)} for a married couple using portability. Amounts above it are taxed at up to ${pc(TOP_RATE)}.`,
		howTo: [
			'Enter the gross estate: everything the person owned at death, at market value.',
			'Subtract debts, expenses, and anything left to a US-citizen spouse or to charity.',
			'Add lifetime taxable gifts, which use up part of the exemption.',
			'If a spouse died earlier and portability was elected, add their unused exemption.'
		],
		about: [
			{
				heading: 'What is the federal estate tax?',
				paragraphs: [
					'The federal estate tax is a tax on the value of what a person leaves behind at death. The estate pays it before assets pass to heirs, so heirs don’t pay it themselves.',
					'The tax only applies to large estates. Everyone has a lifetime exemption, and tax is due only on the value above it. Because the exemption is so high, most estates owe nothing at the federal level.',
					'The estate includes more than you might expect. It covers property, investments, business interests and life insurance that the person owned. It also covers retirement accounts, such as a [401(k)](/401k-calculator) or an [IRA](/ira-calculator).'
				]
			},
			{
				heading: 'Key estate tax figures for 2026',
				paragraphs: [
					'These are the main numbers the calculator uses. The exemption is the amount that passes free of federal estate tax, but gifts during life can use up part of it.'
				],
				table: {
					caption: 'Federal estate and gift figures, 2026',
					columns: ['Item', 'Amount'],
					rows: [
						['Estate tax exemption (per person)', usd(EXEMPTION_2026)],
						['Married couple, using portability', usd(EXEMPTION_2026 * 2)],
						['Tax rate on the amount above the exemption', pc(TOP_RATE)],
						['Annual gift exclusion (per recipient)', usd(ANNUAL_GIFT_EXCLUSION_2026)]
					]
				}
			},
			{
				heading: 'How the tax is calculated',
				paragraphs: [
					`First, start with the gross estate. Then subtract debts, funeral and administration costs, anything left to a US-citizen spouse (the marital deduction) and anything left to charity. The result is the taxable estate.`,
					`Next, add taxable gifts the person made during life. The law then applies a rate table that runs from ${pc(START_RATE)} to ${pc(TOP_RATE)}. However, the estate gets credit for the exemption, so the bill is the tax on the total minus the tax on the exemption. In practice, this means every dollar above the exemption is taxed at the top rate.`,
					`For example, a ${usd(EX_GROSS)} estate with ${usd(EX_DEBTS)} of debts has a taxable estate of ${usd(EX_TAXABLE)}. That is ${usd(EX_OVER)} over the exemption, so the tax is ${usd(EX_TAX)}.`
				],
				table: {
					caption: 'Sample estates, no lifetime gifts',
					columns: ['Situation', 'Taxable estate', 'Federal estate tax'],
					rows: [
						[`${usd(12_000_000)} estate`, usd(12_000_000), usd(estateTax(12_000_000, 0, 0, 0, 0))],
						[`${usd(EX_GROSS)} estate, ${usd(EX_DEBTS)} of debts`, usd(EX_TAXABLE), usd(EX_TAX)],
						[`${usd(25_000_000)} estate, all left to a US-citizen spouse`, usd(0), usd(estateTax(25_000_000, 0, 25_000_000, 0, 0))],
						[`${usd(28_000_000)} estate, ${usd(EXEMPTION_2026)} unused exemption from a late spouse`, usd(28_000_000), usd(estateTax(28_000_000, 0, 0, 0, EXEMPTION_2026))]
					]
				}
			},
			{
				heading: 'Spouses, portability and gifts',
				paragraphs: [
					'Assets left to a US-citizen spouse are fully deductible. That doesn’t remove the tax, but it delays it until the second spouse dies, when the combined estate may be taxed.',
					'Portability lets a surviving spouse add the first spouse’s unused exemption to their own. However, it must be elected on a timely estate tax return. The calculator’s last box is for that unused amount.',
					`Gifts during life matter too. Each year you can give ${usd(ANNUAL_GIFT_EXCLUSION_2026)} per person without reporting it. Larger gifts are reported, and they reduce your lifetime exemption.`
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: ['This is a federal-only estimate, so several things can change the real result:'],
				list: [
					'**State taxes.** About a dozen states and Washington, D.C. have their own estate tax, often with much lower exemptions. Some states charge an inheritance tax that heirs pay.',
					'**Valuation.** Real estate and business interests need a formal appraisal.',
					'**Gift tax already paid, and non-citizen spouses.** Both change the math and need an adviser.',
					'**Income tax on inherited accounts.** Heirs may owe income tax on retirement money. See the [RMD calculator](/rmd-calculator) and the [income tax calculator](/income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Federal estate tax',
				expression: 'Tax = Tentative tax(Taxable estate + Lifetime gifts) − Tentative tax(Exemption)',
				variables: [
					{ symbol: 'Taxable estate', meaning: 'Gross estate − Debts and expenses − Marital deduction − Charitable deduction' },
					{ symbol: 'Exemption', meaning: `${usd(EXEMPTION_2026)} for 2026, plus any unused exemption from a late spouse (DSUE)` },
					{ symbol: 'Tentative tax', meaning: `the §2001(c) rate schedule, ${pc(START_RATE)} rising to ${pc(TOP_RATE)} above ${usd(1_000_000)}` }
				]
			}
		],
		example: {
			title: `A ${usd(EX_GROSS)} estate with ${usd(EX_DEBTS)} of debts and expenses`,
			steps: [
				`Taxable estate: ${usd(EX_GROSS)} − ${usd(EX_DEBTS)} = ${usd(EX_TAXABLE)}`,
				`Above the exemption: ${usd(EX_TAXABLE)} − ${usd(EXEMPTION_2026)} = ${usd(EX_OVER)}`,
				`Tax: ${usd(EX_OVER)} × ${pc(TOP_RATE)} = ${usd(EX_TAX)}`
			],
			result: `Federal estate tax: ${usd(EX_TAX)}.`
		},
		faq: [
			{
				q: 'How is federal estate tax calculated?',
				a: `Take the gross estate and subtract debts, expenses, and gifts to a spouse or charity. Add lifetime taxable gifts. Then tax the amount above the exemption, which is ${usd(EXEMPTION_2026)} in 2026. The top rate is ${pc(TOP_RATE)}.`
			},
			{
				q: 'What is the federal estate tax exemption for 2026?',
				a: `${usd(EXEMPTION_2026)} per person for deaths in 2026. The One, Big, Beautiful Bill Act made it permanent and indexes it for inflation from 2027. A married couple can shelter ${usd(EXEMPTION_2026 * 2)} with portability.`
			},
			{
				q: 'Do heirs pay the estate tax?',
				a: 'No. The estate pays it before assets are passed on. A few states charge a separate inheritance tax that heirs pay, depending on their relationship to the person who died.'
			},
			{
				q: 'Do gifts during life reduce the exemption?',
				a: `Only gifts above the yearly exclusion (${usd(ANNUAL_GIFT_EXCLUSION_2026)} per recipient in 2026). Larger gifts are reported on Form 709 and use up part of the lifetime exemption.`
			},
			{
				q: 'Does my state have an estate tax?',
				a: 'About a dozen states and Washington, D.C. have their own estate tax, often with much lower exemptions than the federal one. This calculator covers the federal tax only.'
			}
		],
		sources: [
			{ title: 'IRS — Estate tax', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax' },
			{ title: 'IRS — Tax inflation adjustments for tax year 2026', url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill' }
		],
		disclaimer: 'A simplified estimate that ignores gift tax already paid, state taxes and valuation questions. Speak to an estate attorney or tax adviser before planning.'
	}
});
