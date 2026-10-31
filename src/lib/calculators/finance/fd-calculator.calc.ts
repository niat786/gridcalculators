import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import {
	BANK_DEPOSIT_SOURCE,
	DEPOSIT_TDS_SOURCE,
	FD_TDS_RATE_PCT,
	FD_TDS_THRESHOLD,
	FD_TDS_THRESHOLD_SENIOR,
	SENIOR_EXTRA_RATE_DEFAULT
} from '../data/in-deposits';
import meta from './fd-calculator.meta';

const inr = (n: number) => moneyIn('INR', n, true);

/** Compounding periods per year; 0 = simple interest, no compounding. */
const PERIODS: Record<string, number> = { quarterly: 4, monthly: 12, halfyearly: 2, yearly: 1, simple: 0 };

/** Maturity of a lump sum. t in years. n = 0 means simple interest. */
export function fdMaturity(principal: number, ratePct: number, n: number, t: number): number {
	const r = ratePct / 100;
	return n === 0 ? principal * (1 + r * t) : principal * Math.pow(1 + r / n, n * t);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'deposit', label: 'Deposit amount', type: 'number', default: 100000, min: 1, max: 1_000_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 7, min: 0, max: 30, step: 0.05, suffix: '% a year' },
		{ id: 'years', label: 'Tenure: years', type: 'number', default: 5, min: 0, max: 30, step: 1, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'months', label: 'Months', type: 'number', default: 0, min: 0, max: 360, step: 1, decimal: false, suffix: 'months', width: 'half' },
		{ id: 'days', label: 'Days', type: 'number', default: 0, min: 0, max: 3650, step: 1, decimal: false, suffix: 'days', width: 'half', help: 'Days are counted as days ÷ 365.' },
		{
			id: 'compounding',
			label: 'Interest',
			type: 'select',
			display: 'menu',
			default: 'quarterly',
			options: [
				{ label: 'Compounded quarterly (usual for Indian banks)', value: 'quarterly' },
				{ label: 'Compounded monthly', value: 'monthly' },
				{ label: 'Compounded half-yearly', value: 'halfyearly' },
				{ label: 'Compounded yearly', value: 'yearly' },
				{ label: 'Simple interest (paid out, no compounding)', value: 'simple' }
			]
		},
		{ id: 'senior', label: 'Senior citizen rate', type: 'toggle', default: false },
		{
			id: 'extra',
			label: 'Extra rate for senior citizens',
			type: 'number',
			default: SENIOR_EXTRA_RATE_DEFAULT,
			min: 0,
			max: 5,
			step: 0.05,
			suffix: '%',
			help: 'Banks usually add about 0.50%, but each bank sets its own. Edit to match yours.',
			visibleWhen: (v) => v.senior === true
		}
	],
	calculate(v: InputValues) {
		const P = Number(v.deposit);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const months = Number(v.months);
		const days = Number(v.days);
		const extra = Number(v.extra);
		const n = PERIODS[String(v.compounding)];
		const senior = v.senior === true;
		const fail = (summary: string) => ({ primaryResult: DASH, primaryLabel: 'Maturity amount', summary });
		if (!(P >= 1 && P <= 1_000_000_000)) return fail('Enter the deposit amount.');
		if (!(rate >= 0 && rate <= 30)) return fail('Enter an interest rate between 0% and 30%.');
		if (![years, months, days].every((x) => Number.isInteger(x) && x >= 0)) return fail('Enter the tenure in whole years, months and days.');
		if (years > 30 || months > 360 || days > 3650) return fail('Tenure is too long.');
		if (n === undefined) return fail('Pick how interest is paid.');
		if (senior && !(extra >= 0 && extra <= 5)) return fail('Enter the extra senior citizen rate (0% to 5%).');
		const t = (years * 12 + months) / 12 + days / 365;
		if (!(t > 0 && t <= 30)) return fail('Enter a tenure above zero and up to 30 years.');

		const applied = rate + (senior ? extra : 0);
		const maturity = fdMaturity(P, applied, n, t);
		const interest = maturity - P;
		const yieldPct = n === 0 ? applied : (Math.pow(1 + applied / 100 / n, n) - 1) * 100;
		const parts = [
			years ? `${num(years, 0)} ${years === 1 ? 'year' : 'years'}` : '',
			months ? `${num(months, 0)} ${months === 1 ? 'month' : 'months'}` : '',
			days ? `${num(days, 0)} ${days === 1 ? 'day' : 'days'}` : ''
		].filter(Boolean);

		return {
			primaryResult: money(maturity),
			primaryLabel: 'Maturity amount',
			summary: `${money(P, true)} at ${pct(applied, 2)} for ${parts.join(' ')} earns ${money(interest)} in interest.`,
			secondaryMetrics: [
				{ label: 'Interest earned', value: money(interest) },
				{ label: 'Amount deposited', value: money(P) },
				{ label: 'Rate applied', value: pct(applied, 2) },
				{ label: 'Effective yearly return', value: pct(yieldPct, 3) }
			]
		};
	},
	content: {
		intro:
			'Use this FD calculator to find what a fixed deposit will pay at maturity, using the way Indian banks quote it: interest compounded quarterly unless you choose otherwise. Enter the tenure in years, months and days. The maths works in any currency.',
		howTo: [
			'Enter the deposit, the rate your bank quotes and the tenure.',
			'Pick how interest is worked out. Quarterly compounding is the usual Indian bank default, and simple interest suits payout FDs.',
			'Turn on the senior citizen rate if it applies, and edit the extra rate to match your bank.',
			'Read the maturity amount, the interest earned and the effective yearly return.'
		],
		about: [
			{
				heading: 'What is a fixed deposit?',
				paragraphs: [
					'A fixed deposit (FD) is a deposit you make with a bank for a set time, at a rate that is fixed on the day you open it. You get your money back with interest when the term ends.',
					'It is one of the lowest-risk ways to save. The trade-off is that the rate is modest, and breaking the FD early usually costs you a penalty.',
					'There are two main kinds. A cumulative FD adds the interest to the deposit and pays everything at maturity. A payout FD pays the interest out to you at regular intervals. This calculator covers both: compounding options for the first, and simple interest for the second.'
				]
			},
			{
				heading: 'How FD maturity is calculated',
				paragraphs: [
					'For a cumulative FD, the bank divides the yearly rate by the number of times interest is added a year. Indian banks usually add interest every quarter, so a 7% FD earns 1.75% each quarter, and that interest earns interest too.',
					'The calculator uses the compound interest formula shown below. Days are counted as days divided by 365. Banks may count days a little differently, so your bank’s figure can differ slightly.'
				]
			},
			{
				heading: 'How compounding changes the result',
				paragraphs: [
					'The more often interest is added, the more you earn. The table uses ₹1,00,000 at 7% for 5 years. The gap is small, but it grows with bigger deposits and longer terms.'
				],
				table: {
					caption: '₹1,00,000 at 7% for 5 years',
					columns: ['Interest type', 'Maturity amount', 'Interest earned'],
					rows: [
						['Compounded monthly', '₹1,41,762.53', '₹41,762.53'],
						['Compounded quarterly', '₹1,41,477.82', '₹41,477.82'],
						['Compounded half-yearly', '₹1,41,059.88', '₹41,059.88'],
						['Compounded yearly', '₹1,40,255.17', '₹40,255.17'],
						['Simple interest', '₹1,35,000.00', '₹35,000.00']
					]
				}
			},
			{
				heading: 'How the tenure changes the result',
				paragraphs: [
					'A longer FD earns more in total, and it also benefits more from compounding. At 7% compounded quarterly, ₹1,00,000 grows as shown below. Quarterly compounding makes the effective yearly return 7.186%, a little above the quoted 7%.'
				],
				table: {
					caption: '₹1,00,000 at 7%, compounded quarterly',
					columns: ['Tenure', 'Maturity amount', 'Interest earned'],
					rows: [
						['1 year', '₹1,07,185.90', '₹7,185.90'],
						['3 years', '₹1,23,143.93', '₹23,143.93'],
						['5 years', '₹1,41,477.82', '₹41,477.82'],
						['10 years', '₹2,00,159.73', '₹1,00,159.73']
					]
				}
			},
			{
				heading: 'Tax on FD interest in India',
				paragraphs: [
					`FD interest is part of your income, and it is taxed at your slab rate. Banks also deduct TDS (tax deducted at source) at ${FD_TDS_RATE_PCT}% with PAN once the interest at one bank passes ${inr(FD_TDS_THRESHOLD)} in a year. For senior citizens, the limit is ${inr(FD_TDS_THRESHOLD_SENIOR)}.`,
					'This calculator shows interest before tax. To see what your slab rate means, use the [India income tax calculator](/india-income-tax-calculator).'
				]
			},
			{
				heading: 'Tips for choosing an FD',
				paragraphs: ['A few simple checks can improve what you earn:'],
				list: [
					'**Compare the effective yield, not only the rate.** Two banks with the same rate can pay different amounts if they compound differently.',
					'**Ask about senior citizen rates.** Banks usually add about half a percentage point for senior citizens, but each bank sets its own.',
					'**Spread large deposits.** Splitting a big amount across banks or terms can help with TDS limits and access to your money.',
					'**Compare with other safe options.** The [RD calculator](/rd-calculator) suits monthly saving. The [NSC](/nsc-calculator) and [PPF](/ppf-calculator) are government schemes with their own rates.',
					'**Plan for inflation.** If the FD rate is close to inflation, your money grows little in real terms.'
				]
			}
		],
		formulas: [
			{
				title: 'Compound interest',
				expression: 'A = P × (1 + r ÷ n)^(n × t)',
				variables: [
					{ symbol: 'P', meaning: 'deposit' },
					{ symbol: 'r', meaning: 'annual rate as a decimal' },
					{ symbol: 'n', meaning: 'compounding periods a year (quarterly 4, monthly 12, half-yearly 2, yearly 1)' },
					{ symbol: 't', meaning: 'tenure in years: (years × 12 + months) ÷ 12 + days ÷ 365' }
				]
			},
			{
				title: 'Simple interest',
				expression: 'A = P × (1 + r × t)',
				variables: [{ symbol: 'A', meaning: 'principal plus interest, with no interest on interest' }]
			}
		],
		example: {
			title: '₹1,00,000 at 7% for 5 years, compounded quarterly',
			steps: [
				'Rate per quarter: 7% ÷ 4 = 1.75%',
				'Quarters: 5 × 4 = 20',
				'A = 1,00,000 × 1.0175²⁰ = ₹1,41,477.82',
				'Interest = ₹41,477.82'
			],
			result: 'Maturity amount ₹1,41,477.82, an effective yearly return of 7.186%.'
		},
		faq: [
			{
				q: 'How do I calculate the maturity amount of an FD?',
				a: 'Use A = P × (1 + r ÷ n)^(n × t). Here P is the deposit, r the yearly rate, n the number of times interest is added in a year, and t the years. This calculator does the steps for you.'
			},
			{
				q: 'Is tax deducted from FD interest?',
				a: `Banks in India deduct TDS at ${FD_TDS_RATE_PCT}% (with PAN) once interest at one bank passes ${inr(FD_TDS_THRESHOLD)} in a year, or ${inr(FD_TDS_THRESHOLD_SENIOR)} for senior citizens. This calculator shows interest before tax and does not deduct anything. Interest is taxable at your slab rate.`
			},
			{
				q: 'Why quarterly compounding?',
				a: 'Most Indian banks add interest to a cumulative FD every quarter. If your bank compounds differently, change the interest option.'
			},
			{
				q: 'What is the difference between an FD and an RD?',
				a: 'An FD takes one lump sum at the start. An RD takes a fixed amount every month. Both pay interest at a rate set when you open them. Try the [RD calculator](/rd-calculator) for monthly saving.'
			},
			{
				q: 'Can I use this outside India?',
				a: 'Yes, the maths is general and the currency is switchable. The defaults and the tax note follow Indian bank practice. Banks may count days or round differently, so the bank’s own figure can differ slightly.'
			}
		],
		sources: [DEPOSIT_TDS_SOURCE, BANK_DEPOSIT_SOURCE],
		disclaimer:
			'Estimates only. Banks set rates, day counts, rounding and early-withdrawal penalties. Interest is shown before tax and TDS.'
	}
});
