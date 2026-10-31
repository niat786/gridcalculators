import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct, plural } from '../format';
import meta from './rrsp-calculator.meta';
import { CA_TAX_YEAR, CRA_LIMITS_SOURCE, RRSP_DOLLAR_LIMIT_2026, RRSP_EARNED_INCOME_RATE } from '../data/ca-tax-2026';

/** Content is written once at build time, so format dollars explicitly (CA$33,810). */
const cad = (n: number) => moneyIn('CAD', n, true);
const newRoom85k = Math.min(85_000 * RRSP_EARNED_INCOME_RATE, RRSP_DOLLAR_LIMIT_2026);

/** Future value with annual compounding; contributions at the end (or start) of each year. */
export function rrspFutureValue(start: number, yearly: number, ratePct: number, years: number, atStart: boolean): number {
	const r = ratePct / 100;
	const growth = Math.pow(1 + r, years);
	const annuity = r === 0 ? yearly * years : (yearly * (growth - 1)) / r;
	return start * growth + annuity * (atStart ? 1 + r : 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'savings', label: 'Current RRSP savings', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'contribution', label: 'Yearly contribution', type: 'number', default: 6000, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr' },
		{ id: 'rate', label: 'Annual return', type: 'number', default: 6, min: 0, max: 30, step: 0.1, suffix: '%', help: 'Average yearly growth, after fund fees.' },
		{ id: 'years', label: 'Years to grow', type: 'number', default: 20, min: 1, max: 60, step: 1, suffix: 'years', decimal: false },
		{ id: 'marginal', label: 'Marginal tax rate', type: 'number', default: 30.5, min: 0, max: 60, step: 0.1, suffix: '%', help: 'Tax on your next dollar. The Canada Income Tax Calculator shows yours.' },
		{
			id: 'timing',
			label: 'Contributions made',
			type: 'select',
			display: 'segmented',
			default: 'end',
			options: [
				{ label: 'End of year', value: 'end' },
				{ label: 'Start of year', value: 'start' }
			]
		},
		{ id: 'earned', label: 'Last year’s earned income', type: 'number', default: 85000, min: 0, max: 100_000_000, step: 1000, prefix: '$', help: 'Your 2025 earned income (employment, self-employment, rental) for the 2026 limit.' },
		{ id: 'pa', label: 'Pension adjustment', type: 'number', default: 0, min: 0, max: 1_000_000, step: 100, prefix: '$', help: 'From your 2025 T4, if you are in a workplace pension.' },
		{ id: 'carry', label: 'Unused room carried forward', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', help: 'From your latest CRA notice of assessment.' }
	],
	calculate(v): CalculationResult {
		const savings = Number(v.savings);
		const yearly = Number(v.contribution);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const marginal = Number(v.marginal);
		const earned = Number(v.earned);
		const pa = Number(v.pa);
		const carry = Number(v.carry);
		const atStart = v.timing === 'start';
		const ok = [savings, yearly, rate, marginal, earned, pa, carry].every((n) => Number.isFinite(n) && n >= 0) && Number.isFinite(years) && years >= 1 && years <= 60 && rate <= 30 && marginal <= 60;
		if (!ok) {
			return { primaryResult: DASH, primaryLabel: 'RRSP value', summary: 'Enter amounts of zero or more, a return up to 30% and between 1 and 60 years.' };
		}
		const fv = rrspFutureValue(savings, yearly, rate, years, atStart);
		const contributed = savings + yearly * years;
		const growth = fv - contributed;
		const refundYear = (yearly * marginal) / 100;
		const newRoom = Math.min(earned * RRSP_EARNED_INCOME_RATE, RRSP_DOLLAR_LIMIT_2026);
		const totalRoom = Math.max(0, newRoom - pa + carry);
		const over = yearly > totalRoom;
		return {
			primaryResult: money(fv),
			primaryLabel: `RRSP value after ${plural(years, 'year')}`,
			summary: `${money(contributed)} put in grows by ${money(growth)} at ${pct(rate, 2)}. Each year’s contribution brings a tax refund of about ${money(refundYear)}.${
				over ? ' Your yearly contribution is more than your 2026 room, so check your CRA notice of assessment before contributing.' : ''
			}`,
			secondaryMetrics: [
				{ label: 'Total contributed (incl. savings)', value: money(contributed) },
				{ label: 'Investment growth', value: money(growth) },
				{ label: 'Tax refund per year', value: money(refundYear) },
				{ label: `Total refunds over ${plural(years, 'year')}`, value: money(refundYear * years) },
				{ label: 'New 2026 room (18% of earned income)', value: money(newRoom) },
				{ label: 'Total 2026 deduction limit', value: money(totalRoom) },
				{ label: 'Room left after this year’s contribution', value: money(Math.max(0, totalRoom - yearly)) }
			]
		};
	},
	content: {
		intro: `Project the value of your Registered Retirement Savings Plan (RRSP) and the tax refund your contributions create. This RRSP calculator also works out your ${CA_TAX_YEAR} deduction limit: ${pct(RRSP_EARNED_INCOME_RATE * 100, 0)} of last year's earned income, up to ${cad(RRSP_DOLLAR_LIMIT_2026)}, plus unused room.`,
		howTo: [
			'Enter your current RRSP savings, your yearly contribution, the return you expect and the number of years.',
			'Choose whether you contribute at the start or the end of each year.',
			'Enter your marginal tax rate to see the refund each contribution brings. The Canada income tax calculator shows yours.',
			`Enter last year's earned income, any pension adjustment and carried-forward room to see your ${CA_TAX_YEAR} limit.`
		],
		about: [
			{
				heading: 'What is an RRSP?',
				paragraphs: [
					'An RRSP is a Canadian savings account for retirement. You can hold savings, bonds, funds or shares inside it. The government registers it, which is why it gets special tax treatment.',
					'There are three main rules. First, you deduct your contributions from your income, so you pay less tax now. Second, your money grows without yearly tax. Third, you pay income tax on what you take out later.',
					'In short, an RRSP moves tax from today to the future. It works best if your tax rate in retirement is lower than your rate while you work.'
				]
			},
			{
				heading: `How your ${CA_TAX_YEAR} RRSP limit works`,
				paragraphs: [
					`You cannot put in unlimited money and deduct it. Each year you earn new room equal to ${pct(RRSP_EARNED_INCOME_RATE * 100, 0)} of your earned income from the year before. That new room is capped at the dollar limit, which is ${cad(RRSP_DOLLAR_LIMIT_2026)} for ${CA_TAX_YEAR}.`,
					`Then two things adjust it. A pension adjustment, if you are in a workplace pension plan, reduces your room. Unused room from earlier years adds to it. Your CRA notice of assessment and My Account show your exact figure.`,
					`For example, with ${cad(85_000)} of earned income and no other changes, your new room is ${moneyIn('CAD', newRoom85k, true)}. Earned income includes salary, self-employment and rental income.`
				]
			},
			{
				heading: 'How the calculator projects growth',
				paragraphs: [
					'The calculator adds your contributions to your savings and grows the total at a steady yearly return. Contributions at the start of the year earn one more year of growth than contributions at the end.',
					'The table uses the default case of CA$10,000 saved and CA$6,000 added each year for 20 years. It shows how much the return rate matters.'
				],
				table: {
					caption: 'CA$10,000 saved, CA$6,000 a year, 20 years, end-of-year contributions',
					columns: ['Annual return', 'RRSP value', 'Growth'],
					rows: [4, 6, 8].map((r) => {
						const fv = rrspFutureValue(10_000, 6_000, r, 20, false);
						return [`${r}%`, moneyIn('CAD', fv, true), moneyIn('CAD', fv - 130_000, true)];
					})
				}
			},
			{
				heading: 'How much tax refund do you get?',
				paragraphs: [
					'Your refund is the contribution times your marginal tax rate. The marginal rate is the tax on your next dollar of income, so it changes with your income and province. To find yours, use the [Canada income tax calculator](/canada-income-tax-calculator).',
					'The refund is not free money. You pay tax on RRSP withdrawals later, so the real gain comes from growth and from a lower rate in retirement. For tax-free withdrawals instead, compare the [TFSA calculator](/tfsa-calculator).'
				],
				table: {
					caption: 'Refund on a CA$6,000 contribution',
					columns: ['Marginal tax rate', 'Refund'],
					rows: [20, 30.5, 43].map((r) => [`${r}%`, moneyIn('CAD', (6_000 * r) / 100, true)])
				}
			},
			{
				heading: 'Tips and what the calculator leaves out',
				paragraphs: [
					'A few habits make an RRSP work harder. Also keep in mind what the numbers do not include:'
				],
				list: [
					'**Check your room first.** Look at your notice of assessment before you contribute.',
					'**Use your refund.** Put it back into the RRSP or pay down debt, so the tax saving keeps working.',
					'**Watch fees.** Enter a return after fund fees, because a small yearly fee adds up over 20 years.',
					'**Plan the income side.** The [CPP calculator](/cpp-calculator) shows what the public pension might add.',
					'**Remember the limits of the model.** It uses one steady return, does not adjust for inflation and does not tax withdrawals.'
				]
			}
		],
		formulas: [
			{
				title: 'Future value',
				expression: 'FV = S × (1 + r)ⁿ + C × ((1 + r)ⁿ − 1) ÷ r',
				variables: [
					{ symbol: 'S', meaning: 'current savings' },
					{ symbol: 'C', meaning: 'yearly contribution (made at the end of each year; × (1 + r) if at the start)' },
					{ symbol: 'r', meaning: 'annual return as a decimal' },
					{ symbol: 'n', meaning: 'number of years' }
				]
			},
			{
				title: `${CA_TAX_YEAR} deduction limit`,
				expression: `Limit = min(${pct(RRSP_EARNED_INCOME_RATE * 100, 0)} × earned income last year, ${cad(RRSP_DOLLAR_LIMIT_2026)}) − pension adjustment + unused room`,
				variables: [{ symbol: 'Refund', meaning: 'Contribution × marginal tax rate' }]
			}
		],
		example: {
			title: '$10,000 saved, $6,000 a year at 6% for 20 years',
			steps: [
				'Growth of savings: $10,000 × 1.06²⁰ = $32,071.35.',
				'Growth of contributions: $6,000 × (1.06²⁰ − 1) ÷ 0.06 = $220,713.55.',
				'Value = $32,071.35 + $220,713.55 = $252,784.90.',
				'Refund each year at 30.5%: $6,000 × 0.305 = $1,830.00.'
			],
			result: 'RRSP value $252,784.90 after 20 years; total refunds $36,600.00. With $85,000 of earned income the new 2026 room is $15,300.00.'
		},
		faq: [
			{
				q: `What is the RRSP limit for ${CA_TAX_YEAR}?`,
				a: `The RRSP dollar limit for ${CA_TAX_YEAR} is ${cad(RRSP_DOLLAR_LIMIT_2026)}. Your own limit is ${pct(RRSP_EARNED_INCOME_RATE * 100, 0)} of your earned income from the year before, up to that amount. Then subtract any pension adjustment and add unused room from earlier years.`
			},
			{
				q: 'How does an RRSP tax refund work?',
				a: 'You deduct the contribution from your income, so your tax falls by the contribution times your marginal tax rate. At 30.5%, a $6,000 contribution brings about $1,830 back. Withdrawals later are taxed as income.'
			},
			{
				q: 'Where do I find my unused RRSP room?',
				a: 'Your CRA notice of assessment and your My Account on the CRA site show your RRSP deduction limit and unused contributions.'
			},
			{
				q: 'What rate of return should I enter?',
				a: 'Use a modest, steady figure after fees, such as the long-run average you hope your mix of funds can earn. Real returns change every year and are never guaranteed. Try 4%, 6% and 8% to see the range.'
			},
			{
				q: 'Is the result in today\'s dollars?',
				a: 'No. The projected value is in future dollars and is not adjusted for inflation. Prices will probably be higher by then, so the same amount will buy less than it does today.'
			},
			{
				q: 'Should I choose an RRSP or a TFSA?',
				a: 'It depends on your tax rate now and later. An RRSP helps most when your rate today is high. A TFSA gives tax-free withdrawals but no deduction. Many people use both.'
			}
		],
		sources: [CRA_LIMITS_SOURCE],
		disclaimer: 'Projections assume a steady return and are not guaranteed. Check your RRSP room with the CRA before contributing. This is not financial advice.'
	}
});
