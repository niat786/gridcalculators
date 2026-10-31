import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn } from '../format';
import { ADDL_MEDICARE_THRESHOLD, brackets, federalTax, IRS_TAX_SOURCE, STANDARD_DEDUCTION, TAX_YEAR, type FilingStatus } from '../data/us-tax-2026';

import meta from './marriage-tax-calculator.meta';

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;
const BR_SINGLE = brackets('single');
const BR_MFJ = brackets('mfj');
/** First bracket where the joint range is not simply double the single range. */
const GAP = BR_MFJ.findIndex((b, i) => b.from !== 2 * BR_SINGLE[i].from);
/** Same steps as calculate(), standard deduction, no pre-tax contributions; the first partner claims any children. */
function compare(a: number, b: number, kids: number) {
	const solo = (income: number, children: number) =>
		federalTax({ status: children > 0 ? 'hoh' : 'single', income, adjustments: 0, itemized: 0, seniors: 0, children });
	const ta = solo(a, kids);
	const tb = solo(b, 0);
	const joint = federalTax({ status: 'mfj', income: a + b, adjustments: 0, itemized: 0, seniors: 0, children: kids });
	return { ta, tb, joint, single: ta.tax + tb.tax, diff: joint.tax - (ta.tax + tb.tax) };
}
const verdict = (diff: number) => (diff > 0.5 ? `Penalty of ${usd(diff)}` : diff < -0.5 ? `Bonus of ${usd(-diff)}` : 'No difference');
const row = (label: string, a: number, b: number, kids: number) => {
	const c = compare(a, b, kids);
	return [label, usd(c.single), usd(c.joint.tax), verdict(c.diff)];
};
const EX = compare(100_000, 20_000, 0);
const sliceText = (slices: { rate: number; taxed: number }[]) =>
	slices.filter((s) => s.taxed > 0).map((s) => `${pc(s.rate)} × ${usd(s.taxed)}`).join(' + ');

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'a', label: 'Your income', type: 'number', default: 100000, min: 0, max: 100_000_000, prefix: '$', width: 'half' },
		{ id: 'b', label: 'Partner’s income', type: 'number', default: 20000, min: 0, max: 100_000_000, prefix: '$', width: 'half' },
		{ id: 'adjA', label: 'Your pre-tax contributions', type: 'number', default: 0, min: 0, max: 10_000_000, prefix: '$', width: 'half', help: '401(k), IRA, HSA' },
		{ id: 'adjB', label: 'Partner’s pre-tax contributions', type: 'number', default: 0, min: 0, max: 10_000_000, prefix: '$', width: 'half' },
		{ id: 'kids', label: 'Children under 17', type: 'number', default: 0, min: 0, max: 15, decimal: false },
		{
			id: 'claim',
			label: 'If unmarried, children are claimed by',
			type: 'select',
			default: 'a',
			display: 'segmented',
			options: [
				{ label: 'You', value: 'a' },
				{ label: 'Partner', value: 'b' }
			],
			visibleWhen: (v) => Number(v.kids) > 0
		}
	],
	calculate(v): CalculationResult {
		const a = Number(v.a);
		const b = Number(v.b);
		const adjA = Number(v.adjA);
		const adjB = Number(v.adjB);
		const kids = Number(v.kids);
		const label = 'Marriage penalty or bonus';
		if (![a, b, adjA, adjB, kids].every((x) => Number.isFinite(x) && x >= 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter both incomes.' };
		}
		const claimA = String(v.claim) !== 'b';
		const one = (income: number, adj: number, children: number) => {
			const status: FilingStatus = children > 0 ? 'hoh' : 'single';
			return federalTax({ status, income, adjustments: Math.min(adj, income), itemized: 0, seniors: 0, children }).tax;
		};
		const taxA = one(a, adjA, claimA ? kids : 0);
		const taxB = one(b, adjB, claimA ? 0 : kids);
		const single = taxA + taxB;
		const joint = federalTax({ status: 'mfj', income: a + b, adjustments: Math.min(adjA, a) + Math.min(adjB, b), itemized: 0, seniors: 0, children: kids }).tax;
		const diff = joint - single;
		const fmt = (x: number) => (x < 0 ? `−${money(-x, true)}` : money(x, true));
		return {
			primaryResult: money(Math.abs(diff), true),
			primaryLabel: diff > 0.5 ? 'Marriage penalty' : diff < -0.5 ? 'Marriage bonus' : label,
			summary:
				diff > 0.5
					? `Filing jointly costs ${money(diff, true)} more in federal tax than filing as two unmarried people.`
					: diff < -0.5
						? `Filing jointly saves ${money(-diff, true)} in federal tax compared with filing as two unmarried people.`
						: 'Marriage makes no difference to your federal income tax.',
			secondaryMetrics: [
				{ label: 'Tax if married (jointly)', value: fmt(joint) },
				{ label: 'Tax if unmarried (total)', value: fmt(single) },
				{ label: `Your tax unmarried (${claimA && kids > 0 ? 'head of household' : 'single'})`, value: fmt(taxA) },
				{ label: `Partner’s tax unmarried (${!claimA && kids > 0 ? 'head of household' : 'single'})`, value: fmt(taxB) }
			]
		};
	},
	content: {
		intro: `Use this marriage tax calculator to compare your ${TAX_YEAR} US federal income tax as a married couple filing jointly with what you would pay as two unmarried people. It shows whether marriage creates a tax penalty or a bonus for you.`,
		howTo: [
			'Enter each partner’s yearly income.',
			'Add any pre-tax retirement or HSA contributions for each partner.',
			'Enter the number of children under 17, and who would claim them if you were not married.',
			'Read the penalty (you pay more married) or the bonus (you pay less married).'
		],
		about: [
			{
				heading: 'What are the marriage penalty and the marriage bonus?',
				paragraphs: [
					'A marriage penalty means a couple pays more tax together than the same two people would pay as singles. A marriage bonus means they pay less. The calculator works out both sides and shows the difference.',
					'Many couples see little or no change. Your result depends on how your incomes compare, on children and on the deductions you use. It only measures federal income tax, so it doesn’t include state tax or any non-tax effects of marriage.'
				]
			},
			{
				heading: 'Why the tax can go up or down',
				paragraphs: [
					`In ${TAX_YEAR}, joint brackets are exactly twice the single ones for every rate below ${pc(BR_MFJ[GAP].rate)}. The joint standard deduction (${usd(STANDARD_DEDUCTION.mfj)}) is twice the single one (${usd(STANDARD_DEDUCTION.single)}). So two similar earners usually see no change.`,
					`The top bracket is where this breaks. The ${pc(BR_MFJ[GAP].rate)} rate starts at ${usd(BR_MFJ[GAP].from)} for a joint return. Two single people would each reach it at ${usd(BR_SINGLE[GAP].from)}, which is ${usd(2 * BR_SINGLE[GAP].from)} together. Very high earners can therefore pay a penalty.`,
					'A bonus happens when one partner earns much more. The joint brackets are wider, so more of the higher earner’s income is taxed at lower rates. Lower earners and stay-at-home partners are the usual winners.'
				]
			},
			{
				heading: 'Other causes of a penalty',
				paragraphs: [
					'Parents can also lose out. An unmarried parent can file as head of household, which has a larger standard deduction and wider brackets than single. Once married, that status goes away.',
					'Some credits also phase out based on combined income, so two incomes together can reduce a credit that each person might have kept alone. The calculator includes the child tax credit. It doesn’t include other credits.'
				]
			},
			{
				heading: 'Examples of penalties and bonuses',
				paragraphs: [
					'These examples use the standard deduction and wage income only, with no pre-tax contributions. In the last row, the first partner would claim the child as head of household if unmarried.'
				],
				table: {
					caption: `Federal income tax, ${TAX_YEAR}`,
					columns: ['Incomes', 'Tax if unmarried', 'Tax if married', 'Difference'],
					rows: [
						row(`${usd(100_000)} and ${usd(20_000)}`, 100_000, 20_000, 0),
						row(`${usd(60_000)} and ${usd(60_000)}`, 60_000, 60_000, 0),
						row(`${usd(400_000)} and ${usd(400_000)}`, 400_000, 400_000, 0),
						row(`${usd(700_000)} and ${usd(700_000)}`, 700_000, 700_000, 0),
						row(`${usd(80_000)} and ${usd(30_000)}, 1 child`, 80_000, 30_000, 1)
					]
				}
			},
			{
				heading: 'What to do with the result',
				paragraphs: ['Think of this as one input to your wider plan:'],
				list: [
					'**Don’t expect filing separately to fix a penalty.** Married filing separately usually costs more, and it blocks several credits and the senior deduction.',
					'**Update your withholding after you marry.** A new W-4 helps you avoid a surprise at tax time.',
					'**Look at your full paycheck.** The [take-home pay calculator](/take-home-pay-calculator) adds Social Security, Medicare and state tax.',
					'**Check each person’s tax in detail.** The [income tax calculator](/income-tax-calculator) shows brackets and deductions step by step.',
					'**Plan retirement together.** Pre-tax savings cut your tax. See the [401(k) calculator](/401k-calculator) and the [Roth IRA calculator](/roth-ira-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Marriage penalty or bonus',
				expression: 'Difference = Tax(joint return) − [Tax(you, unmarried) + Tax(partner, unmarried)]',
				variables: [
					{ symbol: 'Joint return', meaning: `${TAX_YEAR} married-filing-jointly brackets and ${usd(STANDARD_DEDUCTION.mfj)} standard deduction on your combined income` },
					{ symbol: 'Unmarried', meaning: `single brackets and ${usd(STANDARD_DEDUCTION.single)} standard deduction, or head of household (${usd(STANDARD_DEDUCTION.hoh)}) for the partner claiming the children` }
				]
			}
		],
		example: {
			title: `One partner earns ${usd(100_000)} and the other ${usd(20_000)}, no children`,
			steps: [
				`Unmarried: ${usd(EX.ta.tax)} + ${usd(EX.tb.tax)} = ${usd(EX.single)}`,
				`Married: ${usd(120_000)} − ${usd(STANDARD_DEDUCTION.mfj)} = ${usd(EX.joint.taxable)} taxable → ${sliceText(EX.joint.slices)} = ${usd(EX.joint.tax)}`,
				`Difference: ${usd(EX.joint.tax)} − ${usd(EX.single)} = −${usd(-EX.diff)}`
			],
			result: `A marriage bonus of ${usd(-EX.diff)}.`
		},
		faq: [
			{
				q: 'How does the marriage tax calculator work?',
				a: 'It works out your tax twice. First it uses single (or head of household) status for each partner. Then it uses married filing jointly on your combined income. The difference is your penalty or bonus.'
			},
			{
				q: 'Why do some couples pay a marriage penalty?',
				a: `Joint brackets are twice the single ones until the ${pc(BR_MFJ[GAP].rate)} rate, so two similar incomes usually see no penalty. Penalties show up at very high incomes, when an unmarried parent loses head-of-household status, or through credits that phase out on combined income.`
			},
			{
				q: 'Who gets a marriage bonus?',
				a: 'Couples with very different incomes. The higher earner’s income spreads across the wider joint brackets, so more of it is taxed at lower rates.'
			},
			{
				q: 'Can we file separately to avoid a penalty?',
				a: 'Married filing separately rarely helps. Its brackets are half the joint ones, and it blocks several credits and the senior deduction. It can make sense for income-driven student loan payments or to keep tax bills separate.'
			},
			{
				q: 'Does this include state tax or payroll tax?',
				a: `No. It compares federal income tax only. Social Security and Medicare are mostly the same whether or not you are married, but the extra Medicare tax starts at ${usd(ADDL_MEDICARE_THRESHOLD.mfj)} for a couple, not twice the single threshold of ${usd(ADDL_MEDICARE_THRESHOLD.single)}.`
			}
		],
		sources: [IRS_TAX_SOURCE, { title: 'IRS — Publication 501, filing status', url: 'https://www.irs.gov/forms-pubs/about-publication-501' }],
		disclaimer: 'Uses the standard deduction and wage income only, and ignores state taxes and most credits. Not tax advice.'
	}
});
