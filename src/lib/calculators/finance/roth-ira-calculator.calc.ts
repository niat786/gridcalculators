import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn } from '../format';
import { growIra, rothAllowed } from '../data/ira-math';

import { IRS_LIMITS_SOURCE, limitIra, RETIREMENT_TAX_YEAR, ROTH_PHASEOUT } from '../data/us-retirement';
import meta from './roth-ira-calculator.meta';

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const SP = ROTH_PHASEOUT.single;
const EX_MAGI = (SP.from + SP.to) / 2;
const EX_LIMIT = limitIra(30);
const EX_ALLOWED = rothAllowed('single', EX_MAGI, 30);
const EX_SHARE = (EX_MAGI - SP.from) / (SP.to - SP.from);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'status',
			label: 'Filing status',
			type: 'select',
			display: 'menu',
			default: 'single',
			options: Object.entries(ROTH_PHASEOUT).map(([value, p]) => ({ value, label: p.label }))
		},
		{ id: 'magi', label: 'Modified adjusted gross income', type: 'number', default: 90000, min: 0, max: 100_000_000, prefix: '$' },
		{ id: 'age', label: 'Current age', type: 'number', default: 30, min: 18, max: 90, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'retire', label: 'Retirement age', type: 'number', default: 65, min: 19, max: 100, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'balance', label: 'Current Roth balance', type: 'number', default: 5000, min: 0, max: 100_000_000, prefix: '$' },
		{ id: 'contrib', label: 'Yearly contribution you want', type: 'number', default: 7500, min: 0, max: 100_000, prefix: '$' },
		{ id: 'ret', label: 'Expected return', type: 'number', default: 7, min: -10, max: 20, step: 0.1, suffix: '% / yr' }
	],
	calculate(v): CalculationResult {
		const age = Number(v.age);
		const retire = Number(v.retire);
		const magi = Number(v.magi);
		const r = Number(v.ret) / 100;
		const start = Number(v.balance);
		const wanted = Number(v.contrib);
		const status = String(v.status);
		if ([age, retire, magi, r, start, wanted].some((x) => !Number.isFinite(x)) || retire <= age || retire - age > 82 || !ROTH_PHASEOUT[status]) {
			return { primaryResult: DASH, primaryLabel: `Your ${RETIREMENT_TAX_YEAR} Roth IRA limit`, summary: 'Check your ages and income.' };
		}
		const allowedNow = rothAllowed(status, magi, age);
		const p = ROTH_PHASEOUT[status];
		const phase = magi <= p.from ? 'full' : magi >= p.to ? 'none' : 'partial';
		// Future years: same income (in today's terms) → same eligibility; limit grows with catch-up at 50.
		const yearly = (a: number) => Math.min(wanted, rothAllowed(status, magi, a));
		const grown = growIra(start, yearly, age, retire, r);

		return {
			primaryResult: money(allowedNow, true),
			primaryLabel: `Your ${RETIREMENT_TAX_YEAR} Roth IRA limit`,
			summary:
				phase === 'full'
					? `Your income is below ${money(p.from, true)}, so you can contribute the full ${money(limitIra(age), true)}.`
					: phase === 'none'
						? `Your income is above ${money(p.to, true)}, so you can’t contribute directly to a Roth IRA this year.`
						: `Your income is in the ${money(p.from, true)}–${money(p.to, true)} phase-out range, so your limit is reduced.`,
			secondaryMetrics: [
				{ label: `Balance at age ${retire} (tax-free)`, value: money(grown.balance, true) },
				{ label: 'Total you contribute', value: money(grown.put, true) },
				{ label: 'Tax-free growth', value: money(grown.balance - grown.put - start, true) },
				{ label: 'Phase-out range for you', value: `${money(p.from, true)} – ${money(p.to, true)}` }
			]
		};
	},
	content: {
		intro: `Use this Roth IRA calculator to check how much you can put into a Roth IRA for ${RETIREMENT_TAX_YEAR} under the IRS income limits. It also shows what your tax-free savings could grow to by retirement.`,
		howTo: [
			'Pick your tax filing status and enter your modified adjusted gross income (MAGI).',
			'Enter your age, retirement age, current Roth balance and how much you want to add each year.',
			'Read your allowed contribution for this year.',
			'Check your projected tax-free balance at retirement.'
		],
		about: [
			{
				heading: 'What is a Roth IRA?',
				paragraphs: [
					'A Roth IRA is a US retirement account that you fund with money you have already paid tax on. You get no deduction now. In return, your investments grow tax-free, and qualified withdrawals in retirement are tax-free too.',
					'You can take out your own contributions at any time without tax or penalty. Earnings are different. They come out tax-free and penalty-free once you are 59½ and the account has been open for at least five years, with some exceptions.',
					'Roth IRAs also have no required minimum distributions for the original owner. That makes them popular for money you may not need right away.'
				]
			},
			{
				heading: `Roth IRA income limits for ${RETIREMENT_TAX_YEAR}`,
				paragraphs: [
					`You can contribute up to ${usd(limitIra(30))} for ${RETIREMENT_TAX_YEAR}, or ${usd(limitIra(55))} if you are 50 or older. That limit is shared with any Traditional IRA you have. It is also capped at your earned income for the year.`,
					'Your income decides how much of that you can put in directly. The test uses modified adjusted gross income (MAGI), which is your adjusted gross income with a few deductions added back. Below the lower number you can contribute the full amount. Inside the range, your limit shrinks. Above it, you can’t contribute directly.'
				],
				table: {
					caption: `Roth IRA phase-out ranges by MAGI, ${RETIREMENT_TAX_YEAR}`,
					columns: ['Filing status', 'Full contribution below', 'No contribution above'],
					rows: Object.values(ROTH_PHASEOUT).map((p) => [p.label, usd(p.from), usd(p.to)])
				}
			},
			{
				heading: 'How the reduced limit is worked out',
				paragraphs: [
					`The IRS reduces your limit in proportion to how far your MAGI is into the range. The result is rounded up to the next $10. If you are in the range at all, the minimum is $200.`,
					`For example, take a single filer under 50 with a MAGI of ${usd(EX_MAGI)}. That is ${Math.round(EX_SHARE * 100)}% of the way through the range from ${usd(SP.from)} to ${usd(SP.to)}. So the limit drops by ${Math.round(EX_SHARE * 100)}%, from ${usd(EX_LIMIT)} to ${usd(EX_ALLOWED)}.`
				]
			},
			{
				heading: 'What if your income is too high?',
				paragraphs: [
					'You have a few options. You can contribute to a Traditional IRA instead, and you can still save in a workplace plan such as a 401(k). Some people use a “backdoor” Roth, which means making a non-deductible Traditional IRA contribution and then converting it to a Roth.',
					'A conversion can create a tax bill, especially if you hold other pre-tax IRA money. Speak to a tax professional before you try it. To compare the two account types, see the [IRA calculator](/ira-calculator).'
				]
			},
			{
				heading: 'How to read your projection',
				paragraphs: [
					'The projection assumes you keep contributing the lower of what you want and what you are allowed, every year until retirement. It uses today’s limits and income, so your allowed amount stays the same. Time is the biggest driver, as the table shows.'
				],
				table: {
					caption: `Balance at 65, ${usd(7_500)} a year, ${usd(5_000)} to start, 7% return`,
					columns: ['Starting age', 'Total you contribute', 'Balance at 65'],
					rows: [
						['30', usd(262_500), usd(1_126_447)],
						['50', usd(112_500), usd(208_859)]
					]
				}
			},
			{
				heading: 'Tips for Roth savers',
				paragraphs: ['Keep these points in mind as you plan:'],
				list: [
					'**Check your MAGI each year.** A raise or a bonus can move you into the phase-out range.',
					'**Compare your tax rates.** The [income tax calculator](/income-tax-calculator) shows your bracket today.',
					'**Don’t skip the employer match.** The [401(k) calculator](/401k-calculator) shows what a match is worth.',
					'**Plan the income side too.** The [retirement calculator](/retirement-calculator) turns your balance into a monthly amount.'
				]
			}
		],
		formulas: [
			{
				title: 'Reduced limit in the phase-out range',
				expression: 'limit × (1 − (MAGI − start) ÷ (end − start)), rounded up to the next $10, minimum $200',
				variables: [
					{ symbol: 'limit', meaning: 'the IRA limit for your age' },
					{ symbol: 'start, end', meaning: 'the phase-out range for your filing status' }
				]
			},
			{
				title: 'Growth each year',
				expression: 'balance = balance × (1 + r) + contribution × (1 + r ÷ 2)',
				variables: [{ symbol: 'r', meaning: 'expected yearly return, as a decimal' }]
			}
		],
		example: {
			title: `Single filer, age 30, MAGI ${usd(EX_MAGI)}`,
			steps: [
				`Phase-out range: ${usd(SP.from)} to ${usd(SP.to)} (width ${usd(SP.to - SP.from)})`,
				`Into the range: ${usd(EX_MAGI)} − ${usd(SP.from)} = ${usd(EX_MAGI - SP.from)}, which is ${Math.round(EX_SHARE * 100)}%`,
				`${usd(EX_LIMIT)} × (1 − ${EX_SHARE}) = ${usd(EX_ALLOWED)}`
			],
			result: `The maximum Roth IRA contribution is ${usd(EX_ALLOWED)} for ${RETIREMENT_TAX_YEAR}.`
		},
		faq: [
			{
				q: `What are the Roth IRA income limits for ${RETIREMENT_TAX_YEAR}?`,
				a: `Single filers can contribute the full amount with MAGI below ${usd(ROTH_PHASEOUT.single.from)}, a reduced amount up to ${usd(ROTH_PHASEOUT.single.to)}, and nothing above that. For married couples filing jointly the range is ${usd(ROTH_PHASEOUT.mfj.from)} to ${usd(ROTH_PHASEOUT.mfj.to)}.`
			},
			{
				q: 'What if my income is too high?',
				a: 'You can’t contribute directly, but many people use a “backdoor” Roth: a non-deductible Traditional IRA contribution that is converted to a Roth. It has tax rules worth checking with a professional first.'
			},
			{
				q: 'When can I withdraw from a Roth IRA tax-free?',
				a: 'Your contributions can come out at any time. Earnings are tax-free and penalty-free once you are 59½ and the account has been open at least five years, with some exceptions.'
			},
			{
				q: 'Is the limit shared with my Traditional IRA?',
				a: 'Yes. The yearly limit covers all your IRAs combined, Traditional and Roth.'
			},
			{
				q: 'What is modified adjusted gross income?',
				a: 'It is your adjusted gross income from your tax return, with certain deductions and exclusions added back. For most people it is close to their AGI. IRS Publication 590-A has the exact worksheet.'
			}
		],
		sources: [IRS_LIMITS_SOURCE, { title: 'IRS Publication 590-A: Contributions to IRAs', url: 'https://www.irs.gov/publications/p590a' }],
		disclaimer: 'Estimates only, not tax advice. Income limits change each year. Confirm with the IRS or a tax professional.'
	}
});
