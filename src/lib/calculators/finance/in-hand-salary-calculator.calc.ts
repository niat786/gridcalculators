import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn } from '../format';
import meta from './in-hand-salary-calculator.meta';
import {
	CAP_80C,
	EPF_EMPLOYEE_RATE,
	EPF_EMPLOYER_RATE,
	GRATUITY_PROVISION_RATE,
	IN_EPF_CEILING_SOURCE,
	IN_REBATE_SOURCE,
	IN_TAX_SOURCE,
	IN_TAX_YEAR_FULL,
	IN_TAX_YEAR_LABEL,
	NEW_REGIME_REBATE_LIMIT,
	STANDARD_DEDUCTION_NEW,
	STANDARD_DEDUCTION_OLD,
	PT_STATES
} from '../data/in-tax-fy2026-27';
import { EPF_WAGE_CEILING, EPF_WAGE_CEILING_EFFECTIVE } from '../data/in-epf';
import { assess, type AssessInput } from '../data/in-tax-engine';

/** Content is written at build time, so format rupees explicitly (₹12,00,000). */
const inr = (n: number) => moneyIn('INR', n, true);
const PT_MAX_ANNUAL = Math.max(...PT_STATES.map((s) => s.annual));
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Monthly in-hand salary', summary });
const n0 = (x: unknown) => (Number.isNaN(Number(x)) ? 0 : Number(x));

function calculate(v: InputValues): CalculationResult {
	const ctc = Number(v.ctc);
	const basicPct = Number(v.basicPct);
	if (!(ctc > 0) || !(basicPct > 0 && basicPct <= 100)) return fail('Enter an annual CTC above zero and a basic salary between 0% and 100% of CTC.');

	const basic = (ctc * basicPct) / 100;
	const basicM = basic / 12;
	const pfWageM = v.pfBase === 'full' ? basicM : Math.min(basicM, EPF_WAGE_CEILING);
	const employeePf = pfWageM * 12 * EPF_EMPLOYEE_RATE;
	const employerPf = pfWageM * 12 * EPF_EMPLOYER_RATE;
	const gratuity = v.gratuity ? basic * GRATUITY_PROVISION_RATE : 0;
	const gross = ctc - (v.employerPfInCtc ? employerPf : 0) - gratuity;
	if (gross < basic) return fail('Basic salary, employer PF and gratuity add up to more than the CTC. Lower the basic percentage.');
	const grossM = gross / 12;

	// Professional tax
	const state = PT_STATES.find((s) => s.value === v.state) ?? PT_STATES[0];
	let ptAnnual = 0;
	if (state.value === 'custom') {
		const c = Number(v.customPt);
		if (!(c >= 0)) return fail('Enter your monthly professional tax as zero or more.');
		ptAnnual = c * 12;
	} else {
		if (grossM < state.minMonthly) return fail(`Your monthly gross pay is below this state's top professional tax slab. Choose "Other state" and enter your own amount.`);
		ptAnnual = state.annual;
	}

	const regime = v.regime === 'old' ? 'old' : 'new';
	const extra80c = regime === 'old' ? n0(v.extra80c) : 0;
	const input: AssessInput = {
		age: 'below60',
		salary: gross,
		otherIncome: 0,
		hraExemption: 0,
		ded80c: Math.min(CAP_80C, employeePf + extra80c),
		ded80d: 0,
		homeLoanInterest: 0,
		nps1b: 0,
		professionalTax: ptAnnual,
		otherDeductions: 0,
		employerNps: 0,
		basicDa: 0,
		govtEmployer: false
	};
	const a = assess(regime, input);
	const tax = a.tax.total;
	const inHand = gross - employeePf - ptAnnual - tax;
	const m = (x: number) => money(x / 12);
	const y = (x: number) => money(x);
	const rows = [
		['Basic salary', basic],
		['Other allowances (gross minus basic)', gross - basic],
		['Gross salary', gross],
		['Employee PF (12%)', -employeePf],
		['Professional tax', -ptAnnual],
		['Income tax (TDS estimate)', -tax],
		['In-hand salary', inHand],
		['Employer PF (part of CTC)', v.employerPfInCtc ? employerPf : 0],
		['Gratuity provision (part of CTC)', gratuity]
	] as const;
	const note = basicPct < 50 ? ' Basic is under 50% of CTC; the Code on Wages may treat at least 50% of pay as wages for PF, so your real PF could be higher.' : '';
	return {
		primaryResult: m(inHand),
		primaryLabel: 'Monthly in-hand salary',
		summary: `From ${money(ctc, true)} CTC: ${m(gross)} gross a month, less PF ${m(employeePf)}, professional tax ${m(ptAnnual)} and income tax ${m(tax)} (${regime} regime, monthly figures are the yearly amount ÷ 12).${note}`,
		secondaryMetrics: [
			{ label: 'Annual in-hand salary', value: y(inHand) },
			{ label: 'Monthly gross salary', value: m(gross) },
			{ label: 'Monthly employee PF', value: m(employeePf) },
			{ label: 'Annual income tax', value: money(tax, true) },
			{ label: 'Monthly deductions in total', value: m(employeePf + ptAnnual + tax) }
		],
		table: {
			title: 'Salary breakup',
			columns: [
				{ key: 'item', label: 'Component' },
				{ key: 'monthly', label: 'Monthly', align: 'end' },
				{ key: 'annual', label: 'Annual', align: 'end' }
			],
			rows: rows.map(([item, amt]) => ({ item, monthly: m(amt), annual: y(amt) }))
		}
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'ctc', label: 'Annual CTC', type: 'number', default: 1_200_000, min: 0, max: 10_000_000_000, step: 10_000, prefix: '$', decimal: false },
		{ id: 'basicPct', label: 'Basic salary', type: 'number', default: 50, min: 1, max: 100, step: 1, suffix: '% of CTC', help: 'Under the Code on Wages, at least 50% of pay is treated as wages for PF and gratuity.' },
		{ id: 'employerPfInCtc', label: 'Employer PF is part of CTC', type: 'toggle', default: true },
		{ id: 'pfBase', label: 'PF is calculated on', type: 'select', default: 'cap', display: 'segmented', options: [{ label: `Capped at ₹${EPF_WAGE_CEILING.toLocaleString('en-IN')} wage`, value: 'cap' }, { label: 'Full basic', value: 'full' }], help: `The EPF wage ceiling is ₹${EPF_WAGE_CEILING.toLocaleString('en-IN')} a month (from 17 September 2026). PF on full basic needs employer agreement.` },
		{ id: 'gratuity', label: 'Gratuity provision is in CTC (4.81% of basic)', type: 'toggle', default: false },
		{ id: 'state', label: 'Professional tax', type: 'select', default: 'none', display: 'menu', options: PT_STATES.map((s) => ({ label: s.label, value: s.value })), help: 'Only top slabs of a few states are listed. For other states or lower pay, use "Other state". Maharashtra women are exempt up to ₹25,000 a month.' },
		{ id: 'customPt', label: 'Professional tax per month', type: 'number', default: 200, min: 0, max: 1000, step: 10, prefix: '$', decimal: false, visibleWhen: (v) => v.state === 'custom' },
		{ id: 'regime', label: 'Tax regime', type: 'select', default: 'new', display: 'segmented', options: [{ label: 'New regime', value: 'new' }, { label: 'Old regime', value: 'old' }] },
		{ id: 'extra80c', label: 'Other 80C investments per year', type: 'number', default: 0, min: 0, max: 10_000_000, step: 1000, prefix: '$', decimal: false, visibleWhen: (v) => v.regime === 'old', help: 'Employee PF counts toward the ₹1,50,000 limit automatically.' }
	],
	calculate,
	content: {
		intro: `Use this in-hand salary calculator to turn your annual CTC into a monthly take-home pay for ${IN_TAX_YEAR_FULL}. It deducts employee PF, professional tax and income tax from your gross pay, and shows the full breakup.`,
		howTo: [
			'Enter your annual CTC and your basic salary as a share of CTC.',
			'Say whether employer PF and gratuity sit inside the CTC, and how PF is calculated.',
			'Pick your professional tax and tax regime, then read the monthly in-hand pay and the breakup table.'
		],
		about: [
			{
				heading: 'CTC, gross salary and in-hand salary: what is the difference?',
				paragraphs: [
					'Your CTC (cost to company) is the total amount your employer spends on you in a year. It often includes money you never see in your bank account, such as the employer’s PF share and a gratuity provision.',
					'Your gross salary is what is left after those items come out of the CTC. It is the pay before your own deductions. Finally, your in-hand salary, or take-home pay, is the gross salary minus employee PF, professional tax and income tax.',
					'So a ₹12,00,000 CTC does not mean ₹1,00,000 a month in your account. With the default settings, this calculator gives ₹94,000 a month.'
				]
			},
			{
				heading: 'What gets deducted from your pay?',
				paragraphs: [
					`**Employee PF.** You pay ${EPF_EMPLOYEE_RATE * 100}% of your PF wage. The wage ceiling is ${inr(EPF_WAGE_CEILING)} a month from ${EPF_WAGE_CEILING_EFFECTIVE}, so a capped PF is ${inr(EPF_WAGE_CEILING * EPF_EMPLOYEE_RATE)} a month. However, some employers pay PF on the full basic if you both agree. Estimate the long-term value with the [EPF calculator](/epf-calculator).`,
					`**Professional tax.** Each state sets its own. The top slabs listed here come to at most ${inr(PT_MAX_ANNUAL)} a year. The calculator lists the top slab for a few states. For others, choose "Other state" and enter your own monthly amount.`,
					`**Income tax.** The calculator works out the yearly tax for ${IN_TAX_YEAR_LABEL} and divides it by 12. It applies the standard deduction of ${inr(STANDARD_DEDUCTION_NEW)} in the new regime, and ${inr(STANDARD_DEDUCTION_OLD)} in the old one. For the full tax picture, use the [India income tax calculator](/india-income-tax-calculator).`
				]
			},
			{
				heading: 'Monthly in-hand salary at different CTCs',
				paragraphs: [
					'The table uses the default settings: basic at 50% of CTC, PF on the capped wage, employer PF inside the CTC, the new regime and no professional tax. However, your own figure will differ with your pay structure.'
				],
				table: {
					caption: `New regime, ${IN_TAX_YEAR_LABEL}`,
					columns: ['Annual CTC', 'Monthly gross', 'Yearly income tax', 'Monthly in-hand'],
					rows: [
						['₹6,00,000', '₹47,000', 'Nil', '₹44,000'],
						['₹8,00,000', '₹63,667', 'Nil', '₹60,667'],
						['₹12,00,000', '₹97,000', 'Nil', '₹94,000'],
						['₹18,00,000', '₹1,47,000', '₹1,43,310', '₹1,32,058'],
						['₹25,00,000', '₹2,05,333', '₹3,09,140', '₹1,76,572'],
						['₹40,00,000', '₹3,30,333', '₹7,76,570', '₹2,62,619']
					]
				}
			},
			{
				heading: 'How the tax regime changes your take-home',
				paragraphs: [
					`The new regime has lower rates. Taxable income up to ${inr(NEW_REGIME_REBATE_LIMIT)} is tax-free after the rebate, so a ₹12,00,000 CTC pays no income tax here.`,
					'In the old regime, the same ₹12,00,000 CTC pays ₹1,41,340 a year in tax, because this tool applies only the standard deduction and your PF. That leaves ₹82,222 a month. The old regime can win if you claim a lot more, such as HRA, home loan interest and 80D, which this calculator does not apply.',
					'To test those deductions, work out your HRA with the [HRA calculator](/hra-calculator) and compare both regimes in the [India income tax calculator](/india-income-tax-calculator).'
				]
			},
			{
				heading: 'Things that change your in-hand pay',
				paragraphs: ['Your payslip may differ from this estimate for several reasons:'],
				list: [
					`**PF on full basic.** At ₹12,00,000 CTC, PF on the full basic doubles your PF to ₹6,000 a month and lowers the take-home to ₹88,000.`,
					`**Gratuity in the CTC.** Many CTCs include a gratuity provision of about ${(GRATUITY_PROVISION_RATE * 100).toFixed(2)}% of basic. You get it only when you leave after the qualifying service. See the [gratuity calculator](/gratuity-calculator).`,
					'**Variable pay and bonuses.** These are paid out later, so your monthly pay is lower than the CTC suggests.',
					'**Employer NPS.** A contribution to your [NPS account](/nps-calculator) also lowers the cash you receive.',
					'**TDS timing.** Employers spread tax across the year, so some months may have more tax than others.'
				]
			}
		],
		formulas: [
			{
				title: 'In-hand salary',
				expression: 'Gross = CTC − employer PF (if in CTC) − gratuity (if in CTC); In-hand = Gross − employee PF − professional tax − income tax',
				variables: [
					{ symbol: 'PF', meaning: `12% of basic, with the wage capped at ${inr(EPF_WAGE_CEILING)} a month if you choose the cap` },
					{ symbol: 'Gratuity', meaning: '4.81% of basic (15/26 ÷ 12), a provision inside CTC, not paid monthly' },
					{ symbol: 'Income tax', meaning: 'Annual tax from the FY 2026-27 engine ÷ 12; HRA and other exemptions are not applied' }
				]
			}
		],
		example: {
			title: 'CTC ₹12,00,000, basic 50%, PF on capped wage, new regime',
			steps: ['Basic = ₹6,00,000 (₹50,000 a month); PF wage = ₹25,000, so employer and employee PF are ₹36,000 a year each', 'Gross = ₹12,00,000 − ₹36,000 = ₹11,64,000', 'Taxable = ₹11,64,000 − ₹75,000 = ₹10,89,000, which is within the ₹12 lakh rebate limit, so tax = ₹0', 'In-hand = ₹11,64,000 − ₹36,000 = ₹11,28,000 a year'],
			result: '₹94,000 a month.'
		},
		faq: [
			{
				q: 'How do I calculate in-hand salary from CTC?',
				a: 'Take the CTC, remove the employer PF and any gratuity provision to get the gross salary. Then subtract your own PF, professional tax and income tax. Divide the result by 12 for the monthly figure.'
			},
			{
				q: 'What is the PF wage ceiling now?',
				a: `The EPF wage ceiling was raised from ₹15,000 to ${inr(EPF_WAGE_CEILING)} a month from ${EPF_WAGE_CEILING_EFFECTIVE}. Employers may still contribute on higher wages by agreement.`
			},
			{
				q: 'Is gratuity paid monthly?',
				a: 'No. Many CTCs include a gratuity provision of about 4.81% of basic, but it is paid only when you leave after the qualifying service.'
			},
			{
				q: 'Why is my payslip different from this estimate?',
				a: 'Employers differ in how they split pay, count allowances and deduct tax. Your payslip may also include bonuses, insurance or loans that this tool does not model.'
			},
			{
				q: 'What is not included?',
				a: 'Employer EDLI and admin charges, bonuses, HRA and other exemptions, variable pay, insurance, and tax on employer contributions above the annual limit are not modelled.'
			}
		],
		sources: [IN_EPF_CEILING_SOURCE, IN_TAX_SOURCE, IN_REBATE_SOURCE],
		disclaimer: 'Estimate only. Your payslip can differ because of employer policy, state rules and actual TDS timing.'
	}
});
