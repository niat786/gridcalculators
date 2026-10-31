import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './post-office-mis-calculator.meta';
import {
	MIS_MAX_JOINT,
	MIS_MAX_SINGLE,
	MIS_MIN,
	MIS_MULTIPLE,
	MIS_RATE,
	MIS_TERM_YEARS,
	NSI_SOURCE,
	SCSS_RATE,
	SMALL_SAVINGS_PERIOD,
	SMALL_SAVINGS_PERIOD_SHORT,
	SMALL_SAVINGS_RATE_SOURCE,
	SMALL_SAVINGS_RATE_SOURCE_2
} from '../data/in-savings-2026';

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Monthly income', summary });

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'type',
			label: 'Account type',
			type: 'select',
			display: 'segmented',
			default: 'single',
			options: [
				{ label: 'Single (₹9 lakh)', value: 'single' },
				{ label: 'Joint (₹15 lakh)', value: 'joint' }
			],
			help: 'A joint account can have two or three holders. Your single accounts together cannot pass ₹9 lakh.'
		},
		{ id: 'amount', label: 'Amount deposited', type: 'number', default: 900000, min: MIS_MIN, max: MIS_MAX_JOINT, step: MIS_MULTIPLE, prefix: '$', help: 'In multiples of ₹1,000.' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: MIS_RATE, min: 0, max: 20, step: 0.1, suffix: '%', help: `${SMALL_SAVINGS_PERIOD_SHORT} rate. The rate on the day you open the account stays fixed for the 5 years.` }
	],
	calculate(v: InputValues): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const joint = v.type === 'joint';
		const limit = joint ? MIS_MAX_JOINT : MIS_MAX_SINGLE;
		if (!Number.isFinite(amount) || amount < MIS_MIN) return fail('Enter at least ₹1,000.');
		if (amount > limit) return fail(`The limit for a ${joint ? 'joint' : 'single'} account is ${money(limit, true)}.`);
		if (amount % MIS_MULTIPLE !== 0) return fail('MIS deposits are in multiples of ₹1,000.');
		if (!Number.isFinite(rate) || rate < 0 || rate > 20) return fail('Enter an interest rate from 0% to 20%.');

		const yearly = (amount * rate) / 100;
		const monthly = yearly / 12;
		const total = yearly * MIS_TERM_YEARS;

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly income',
			summary: `${money(amount, true)} at ${pct(rate)} pays ${money(monthly)} a month for ${MIS_TERM_YEARS} years. The ${money(amount, true)} comes back at the end.`,
			secondaryMetrics: [
				{ label: 'Interest each year', value: money(yearly) },
				{ label: `Interest over ${MIS_TERM_YEARS} years`, value: money(total) },
				{ label: `Total received after ${MIS_TERM_YEARS} years`, value: money(amount + total) },
				{ label: 'Limit for this account type', value: money(limit, true) },
				{ label: 'Interest rate', value: pct(rate) }
			]
		};
	},
	content: {
		intro: `Use this post office MIS calculator to find the monthly income from a Monthly Income Scheme account. It uses the ${SMALL_SAVINGS_PERIOD} rate of ${MIS_RATE}%, with the ${inr(MIS_MAX_SINGLE)} limit for a single account and ${inr(MIS_MAX_JOINT)} for a joint account.`,
		howTo: [
			`Choose a single or joint account and enter the amount (multiples of ${inr(MIS_MULTIPLE)}).`,
			`Check the interest rate for the quarter in which you open the account. It stays fixed for the ${MIS_TERM_YEARS} years.`,
			`Read the monthly income and the total over ${MIS_TERM_YEARS} years.`
		],
		about: [
			{
				heading: 'What is the Post Office Monthly Income Scheme?',
				paragraphs: [
					`The Post Office Monthly Income Scheme (MIS) is a government-backed deposit that pays you interest every month. You put in a lump sum, and the term is ${MIS_TERM_YEARS} years. At the end, you get your deposit back.`,
					`The minimum is ${inr(MIS_MIN)}, in multiples of ${inr(MIS_MULTIPLE)}. The maximum is ${inr(MIS_MAX_SINGLE)} for a single account and ${inr(MIS_MAX_JOINT)} for a joint account. Your single accounts together cannot pass ${inr(MIS_MAX_SINGLE)}.`
				]
			},
			{
				heading: 'How the monthly income is calculated',
				paragraphs: [
					`The government sets the MIS rate every quarter. For ${SMALL_SAVINGS_PERIOD}, it is ${MIS_RATE}% a year. The rate on the day you open the account stays fixed for all ${MIS_TERM_YEARS} years.`,
					'The interest is simple. Since it is paid out each month and not added to the deposit, the income stays the same every month. The calculator takes the deposit times the yearly rate and divides by 12.',
					'In practice, the first payout comes one month after you invest. Because the amount is the same every month, it is easy to plan a household budget around it.'
				]
			},
			{
				heading: 'What different deposits pay',
				paragraphs: [
					'The income grows in direct proportion to the deposit. The table shows common amounts at 7.4%. Then, at the end of the term, the deposit itself comes back on top of the interest.'
				],
				table: {
					caption: `At ${MIS_RATE}% for ${MIS_TERM_YEARS} years`,
					columns: ['Account and deposit', 'Each month', 'Interest over 5 years'],
					rows: [
						['Single, ₹5,00,000', '₹3,083.33', '₹1,85,000'],
						['Single, ₹9,00,000', '₹5,550', '₹3,33,000'],
						['Joint, ₹15,00,000', '₹9,250', '₹5,55,000']
					]
				}
			},
			{
				heading: 'Single or joint account?',
				paragraphs: [
					'A joint account can have two or three holders, so it allows a bigger deposit. The interest on a joint account is shared by the holders according to the scheme rules.',
					'If you want to keep the money separate, use a single account. However, if you open more than one single account, remember that they all count toward the same ₹9 lakh limit.'
				]
			},
			{
				heading: 'MIS and tax',
				paragraphs: [
					'The interest from MIS is taxable at your slab rate. A deposit in MIS does not give a section 80C deduction. This calculator shows interest before tax.',
					'To find your slab and see the effect, use the [India income tax calculator](/india-income-tax-calculator).'
				]
			},
			{
				heading: 'MIS compared with other income options',
				paragraphs: [
					`If you are 60 or over, the [SCSS calculator](/scss-calculator) shows a higher rate of ${SCSS_RATE}% with quarterly payouts. For a growth option, the [FD calculator](/fd-calculator) and the [NSC calculator](/nsc-calculator) let you compare.`,
					'Monthly income is a good fit if you need cash flow, such as a retiree or a family with fixed bills. But if you do not need the income now, a scheme that compounds will grow more.'
				]
			},
			{
				heading: 'Tips for using MIS',
				paragraphs: ['A few points help you decide if MIS suits you:'],
				list: [
					'**Plan for the lock-in.** Early closure is not allowed in the first year, and later closures carry deductions, so use money you won’t need soon.',
					'**Check the rate on the day you open.** The rate is fixed from then on, so a good quarter is worth waiting for.',
					'**Think about inflation.** A fixed monthly income buys less each year.',
					'**Use the maturity money well.** When the 5 years end, you can reinvest in another scheme.'
				]
			}
		],
		formulas: [
			{
				expression: 'Monthly income = deposit × annual rate ÷ 12',
				variables: [
					{ symbol: 'deposit', meaning: 'amount in the account, up to ₹9 lakh (single) or ₹15 lakh (joint)' },
					{ symbol: 'annual rate', meaning: 'rate ÷ 100; interest is simple and paid out each month' }
				]
			}
		],
		example: {
			title: '₹9,00,000 in a single account at 7.4%',
			steps: [
				'Interest each year: ₹9,00,000 × 7.4% = ₹66,600.',
				'Each month: ₹66,600 ÷ 12 = ₹5,550.',
				'Over 5 years: ₹66,600 × 5 = ₹3,33,000, and the ₹9,00,000 comes back at maturity.'
			],
			result: '₹5,550 a month'
		},
		faq: [
			{
				q: 'What is the post office MIS interest rate now?',
				a: `It is ${MIS_RATE}% a year for ${SMALL_SAVINGS_PERIOD}. The rate stays fixed for the ${MIS_TERM_YEARS} years of your account.`
			},
			{
				q: 'How is the MIS monthly income calculated?',
				a: 'Multiply the deposit by the yearly rate, then divide by 12. For ₹9,00,000 at 7.4%, that is ₹5,550 a month.'
			},
			{
				q: 'How much can I invest in MIS?',
				a: `Up to ${inr(MIS_MAX_SINGLE)} in a single account (all your single accounts together) and up to ${inr(MIS_MAX_JOINT)} in a joint account. The minimum is ${inr(MIS_MIN)}, in multiples of ${inr(MIS_MULTIPLE)}.`
			},
			{
				q: 'Is MIS interest taxable?',
				a: 'Yes. The interest is taxed at your slab rate. This calculator shows interest before tax.'
			},
			{
				q: 'What is not included?',
				a: 'Tax on the interest, and the deductions on early closure (not allowed in the first year). The first monthly payout comes one month after you invest. The interest on a joint account is shared by the holders according to the scheme rules.'
			}
		],
		sources: [NSI_SOURCE, SMALL_SAVINGS_RATE_SOURCE, SMALL_SAVINGS_RATE_SOURCE_2],
		disclaimer: 'This is an estimate for general information, not financial advice. Rates are set by the Government of India each quarter; check India Post for the current rate. Interest is taxable.'
	}
});
