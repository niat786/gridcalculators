import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';

import { IRS_LIMITS_SOURCE, LIMIT_401K, limit401k, RETIREMENT_TAX_YEAR } from '../data/us-retirement';
import meta from './401k-calculator.meta';

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Current age', type: 'number', default: 30, min: 18, max: 75, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'retire', label: 'Retirement age', type: 'number', default: 65, min: 19, max: 80, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'salary', label: 'Annual salary', type: 'number', default: 75000, min: 0, max: 10_000_000, prefix: '$' },
		{ id: 'contrib', label: 'Your contribution', type: 'number', default: 8, min: 0, max: 100, step: 0.5, suffix: '% of pay' },
		{ id: 'match', label: 'Employer match', type: 'number', default: 50, min: 0, max: 200, suffix: '% of yours', help: 'e.g. 50% means $0.50 per $1 you put in' },
		{ id: 'matchCap', label: 'Match limit', type: 'number', default: 6, min: 0, max: 100, step: 0.5, suffix: '% of pay', help: 'Your contributions above this aren’t matched' },
		{ id: 'balance', label: 'Current 401(k) balance', type: 'number', default: 25000, min: 0, max: 100_000_000, prefix: '$' },
		{ id: 'ret', label: 'Expected return', type: 'number', default: 7, min: -10, max: 20, step: 0.1, suffix: '% / yr', width: 'half' },
		{ id: 'raise', label: 'Salary increase', type: 'number', default: 2, min: 0, max: 20, step: 0.1, suffix: '% / yr', width: 'half' }
	],
	calculate(v): CalculationResult {
		const age = Number(v.age);
		const retire = Number(v.retire);
		const r = Number(v.ret) / 100;
		const g = Number(v.raise) / 100;
		let salary = Number(v.salary);
		const pct = Number(v.contrib) / 100;
		const matchRate = Number(v.match) / 100;
		const matchCap = Number(v.matchCap) / 100;
		let balance = Number(v.balance);
		const nums = [age, retire, r, g, salary, pct, matchRate, matchCap, balance];
		if (nums.some((x) => !Number.isFinite(x)) || retire <= age || retire - age > 62) {
			return { primaryResult: DASH, primaryLabel: 'Balance at retirement', summary: 'Retirement age must be after your current age.' };
		}

		let you = 0;
		let employer = 0;
		let cappedYears = 0;
		const rows: Record<string, string>[] = [];
		const chart: Record<string, number>[] = [{ age, balance, contributed: balance }];
		let contributed = balance;
		for (let a = age; a < retire; a++) {
			const wanted = salary * pct;
			const limit = limit401k(a);
			const yours = Math.min(wanted, limit);
			if (wanted > limit) cappedYears++;
			const matched = Math.min(yours, salary * matchCap) * matchRate;
			// Contributions spread through the year earn about half a year of growth.
			balance = balance * (1 + r) + (yours + matched) * (1 + r / 2);
			you += yours;
			employer += matched;
			contributed += yours + matched;
			rows.push({ age: String(a + 1), you: money(yours, true), employer: money(matched, true), balance: money(balance, true) });
			chart.push({ age: a + 1, balance, contributed });
			salary *= 1 + g;
		}

		const startSalary = Number(v.salary);
		const thisYear = Math.min(startSalary * pct, limit401k(age));
		const leftOnTable = pct < matchCap ? startSalary * (matchCap - pct) * matchRate : 0;

		return {
			primaryResult: money(balance, true),
			primaryLabel: `401(k) balance at age ${retire}`,
			summary:
				leftOnTable > 0
					? `Raising your contribution to ${num(matchCap * 100, 1)}% would capture ${money(leftOnTable, true)} more in matching this year.`
					: `You get the full employer match. ${RETIREMENT_TAX_YEAR} limit at age ${age}: ${money(limit401k(age), true)}.`,
			secondaryMetrics: [
				{ label: 'Your contributions', value: money(you, true) },
				{ label: 'Employer contributions', value: money(employer, true) },
				{ label: 'Investment growth', value: money(balance - you - employer - Number(v.balance), true) },
				{ label: 'Your contribution this year', value: money(thisYear, true) },
				{ label: `${RETIREMENT_TAX_YEAR} contribution limit (your age)`, value: money(limit401k(age), true) }
			],
			chart: {
				type: 'line',
				title: 'Balance and money put in',
				x: 'age',
				xLabel: 'Age',
				series: [
					{ key: 'balance', label: 'Balance' },
					{ key: 'contributed', label: 'Total put in' }
				],
				data: chart,
				valueFormat: 'currency'
			},
			table: {
				title: cappedYears ? `Year by year (limit reached in ${cappedYears} years)` : 'Year by year',
				collapsed: true,
				columns: [
					{ key: 'age', label: 'Age' },
					{ key: 'you', label: 'You', align: 'end' },
					{ key: 'employer', label: 'Employer', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Use this 401(k) calculator to project how your balance could grow from your own contributions, your employer’s match and investment returns. It also checks your savings against the ${RETIREMENT_TAX_YEAR} IRS contribution limits.`,
		howTo: [
			'Enter your age, retirement age and annual salary.',
			'Enter the percentage of pay you contribute, and how your employer matches it.',
			'Add your current balance, an expected return and a typical yearly raise.',
			'Read your projected balance, and check whether you are getting the full match.'
		],
		about: [
			{
				heading: 'What is a 401(k)?',
				paragraphs: [
					'A 401(k) is a retirement account offered by many US employers. You choose a share of each paycheck to save, and the money goes into investments such as mutual funds. Many employers also add a matching contribution.',
					'With a traditional 401(k), your contributions come out before income tax. You pay tax later, when you withdraw. Some plans also offer a Roth 401(k), where you pay tax now and withdraw tax-free later. Public-sector and nonprofit plans, such as 403(b) and 457(b) accounts, work in a similar way.',
					'Taking money out before age 59½ usually adds a 10% penalty on top of the tax, with some exceptions. So a 401(k) works best as long-term money.'
				]
			},
			{
				heading: `401(k) contribution limits for ${RETIREMENT_TAX_YEAR}`,
				paragraphs: [
					`The IRS caps how much of your own pay you can put in each year. The limit rises if you are 50 or older, and it rises again at ages 60 to 63. Your employer’s match doesn’t count toward your personal limit. The calculator stops your contributions at the limit for your age in each year.`
				],
				table: {
					caption: `Employee 401(k) limits, ${RETIREMENT_TAX_YEAR}`,
					columns: ['Your age', 'Yearly limit', 'How it is made up'],
					rows: [
						['Under 50', usd(limit401k(40)), 'Standard limit'],
						['50 to 59, and 64 or older', usd(limit401k(55)), `Standard limit plus ${usd(LIMIT_401K.catchUp50)} catch-up`],
						['60 to 63', usd(limit401k(61)), `Standard limit plus ${usd(LIMIT_401K.catchUp60to63)} catch-up`]
					]
				}
			},
			{
				heading: 'How an employer match works',
				paragraphs: [
					'A match is extra money your employer adds when you save. A common rule is “50% of what you put in, up to 6% of pay”. That has two numbers: the match rate (50%) and the match limit (6%).',
					`For example, take a ${usd(75_000)} salary. If you save 8%, you put in ${usd(6_000)}. Only the first 6% of pay, or ${usd(4_500)}, is matched. At 50%, your employer adds ${usd(2_250)}. Saving less than the limit means you leave part of the match unclaimed.`,
					'In short, the match is part of your pay. Saving at least enough to get all of it is a good first goal for many people. Some plans use a vesting schedule, which means you keep the match only after a set time with the employer. Check your plan rules.'
				]
			},
			{
				heading: 'How to read your projection',
				paragraphs: [
					'The result is your balance at retirement age, in future dollars. It is not adjusted for inflation, and it is before tax and fees. So treat it as a guide, not a promise.',
					`The table below shows how the contribution rate changes the outcome. It uses the default inputs: age 30, retire at 65, ${usd(75_000)} salary, ${usd(25_000)} saved, 7% return and 2% yearly raises. The employer matches 50% of pay up to 6%.`
				],
				table: {
					caption: 'Projected balance at 65, only the contribution changes',
					columns: ['You contribute', 'Employer match', 'Balance at 65'],
					rows: [
						['3% of pay', '50% up to 6%', usd(873_090)],
						['6% of pay', '50% up to 6%', usd(1_479_265)],
						['8% of pay', '50% up to 6%', usd(1_748_677)],
						['8% of pay', 'None', usd(1_344_560)]
					]
				}
			},
			{
				heading: 'Tips to get more from your 401(k)',
				paragraphs: ['Small choices add up over decades. These are worth a look:'],
				list: [
					'**Get the whole match first.** Then raise your rate when you get a pay rise.',
					'**Start early.** Time does a lot of the work. Compare the effect of more years with the [retirement calculator](/retirement-calculator).',
					'**Know your tax choice.** A Roth option pays off if you expect a higher tax rate later. The [Roth IRA calculator](/roth-ira-calculator) and [IRA calculator](/ira-calculator) show the trade-off.',
					'**Watch fees.** A small yearly fee on your funds can take a big share of growth over 30 years.',
					'**Plan for withdrawals.** From age 73 or 75, depending on your birth year, you must start taking money out. See the [RMD calculator](/rmd-calculator).',
					'**See your paycheck.** Use the [take-home pay calculator](/take-home-pay-calculator) to check what a higher rate does to your net pay.'
				]
			}
		],
		formulas: [
			{
				title: 'Each year',
				expression: 'balance = balance × (1 + r) + (you + match) × (1 + r ÷ 2)',
				variables: [
					{ symbol: 'you', meaning: `salary × your %, capped at the IRS limit for your age (${usd(LIMIT_401K.elective)} under 50, plus catch-up from age 50)` },
					{ symbol: 'match', meaning: 'min(you, salary × match limit %) × employer match %' },
					{ symbol: 'r', meaning: 'expected yearly return; contributions get half a year of growth' }
				]
			}
		],
		example: {
			title: 'Salary $75,000, you put in 8%, employer matches 50% up to 6%',
			steps: [
				'Your contribution: $75,000 × 8% = $6,000',
				'Matched part: the lower of $6,000 and $75,000 × 6% = $4,500',
				'Employer match: $4,500 × 50% = $2,250',
				'Total going in this year: $6,000 + $2,250 = $8,250'
			],
			result: 'Each year starts with $8,250 of new money, before growth and raises.'
		},
		faq: [
			{
				q: `What is the 401(k) contribution limit for ${RETIREMENT_TAX_YEAR}?`,
				a: `${usd(LIMIT_401K.elective)} of your own pay. From age 50 you can add a ${usd(LIMIT_401K.catchUp50)} catch-up, and at ages 60 to 63 the catch-up rises to ${usd(LIMIT_401K.catchUp60to63)}. Employer contributions don’t count toward this limit.`
			},
			{
				q: 'Should I always get the full employer match?',
				a: 'If you can afford it, yes. The match is part of your pay, so contributing less than the match limit leaves that money unclaimed. If you have high-interest debt, you may want to weigh the two.'
			},
			{
				q: 'Does this 401(k) calculator include taxes or fees?',
				a: 'No. Traditional 401(k) money is taxed when you withdraw it, and fund fees reduce returns. Treat the projection as a before-tax, before-fee estimate in future dollars.'
			},
			{
				q: 'Does the calculator raise the limit in future years?',
				a: `No. It holds the ${RETIREMENT_TAX_YEAR} limits steady, which is cautious. The IRS usually raises them over time.`
			},
			{
				q: 'Can I have a 401(k) and an IRA?',
				a: 'Yes. They have separate limits. However, having a workplace plan can reduce how much of a traditional IRA contribution you can deduct, depending on your income.'
			}
		],
		sources: [
			IRS_LIMITS_SOURCE,
			{ title: 'IRS — 401(k) plans', url: 'https://www.irs.gov/retirement-plans/401k-plans' }
		],
		disclaimer: 'Projections, not guarantees. Returns vary, and taxes, fees and plan rules (such as vesting) are not included. Not financial or tax advice.'
	}
});
