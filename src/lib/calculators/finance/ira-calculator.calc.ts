import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import { growIra } from '../data/ira-math';
import { IRS_LIMITS_SOURCE, LIMIT_IRA, limitIra, RETIREMENT_TAX_YEAR, ROTH_PHASEOUT } from '../data/us-retirement';

import meta from './ira-calculator.meta';

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Current age', type: 'number', default: 35, min: 18, max: 75, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'retire', label: 'Retirement age', type: 'number', default: 65, min: 19, max: 90, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'balance', label: 'Current balance', type: 'number', default: 10000, min: 0, max: 100_000_000, prefix: '$' },
		{ id: 'contrib', label: 'Yearly contribution', type: 'number', default: 7500, min: 0, max: 100_000, prefix: '$', help: `Capped at the ${RETIREMENT_TAX_YEAR} limit for your age` },
		{ id: 'ret', label: 'Expected return', type: 'number', default: 7, min: -10, max: 20, step: 0.1, suffix: '% / yr' },
		{ id: 'taxNow', label: 'Tax rate now', type: 'number', default: 22, min: 0, max: 60, suffix: '%', width: 'half' },
		{ id: 'taxLater', label: 'Tax rate in retirement', type: 'number', default: 15, min: 0, max: 60, suffix: '%', width: 'half' }
	],
	calculate(v): CalculationResult {
		const age = Number(v.age);
		const retire = Number(v.retire);
		const r = Number(v.ret) / 100;
		const tNow = Number(v.taxNow) / 100;
		const tLater = Number(v.taxLater) / 100;
		const start = Number(v.balance);
		const wanted = Number(v.contrib);
		if ([age, retire, r, tNow, tLater, start, wanted].some((x) => !Number.isFinite(x)) || retire <= age || retire - age > 72) {
			return { primaryResult: DASH, primaryLabel: 'IRA balance at retirement', summary: 'Retirement age must be after your current age.' };
		}
		const yearly = (a: number) => Math.min(wanted, limitIra(a));

		// Same pre-tax income for both: a Roth dollar costs 1 ÷ (1 − tax now) of pay, so a Roth
		// funded from the same pay is the Traditional amount × (1 − tax now).
		const trad = growIra(start, yearly, age, retire, r);
		const roth = growIra(start, (a) => yearly(a) * (1 - tNow), age, retire, r);
		const tradAfter = trad.balance * (1 - tLater);
		const rothAfter = roth.balance; // existing balance assumed already-taxed Roth money for comparison
		const diff = rothAfter - tradAfter;
		const winner = Math.abs(diff) < 1 ? 'Both come out the same' : diff > 0 ? 'Roth comes out ahead' : 'Traditional comes out ahead';

		return {
			primaryResult: money(trad.balance, true),
			primaryLabel: `IRA balance at age ${retire} (before tax)`,
			summary: `${winner}${Math.abs(diff) >= 1 ? ` by ${money(Math.abs(diff), true)} after tax` : ''}: you pay ${num(tNow * 100, 1)}% tax now with a Roth, ${num(tLater * 100, 1)}% later with a Traditional IRA.`,
			secondaryMetrics: [
				{ label: 'Traditional IRA, after tax', value: money(tradAfter, true) },
				{ label: 'Roth IRA, after tax (same pay)', value: money(rothAfter, true) },
				{ label: 'Total you contribute', value: money(trad.put, true) },
				{ label: `${RETIREMENT_TAX_YEAR} limit at your age`, value: money(limitIra(age), true) }
			]
		};
	},
	content: {
		intro: `Use this IRA calculator to project how an individual retirement account could grow with the ${RETIREMENT_TAX_YEAR} contribution limits. It also compares what a Traditional IRA and a Roth IRA would leave you after tax.`,
		howTo: [
			'Enter your age, retirement age, current balance and yearly contribution.',
			'Enter the return you expect each year.',
			'Enter your tax rate now and the rate you expect in retirement.',
			'Compare the after-tax results for each type of IRA.'
		],
		about: [
			{
				heading: 'What is an IRA?',
				paragraphs: [
					'An individual retirement account (IRA) is a US savings account with tax benefits for retirement. You open it yourself at a bank, broker or fund company, so it doesn’t depend on your employer. You need earned income, such as wages, to contribute.',
					'There are two main types. A Traditional IRA may give you a tax deduction now, and you pay income tax when you withdraw. A Roth IRA gives no deduction, but qualified withdrawals are tax-free later.',
					'Both types share one yearly limit. If you have both, your total contributions can’t pass that limit.'
				]
			},
			{
				heading: `IRA contribution limits for ${RETIREMENT_TAX_YEAR}`,
				paragraphs: [
					`For ${RETIREMENT_TAX_YEAR} you can put in up to ${usd(limitIra(40))}, or ${usd(limitIra(55))} if you are 50 or older. The calculator caps your yearly contribution at the limit for your age. It holds that limit steady in later years, which is a cautious choice.`,
					`Roth IRAs also have income limits. For example, single filers can contribute the full amount with income below ${usd(ROTH_PHASEOUT.single.from)}, and joint filers below ${usd(ROTH_PHASEOUT.mfj.from)}. The [Roth IRA calculator](/roth-ira-calculator) works out your exact limit.`,
					'A Traditional IRA deduction can shrink if you or your spouse have a workplace plan and your income is above set levels. IRS Publication 590-A explains the rules.'
				]
			},
			{
				heading: 'Traditional or Roth: how the comparison works',
				paragraphs: [
					'The key question is whether your tax rate is higher now or in retirement. With a Traditional IRA, you invest the full amount and pay tax later. With a Roth IRA, you pay tax first, so less goes in, but the growth is untaxed.',
					'To compare them fairly, the calculator assumes you start with the same pay. A Roth dollar costs more pay than a Traditional dollar, so the Roth contribution is smaller by your tax rate now. Then each result is shown after tax.',
					'If your rate is the same now and later, the two come out equal. If your rate will be higher later, the Roth wins. If it will be lower, the Traditional IRA wins.'
				],
				table: {
					caption: `After-tax value at 65. Age 35, ${usd(7_500)} a year, 7% return, 22% tax now, no starting balance`,
					columns: ['Tax rate in retirement', 'Traditional, after tax', 'Roth, after tax'],
					rows: [
						['15%', usd(623_264), usd(571_936)],
						['22%', usd(571_936), usd(571_936)],
						['30%', usd(513_276), usd(571_936)]
					]
				}
			},
			{
				heading: 'Things that change the result',
				paragraphs: [
					'Your current balance is treated as pre-tax money in the Traditional result and as already-taxed money in the Roth result. So when you enter a starting balance, the Roth can look a little better than it should if the two rates are equal. Set the balance to zero for a clean side-by-side test.',
					'Other things matter too. Roth IRAs have no required withdrawals for the original owner, and you can take out your contributions at any time. Traditional IRAs require minimum withdrawals later in life, which the [RMD calculator](/rmd-calculator) can estimate.',
					'Also remember that returns are never fixed. Try a lower and a higher return to see how sensitive the answer is.'
				]
			},
			{
				heading: 'Tips for using an IRA',
				paragraphs: ['A few habits can help you get more from the account:'],
				list: [
					'**Contribute early in the year when you can.** More time in the market means more growth.',
					'**Use your workplace plan too.** Check the match first with the [401(k) calculator](/401k-calculator).',
					'**Think about your tax bracket.** The [income tax calculator](/income-tax-calculator) shows the bracket you are in today.',
					'**Plan the whole picture.** The [retirement calculator](/retirement-calculator) turns savings into monthly income.'
				]
			}
		],
		formulas: [
			{
				title: 'Growth each year',
				expression: 'balance = balance × (1 + r) + contribution × (1 + r ÷ 2)',
				variables: [
					{ symbol: 'r', meaning: 'expected yearly return, as a decimal' },
					{ symbol: 'contribution', meaning: 'your yearly contribution, capped at the IRA limit for your age' }
				]
			},
			{
				title: 'Fair comparison from the same pay',
				expression: 'Traditional after tax = FV(C) × (1 − tax later)\nRoth after tax = FV(C × (1 − tax now))',
				variables: [
					{ symbol: 'C', meaning: 'yearly contribution (pre-tax dollars)' },
					{ symbol: 'FV', meaning: 'value at retirement after growth' }
				]
			}
		],
		example: {
			title: '$1,000 of pay, 22% tax now, 15% in retirement, money doubles',
			steps: [
				'Traditional: invest the full $1,000 → $2,000 → pay 15% tax → $1,700',
				'Roth: pay 22% first, invest $780 → $1,560, tax-free',
				'$1,700 − $1,560 = $140'
			],
			result: 'With a lower tax rate later, the Traditional IRA leaves $140 more per $1,000 of pay.'
		},
		faq: [
			{
				q: `What is the IRA contribution limit for ${RETIREMENT_TAX_YEAR}?`,
				a: `${usd(LIMIT_IRA.base)}, or ${usd(LIMIT_IRA.base + LIMIT_IRA.catchUp50)} from age 50. The limit is shared across all your Traditional and Roth IRAs.`
			},
			{
				q: 'Which is better, a Traditional or a Roth IRA?',
				a: 'It mostly comes down to tax rates. If you expect a higher tax rate in retirement than now, a Roth usually wins. If you expect a lower rate, a Traditional IRA usually wins. If they are equal, the results are the same.'
			},
			{
				q: 'Can I deduct Traditional IRA contributions?',
				a: 'It depends on your income and on whether you or your spouse have a workplace retirement plan. Above certain incomes the deduction phases out. Check IRS Publication 590-A.'
			},
			{
				q: 'Are there other differences besides tax?',
				a: 'Yes. Roth IRAs have no required minimum distributions for the owner and allow withdrawals of contributions at any time. Traditional IRAs require minimum distributions later in life.'
			},
			{
				q: 'Can I put money in both a Traditional and a Roth IRA?',
				a: 'Yes, as long as the total stays within one yearly limit. For example, you could split it between the two to spread your tax risk.'
			}
		],
		sources: [IRS_LIMITS_SOURCE, { title: 'IRS Publication 590-A: Contributions to IRAs', url: 'https://www.irs.gov/publications/p590a' }],
		disclaimer: 'Estimates only, not tax advice. Tax rules, eligibility and your future tax rate can change.'
	}
});
