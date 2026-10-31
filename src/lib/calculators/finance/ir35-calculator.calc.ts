import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './ir35-calculator.meta';
import {
	APPRENTICESHIP_LEVY_RATE,
	CT_LOWER_LIMIT,
	CT_MAIN_RATE,
	CT_SMALL_RATE,
	CT_UPPER_LIMIT,
	DIVIDEND_ALLOWANCE,
	DIVIDEND_RATES,
	NI_EMPLOYER_RATE,
	NI_SECONDARY_THRESHOLD,
	PERSONAL_ALLOWANCE,
	STANDARD_TAX_CODE,
	UK_CORPORATION_TAX_SOURCE,
	UK_DIVIDEND_SOURCE,
	UK_INCOME_TAX_RATES_TABLE_SOURCE,
	UK_RATES_SOURCE,
	UK_TAX_YEAR
} from '../data/uk-tax-2026-27';
import {
	STANDARD_CODE,
	corporationTax,
	dividendTax,
	employeeNI,
	employerNI,
	incomeTax,
	taperedAllowance,
	type ParsedCode
} from '../data/uk-tax-engine';

type Costs = 'ontop' | 'ni' | 'nilevy';

/** Deemed employment payment D left after the fee-payer deducts employer costs from a gross fee G. */
export function deemedPayment(gross: number, costs: Costs): number {
	if (costs === 'ontop') return gross;
	const levy = costs === 'nilevy' ? APPRENTICESHIP_LEVY_RATE : 0;
	// G = D + 15% × (D − £5,000) + levy × D, when D is above the secondary threshold.
	const above = (gross + NI_EMPLOYER_RATE * NI_SECONDARY_THRESHOLD) / (1 + NI_EMPLOYER_RATE + levy);
	if (above > NI_SECONDARY_THRESHOLD) return above;
	return gross / (1 + levy);
}

export function insideTakeHome(gross: number, costs: Costs) {
	const d = deemedPayment(gross, costs);
	const tax = incomeTax(d, 'rest', STANDARD_CODE).tax;
	const ni = employeeNI(d).total;
	return { deemed: d, employerCosts: gross - d, tax, ni, net: d - tax - ni };
}

export function outsideTakeHome(revenue: number, running: number, salary: number) {
	const erNI = employerNI(salary);
	const profit = revenue - running - salary - erNI;
	const ct = corporationTax(profit);
	const dividends = Math.max(0, profit - ct);
	const allowance = taperedAllowance(salary + dividends);
	const salaryCode: ParsedCode = { kind: 'allowance', amount: allowance, rate: 0, taper: false };
	const salaryTax = incomeTax(salary, 'rest', salaryCode).tax;
	const ni = employeeNI(salary).total;
	const divTax = dividendTax(salary, dividends).tax;
	return { erNI, profit, ct, dividends, salaryTax, ni, divTax, net: salary - salaryTax - ni + dividends - divTax };
}

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;

// The default case (day rate 500, 220 days), worked out with the calculator's own functions.
const DEFAULT_DAYS = 220;
const EX_GROSS = 500 * DEFAULT_DAYS;
const EX_IN = insideTakeHome(EX_GROSS, 'ni');
const EX_OUT = outsideTakeHome(EX_GROSS, 0, PERSONAL_ALLOWANCE);
const EX_BREAK_EVEN = (() => {
	let lo = 0;
	let hi = 500 * 20;
	for (let i = 0; i < 80; i++) {
		const mid = (lo + hi) / 2;
		if (insideTakeHome(mid * DEFAULT_DAYS, 'ni').net < EX_OUT.net) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
})();

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'rate', label: 'Day rate', type: 'number', default: 500, min: 0, max: 10_000, step: 10, prefix: '$' },
		{ id: 'days', label: 'Days worked per year', type: 'number', default: 220, min: 1, max: 365, step: 1, decimal: false, suffix: 'days' },
		{
			id: 'costs',
			label: 'Inside IR35: employer costs',
			type: 'select',
			display: 'segmented',
			default: 'ni',
			options: [
				{ label: 'Client pays', value: 'ontop' },
				{ label: 'NI deducted', value: 'ni' },
				{ label: 'NI + levy', value: 'nilevy' }
			],
			help: 'Whether the fee-payer takes employer NI (and the 0.5% apprenticeship levy) out of your rate.'
		},
		{
			id: 'salary',
			label: 'Outside IR35: director salary',
			type: 'number',
			default: PERSONAL_ALLOWANCE,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			help: 'Default is the £12,570 personal allowance.'
		},
		{ id: 'running', label: 'Outside IR35: company running costs', type: 'number', default: 0, min: 0, max: 10_000_000, step: 100, prefix: '$', suffix: '/yr', help: 'Accountant, insurance and similar.' }
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Extra take-home outside IR35', summary });
		const rate = Number(v.rate);
		const days = Number(v.days);
		const salary = Number(v.salary);
		const running = Number(v.running);
		const costs = (['ontop', 'ni', 'nilevy'].includes(String(v.costs)) ? String(v.costs) : 'ni') as Costs;
		if (!(rate > 0) || !(days >= 1) || !Number.isFinite(rate * days)) return fail('Enter a day rate and the days you work.');
		if (!(salary >= 0) || !(running >= 0) || !Number.isFinite(salary + running)) return fail('Enter your director salary and running costs.');
		const gross = rate * days;
		if (salary > gross) return fail('The director salary cannot be more than your contract income.');

		const inside = insideTakeHome(gross, costs);
		const out = outsideTakeHome(gross, running, salary);

		// Day rate inside IR35 that would give the same take-home as outside.
		let lo = 0;
		let hi = rate * 20;
		for (let i = 0; i < 80; i++) {
			const mid = (lo + hi) / 2;
			if (insideTakeHome(mid * days, costs).net < out.net) lo = mid;
			else hi = mid;
		}
		const breakEven = (lo + hi) / 2;
		const diff = out.net - inside.net;

		const rows: Record<string, string>[] = [];
		const row = (item: string, a: number | null, b: number | null) =>
			rows.push({ item, inside: a === null ? '—' : money(a), outside: b === null ? '—' : money(b) });
		row('Contract income', gross, gross);
		row('Company running costs', null, -running);
		row('Employer NI and levy', -inside.employerCosts, -out.erNI);
		row('Corporation tax', null, -out.ct);
		row('Salary / deemed payment', inside.deemed, salary);
		row('Dividends', null, out.dividends);
		row('Income tax on pay', -inside.tax, -out.salaryTax);
		row('Employee National Insurance', -inside.ni, -out.ni);
		row('Income tax on dividends', null, -out.divTax);
		row('Take-home per year', inside.net, out.net);
		row('Take-home per month', inside.net / 12, out.net / 12);

		return {
			primaryResult: money(diff),
			primaryLabel: diff >= 0 ? 'Extra take-home outside IR35 (per year)' : 'Take-home lost outside IR35 (per year)',
			summary: `Outside IR35 you keep ${money(out.net)} a year; inside IR35 you keep ${money(inside.net)}. An inside-IR35 day rate of ${money(breakEven)} would match the outside take-home.`,
			secondaryMetrics: [
				{ label: 'Inside IR35 take-home', value: money(inside.net) },
				{ label: 'Outside IR35 take-home', value: money(out.net) },
				{ label: 'Inside, share of contract income', value: pct((inside.net / gross) * 100, 1) },
				{ label: 'Outside, share of contract income', value: pct((out.net / gross) * 100, 1) },
				{ label: 'Inside day rate that matches outside', value: money(breakEven) },
				{ label: 'Corporation tax (outside)', value: money(out.ct) },
				{ label: 'Dividend tax (outside)', value: money(out.divTax) }
			],
			table: {
				title: 'Inside vs outside IR35, per year',
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'inside', label: 'Inside IR35', align: 'end' },
					{ key: 'outside', label: 'Outside IR35', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Compare a UK contractor’s take-home pay inside IR35 (taxed like an employee) and outside IR35 (through your own limited company) for ${UK_TAX_YEAR}. Enter your day rate and days worked to see the yearly difference and the day rate that would make the two equal.`,
		howTo: [
			'Enter your day rate and how many days you work each year.',
			'Choose whether the fee-payer takes employer National Insurance (and the apprenticeship levy) out of your rate inside IR35.',
			'Set your director salary and company running costs for the outside IR35 case.',
			'Compare the two take-home figures and the day rate that would make them equal.'
		],
		about: [
			{
				heading: 'What is IR35?',
				paragraphs: [
					'IR35 is the name for the UK “off-payroll working” rules. They apply when you work for a client through your own limited company but, in practice, you work like an employee. If HMRC rules say you are in that position, you are “inside IR35”.',
					'Inside IR35, the fee is treated as a salary-like payment and taxed as employment income. Outside IR35, your company keeps the profit, pays corporation tax and then pays you a salary and dividends.',
					'Your status depends on the facts of each contract, not on this calculator. In many cases the client decides and tells you. HMRC’s Check Employment Status for Tax (CEST) tool can help you understand the rules.'
				]
			},
			{
				heading: 'How take-home pay is worked out inside IR35',
				paragraphs: [
					`Inside IR35, the fee-payer (the client or an agency) pays employer National Insurance on the deemed payment. Employer NI is ${pc(NI_EMPLOYER_RATE)} of pay above ${gbp(NI_SECONDARY_THRESHOLD)}. Many agencies take this cost out of your rate, so you can choose that option here. A further ${pc(APPRENTICESHIP_LEVY_RATE)} apprenticeship levy can also be taken out.`,
					`What is left is taxed like a salary. You pay income tax with the ${STANDARD_TAX_CODE} code and employee National Insurance. There are no dividends and no company costs.`
				],
				table: {
					caption: `Inside IR35 take-home on ${gbp(EX_GROSS)} a year, by who pays the employer costs`,
					columns: ['Employer costs', 'Take-home per year'],
					rows: [
						['Client pays them on top', gbp(insideTakeHome(EX_GROSS, 'ontop').net)],
						['Taken out of your rate', gbp(insideTakeHome(EX_GROSS, 'ni').net)],
						['Taken out, plus apprenticeship levy', gbp(insideTakeHome(EX_GROSS, 'nilevy').net)]
					]
				}
			},
			{
				heading: 'How take-home pay is worked out outside IR35',
				paragraphs: [
					`Outside IR35, your company receives the fee. It pays you a director’s salary, pays employer National Insurance, covers running costs, and pays corporation tax on the profit. The tax is ${pc(CT_SMALL_RATE)} on profit up to ${gbp(CT_LOWER_LIMIT)}, ${pc(CT_MAIN_RATE)} above ${gbp(CT_UPPER_LIMIT)}, and marginal relief in between.`,
					`The calculator then pays all the after-tax profit out as dividends. You get a ${gbp(DIVIDEND_ALLOWANCE)} dividend allowance. After that, dividends are taxed at ${pc(DIVIDEND_RATES.basic)} (basic rate), ${pc(DIVIDEND_RATES.higher)} (higher rate) and ${pc(DIVIDEND_RATES.additional)} (additional rate).`,
					`The default salary is the ${gbp(PERSONAL_ALLOWANCE)} personal allowance, so you pay no income tax or employee National Insurance on it. The company pays employer National Insurance instead.`
				]
			},
			{
				heading: 'Reading your result',
				paragraphs: [
					`The main figure is the difference per year. In the default case (${gbp(500)} a day for ${DEFAULT_DAYS} days, so ${gbp(EX_GROSS)} a year), you keep about ${gbp(EX_OUT.net)} outside IR35 and about ${gbp(EX_IN.net)} inside.`,
					`The break-even day rate tells you what an inside-IR35 contract must pay to match the outside take-home. In this case it is about ${gbp(EX_BREAK_EVEN)} a day. Use it when a client offers an inside-IR35 rate.`,
					'Remember that outside IR35 brings extra costs and work, such as an accountant and company filings. Inside IR35 you also build up employee rights with the client. Add those to your own comparison. For VAT on your invoices, use the [VAT calculator](/vat-calculator).'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It assumes England, Wales or Northern Ireland tax rates. If you pay Scottish income tax, the salary part of your result will differ, so check it with the [UK take-home pay calculator](/uk-take-home-pay-calculator).',
					'It also leaves out pensions, student loans, expenses claims, other income and VAT. To see how a student loan changes your pay, use the [UK student loan calculator](/uk-student-loan-calculator). To plan a purchase, try the [UK mortgage calculator](/uk-mortgage-calculator).',
					`The figures use the rates on 28 October 2026. A later Budget may change income tax, National Insurance, dividend or corporation tax rates, so check again after any announcement.`
				]
			}
		],
		formulas: [
			{
				title: 'Inside IR35',
				expression: `Fee = D + ${pc(NI_EMPLOYER_RATE)} × (D − ${gbp(NI_SECONDARY_THRESHOLD)}) [+ ${pc(APPRENTICESHIP_LEVY_RATE)} × D]; take-home = D − income tax(D) − employee NI(D)`,
				variables: [{ symbol: 'D', meaning: 'the deemed employment payment left after employer NI (and levy) are deducted from your fee' }]
			},
			{
				title: 'Outside IR35 (limited company)',
				expression: 'Profit = income − costs − salary − employer NI; after-tax profit = profit − corporation tax; take-home = salary − tax − NI + dividends − dividend tax',
				variables: [
					{
						symbol: 'Corporation tax',
						meaning: `${pc(CT_SMALL_RATE)} up to ${gbp(CT_LOWER_LIMIT)}, ${pc(CT_MAIN_RATE)} over ${gbp(CT_UPPER_LIMIT)}, marginal relief between (${pc(CT_MAIN_RATE)} less 3/200 × (${gbp(CT_UPPER_LIMIT)} − profit))`
					},
					{ symbol: 'Dividends', meaning: `${gbp(DIVIDEND_ALLOWANCE)} allowance, then ${pc(DIVIDEND_RATES.basic)}, ${pc(DIVIDEND_RATES.higher)} and ${pc(DIVIDEND_RATES.additional)}` }
				]
			}
		],
		example: {
			title: `${gbp(500)} a day, ${DEFAULT_DAYS} days, default settings (employer NI deducted)`,
			steps: [
				`Contract income = ${gbp(500)} × ${DEFAULT_DAYS} = ${gbp(EX_GROSS)}`,
				`Inside IR35: the deemed payment is (${gbp(EX_GROSS)} + ${gbp(NI_EMPLOYER_RATE * NI_SECONDARY_THRESHOLD)}) ÷ ${(1 + NI_EMPLOYER_RATE).toFixed(2)} = ${gbp2(EX_IN.deemed)} after ${gbp2(EX_IN.employerCosts)} of employer NI`,
				`Outside IR35: salary ${gbp(PERSONAL_ALLOWANCE)}, employer NI ${gbp2(EX_OUT.erNI)}, corporation tax ${gbp2(EX_OUT.ct)}, dividends ${gbp2(EX_OUT.dividends)}`
			],
			result: `Outside IR35 you keep about ${gbp(EX_OUT.net)} a year compared with about ${gbp(EX_IN.net)} inside IR35.`
		},
		faq: [
			{
				q: 'What is the difference between inside and outside IR35?',
				a: 'Inside IR35, you are taxed as an employee on the fee, after employer costs. Outside IR35, your company pays corporation tax and you take a salary and dividends. Outside IR35 is often higher but depends on the facts of the contract.'
			},
			{
				q: 'Why can the fee-payer deduct employer NI?',
				a: 'Under the off-payroll rules the fee-payer pays employer National Insurance on the deemed payment. Many agencies and clients build that cost into the rate they offer, which is why you can choose whether it comes off your rate.'
			},
			{
				q: 'What assumptions does this make?',
				a: 'It assumes England, Wales and Northern Ireland tax rates and one director with no other income or employees. All profit is paid out as dividends in the same year. There is no pension, expenses claim, student loan or VAT, and no Employment Allowance.'
			},
			{
				q: 'How is the break-even day rate worked out?',
				a: 'The calculator tests inside-IR35 day rates until the take-home matches your outside-IR35 take-home. It uses the same days and the employer cost option you chose.'
			},
			{
				q: 'Is this tax advice?',
				a: 'No. IR35 status depends on the facts of each engagement. Use the HMRC CEST tool or take advice from an accountant, and check current rates after any Budget.'
			}
		],
		sources: [UK_RATES_SOURCE, UK_INCOME_TAX_RATES_TABLE_SOURCE, UK_DIVIDEND_SOURCE, UK_CORPORATION_TAX_SOURCE],
		disclaimer: `Estimate for ${UK_TAX_YEAR} only. Your real position depends on your contract, expenses, other income and company circumstances. Not tax advice.`
	}
});
