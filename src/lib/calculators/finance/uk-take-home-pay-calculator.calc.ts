import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './uk-take-home-pay-calculator.meta';
import {
	LOAN_PLANS,
	NI_MAIN_RATE,
	NI_PRIMARY_THRESHOLD,
	NI_UPPER_EARNINGS_LIMIT,
	NI_UPPER_RATE,
	PA_TAPER_START,
	PERSONAL_ALLOWANCE,
	RUK_BANDS,
	SCOTTISH_BANDS,
	STANDARD_TAX_CODE,
	UK_INCOME_TAX_RATES_TABLE_SOURCE,
	UK_RATES_SOURCE,
	UK_TAX_YEAR,
	UK_TAX_YEAR_DATES,
	SCOTTISH_TAX_SOURCE,
	type LoanPlan,
	type TaxBand
} from '../data/uk-tax-2026-27';
import { STANDARD_CODE, employeeNI, incomeTax, loanRepayment, parseTaxCode, type TaxRegion } from '../data/uk-tax-engine';

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;

/** Income bands as gross pay, for a table. Taxable bands start after the allowance, which is gone by the top of the higher band. */
function taxRows(bands: TaxBand[]): string[][] {
	const rows: string[][] = [[`Up to ${gbp(PERSONAL_ALLOWANCE)}`, 'Personal allowance', '0%']];
	let from = PERSONAL_ALLOWANCE;
	for (const b of bands) {
		const to = Number.isFinite(b.upTo) ? Math.min(PERSONAL_ALLOWANCE + b.upTo, RUK_BANDS[1].upTo) : Infinity;
		rows.push([Number.isFinite(to) ? `${gbp(from + 1)} to ${gbp(to)}` : `Over ${gbp(from)}`, b.label, pc(b.rate)]);
		from = to;
	}
	return rows;
}

// Numbers used in the text, worked out with the same engine as the calculator.
const EX_GROSS = PERSONAL_ALLOWANCE + RUK_BANDS[0].upTo;
const EX_TAX = incomeTax(EX_GROSS, 'rest', STANDARD_CODE).tax;
const EX_NI = employeeNI(EX_GROSS).total;
const EX_NET = EX_GROSS - EX_TAX - EX_NI;
const SAME_SALARY_LOW = 30_000;
const SAME_SALARY_HIGH = EX_GROSS;
const rukLow = incomeTax(SAME_SALARY_LOW, 'rest', STANDARD_CODE).tax;
const scotLow = incomeTax(SAME_SALARY_LOW, 'scotland', STANDARD_CODE).tax;
const rukHigh = incomeTax(SAME_SALARY_HIGH, 'rest', STANDARD_CODE).tax;
const scotHigh = incomeTax(SAME_SALARY_HIGH, 'scotland', STANDARD_CODE).tax;
const SACRIFICE_SALARY = 40_000;
const SACRIFICE_PCT = 5;
const SACRIFICE_SAVING = ((SACRIFICE_SALARY * SACRIFICE_PCT) / 100) * NI_MAIN_RATE;

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Take-home pay', summary });

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'salary', label: 'Annual gross salary', type: 'number', default: 50270, min: 0, max: 5_000_000, step: 500, prefix: '$' },
		{
			id: 'region',
			label: 'Where you pay income tax',
			type: 'select',
			display: 'segmented',
			default: 'rest',
			options: [
				{ label: 'England, Wales & NI', value: 'rest' },
				{ label: 'Scotland', value: 'scotland' }
			]
		},
		{
			id: 'code',
			label: 'Tax code',
			type: 'text',
			default: '1257L',
			maxLength: 8,
			pattern: /^[A-Za-z0-9]{2,6}$/,
			patternMessage: 'Enter a tax code such as 1257L.',
			help: 'Standard code 1257L = £12,570 allowance, reduced above £100,000.'
		},
		{ id: 'pension', label: 'Pension contribution', type: 'number', default: 5, min: 0, max: 100, step: 0.5, suffix: '% of salary' },
		{
			id: 'pensionType',
			label: 'How the pension is taken',
			type: 'select',
			display: 'menu',
			default: 'net',
			options: [
				{ label: 'Net pay arrangement (before tax)', value: 'net' },
				{ label: 'Relief at source (after tax, 20% added)', value: 'ras' },
				{ label: 'Salary sacrifice (before tax and NI)', value: 'sacrifice' }
			]
		},
		{
			id: 'plan',
			label: 'Student loan',
			type: 'select',
			display: 'menu',
			default: 'none',
			options: [
				{ label: 'None', value: 'none' },
				{ label: 'Plan 1', value: 'plan1' },
				{ label: 'Plan 2', value: 'plan2' },
				{ label: 'Plan 4', value: 'plan4' },
				{ label: 'Plan 5', value: 'plan5' },
				{ label: 'Postgraduate Loan only', value: 'pg' }
			]
		},
		{
			id: 'pgAlso',
			label: 'Also repaying a Postgraduate Loan',
			type: 'toggle',
			default: false,
			visibleWhen: (v) => ['plan1', 'plan2', 'plan4', 'plan5'].includes(String(v.plan))
		},
		{ id: 'spa', label: 'Over State Pension age (no NI)', type: 'toggle', default: false },
		{
			id: 'period',
			label: 'Show result per',
			type: 'select',
			display: 'segmented',
			default: 'month',
			options: [
				{ label: 'Year', value: 'year' },
				{ label: 'Month', value: 'month' },
				{ label: 'Week', value: 'week' }
			]
		}
	],
	calculate(v): CalculationResult {
		const gross = Number(v.salary);
		const pensionPct = Number(v.pension);
		if (!(gross > 0) || !Number.isFinite(gross)) return fail('Enter your annual gross salary.');
		if (!(pensionPct >= 0 && pensionPct <= 100)) return fail('Enter a pension percentage between 0 and 100.');
		const region: TaxRegion = v.region === 'scotland' ? 'scotland' : 'rest';
		const code = parseTaxCode(String(v.code));
		if (!code) return fail('Enter a valid tax code such as 1257L, 0T, K475, BR, D0, D1 or NT.');
		if (region === 'scotland' && code.kind === 'flat' && code.rate > 0)
			return fail('For Scotland use a numeric tax code (BR, D0 and D1 have Scottish versions that are not modelled).');
		const pType = String(v.pensionType);
		const plan = String(v.plan);
		const pension = (gross * pensionPct) / 100;

		const taxPay = pType === 'sacrifice' || pType === 'net' ? gross - pension : gross;
		const niPay = pType === 'sacrifice' ? gross - pension : gross;
		const tax = incomeTax(taxPay, region, code);
		const ni = employeeNI(niPay, Boolean(v.spa));
		let loans = 0;
		if (plan in LOAN_PLANS) loans += loanRepayment(niPay, plan as LoanPlan);
		if (v.pgAlso && plan !== 'pg' && plan in LOAN_PLANS) loans += loanRepayment(niPay, 'pg');

		// Relief at source: you pay 80% of the gross contribution; the provider adds 20%.
		const pensionCost = pType === 'ras' ? pension * 0.8 : pension;
		let extraRelief = 0;
		if (pType === 'ras') {
			const saving = tax.tax - incomeTax(gross - pension, region, code).tax;
			extraRelief = Math.max(0, saving - pension * 0.2);
		}
		const net = gross - pensionCost - tax.tax - ni.total - loans;

		const div = v.period === 'year' ? 1 : v.period === 'week' ? 52 : 12;
		const periodWord = v.period === 'year' ? 'year' : v.period === 'week' ? 'week' : 'month';
		const per = (n: number) => money(n / div);
		const rows: Record<string, string>[] = [];
		const add = (item: string, n: number) =>
			rows.push({ item, year: money(n), month: money(n / 12), week: money(n / 52) });
		add('Gross salary', gross);
		if (pension > 0) add(pType === 'sacrifice' ? 'Pension (salary sacrifice)' : pType === 'ras' ? 'Pension (you pay, net of 20% relief)' : 'Pension (net pay)', -pensionCost);
		for (const l of tax.lines) if (l.amount > 0) add(`Income tax — ${l.label} (${pct(l.rate * 100)})`, -l.tax);
		if (ni.main > 0) add(`National Insurance (${pct(8)})`, -ni.main);
		if (ni.upper > 0) add(`National Insurance above £${NI_UPPER_EARNINGS_LIMIT.toLocaleString('en-GB')} (${pct(2)})`, -ni.upper);
		if (loans > 0) add('Student loan', -loans);
		add('Take-home pay', net);

		const totalDeductions = gross - net;
		return {
			primaryResult: per(net),
			primaryLabel: `Take-home pay per ${periodWord}`,
			summary: `On ${money(gross, true)} a year you keep ${money(net)} after tax, National Insurance${loans > 0 ? ', student loan' : ''}${pension > 0 ? ' and pension' : ''} (${pct((net / gross) * 100, 1)} of gross).`,
			secondaryMetrics: [
				{ label: 'Take-home per year', value: money(net) },
				{ label: 'Take-home per month', value: money(net / 12) },
				{ label: 'Take-home per week', value: money(net / 52) },
				{ label: 'Income tax', value: money(tax.tax) },
				{ label: 'National Insurance', value: money(ni.total) },
				{ label: 'Student loan', value: money(loans) },
				{ label: 'Pension (your cost)', value: money(pensionCost) },
				{ label: 'Extra pension tax relief to claim', value: money(extraRelief) },
				{ label: 'Total deductions', value: money(totalDeductions) }
			],
			table: {
				title: `Breakdown for ${UK_TAX_YEAR}`,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'year', label: 'Year', align: 'end' },
					{ key: 'month', label: 'Month', align: 'end' },
					{ key: 'week', label: 'Week', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Work out your UK take-home pay for the ${UK_TAX_YEAR} tax year (${UK_TAX_YEAR_DATES}). See what is left of your salary after income tax, National Insurance, pension and student loan, by year, month or week.`,
		howTo: [
			'Enter your annual gross salary (your pay before any deductions) and choose where you pay income tax: England, Wales and Northern Ireland, or Scotland.',
			`Leave the tax code as ${STANDARD_TAX_CODE} unless your payslip or HMRC letter shows a different one.`,
			'Add your pension percentage and how it is taken, then pick your student loan plan if you have one.',
			'Choose year, month or week, and open the breakdown table to see each deduction.'
		],
		about: [
			{
				heading: 'What is take-home pay?',
				paragraphs: [
					'Take-home pay (also called net pay) is the money that reaches your bank account. It is your gross salary minus income tax, employee National Insurance, any pension contribution and any student loan repayment.',
					'Most employees pay these through PAYE, which means your employer takes the money out of each payslip and sends it to HMRC. As a result, you rarely see the full salary figure in your account.',
					'This calculator works on a full-year basis for an employee in category A (the standard National Insurance category). Real payslips can differ by a few pounds because of pay-period rounding. Contractors with their own company can compare options with the [IR35 calculator](/ir35-calculator).'
				]
			},
			{
				heading: `Income tax in England, Wales and Northern Ireland, ${UK_TAX_YEAR}`,
				paragraphs: [
					`Everyone gets a tax-free personal allowance of ${gbp(PERSONAL_ALLOWANCE)}. That is why the standard tax code is ${STANDARD_TAX_CODE}: the number, times ten, is your allowance. This calculator uses one set of bands for England, Wales and Northern Ireland.`,
					`However, the allowance shrinks once your income passes ${gbp(PA_TAPER_START)}. You lose ${gbp(1)} of allowance for every ${gbp(2)} above that, so it is gone completely at ${gbp(PERSONAL_ALLOWANCE * 2 + PA_TAPER_START)}. In that slice your effective tax rate is ${pc(RUK_BANDS[1].rate * 1.5)}, because the ${pc(RUK_BANDS[1].rate)} higher rate applies to the extra income and to the allowance you lose.`
				],
				table: { caption: `England, Wales and Northern Ireland, ${UK_TAX_YEAR}`, columns: ['Income', 'Band', 'Rate'], rows: taxRows(RUK_BANDS) }
			},
			{
				heading: `Income tax in Scotland, ${UK_TAX_YEAR}`,
				paragraphs: [
					'Scotland sets its own rates and bands for salary and other non-savings income. It has six bands instead of three. The personal allowance is the same.',
					`So the same salary can mean a different bill. On ${gbp(SAME_SALARY_LOW)}, a Scottish taxpayer pays ${gbp(Math.abs(scotLow - rukLow))} ${scotLow < rukLow ? 'less' : 'more'} income tax than someone in England. On ${gbp(SAME_SALARY_HIGH)}, they pay ${gbp(Math.abs(scotHigh - rukHigh))} ${scotHigh < rukHigh ? 'less' : 'more'}.`,
					'Choose Scotland only if you live there for tax purposes. National Insurance and student loan rules are the same across the UK.'
				],
				table: { caption: `Scotland, ${UK_TAX_YEAR}`, columns: ['Income', 'Band', 'Rate'], rows: taxRows(SCOTTISH_BANDS) }
			},
			{
				heading: 'National Insurance and student loan',
				paragraphs: [
					`Employee National Insurance is ${pc(NI_MAIN_RATE)} on pay between ${gbp(NI_PRIMARY_THRESHOLD)} and ${gbp(NI_UPPER_EARNINGS_LIMIT)}. Above ${gbp(NI_UPPER_EARNINGS_LIMIT)} it drops to ${pc(NI_UPPER_RATE)}. If you are over State Pension age, tick the box and the calculator takes National Insurance off.`,
					`A student loan is taken as a percentage of pay above a threshold. The thresholds for ${UK_TAX_YEAR} are below. For a long-term view of a loan, use the [UK student loan calculator](/uk-student-loan-calculator).`
				],
				list: (Object.keys(LOAN_PLANS) as LoanPlan[]).map(
					(k) => `**${LOAN_PLANS[k].label}:** ${pc(LOAN_PLANS[k].rate)} of pay above ${gbp(LOAN_PLANS[k].threshold)}`
				)
			},
			{
				heading: 'How your pension type changes take-home pay',
				paragraphs: [
					'There are three common ways to pay into a workplace pension. The choice changes your take-home pay, even when the percentage is the same.'
				],
				list: [
					'**Net pay arrangement:** your pension comes out before income tax, but not before National Insurance.',
					'**Relief at source:** your pension comes out after tax, and the provider adds 20% tax relief. Higher-rate taxpayers claim the extra relief through HMRC.',
					`**Salary sacrifice:** you give up part of your salary, so you pay no income tax or National Insurance on it. On a ${gbp(SACRIFICE_SALARY)} salary with a ${SACRIFICE_PCT}% pension, that saves about ${gbp(SACRIFICE_SAVING)} a year compared with net pay.`
				]
			}
		],
		formulas: [
			{
				title: 'Income tax, England, Wales and Northern Ireland',
				expression: `Tax = ${pc(RUK_BANDS[0].rate)} × first ${gbp(RUK_BANDS[0].upTo)} of taxable pay + ${pc(RUK_BANDS[1].rate)} × the next band up to ${gbp(RUK_BANDS[1].upTo)} + ${pc(RUK_BANDS[2].rate)} × the rest`,
				variables: [
					{
						symbol: 'Taxable pay',
						meaning: `pay minus the personal allowance (${gbp(PERSONAL_ALLOWANCE)}, reduced by ${gbp(1)} for every ${gbp(2)} over ${gbp(PA_TAPER_START)})`
					}
				]
			},
			{
				title: 'Income tax, Scotland',
				expression: SCOTTISH_BANDS.map((b, i) => (Number.isFinite(b.upTo) ? `${pc(b.rate)} to ${gbp(b.upTo)}` : `${pc(b.rate)} above ${gbp(SCOTTISH_BANDS[i - 1].upTo)}`)).join(', ') + ' (all on taxable pay)',
				variables: []
			},
			{
				title: 'Employee National Insurance (category A)',
				expression: `NI = ${pc(NI_MAIN_RATE)} × (pay between ${gbp(NI_PRIMARY_THRESHOLD)} and ${gbp(NI_UPPER_EARNINGS_LIMIT)}) + ${pc(NI_UPPER_RATE)} × (pay above ${gbp(NI_UPPER_EARNINGS_LIMIT)})`,
				variables: []
			},
			{
				title: 'Student loan',
				expression: `Repayment = rate × (pay − threshold). The rate is ${pc(LOAN_PLANS.plan2.rate)}, or ${pc(LOAN_PLANS.pg.rate)} for a Postgraduate Loan.`,
				variables: [
					{
						symbol: 'Thresholds',
						meaning: (['plan1', 'plan2', 'plan4', 'plan5', 'pg'] as LoanPlan[]).map((k) => `${LOAN_PLANS[k].label} ${gbp(LOAN_PLANS[k].threshold)}`).join('; ')
					}
				]
			}
		],
		example: {
			title: `A ${gbp(EX_GROSS)} salary in England, no pension or loan`,
			steps: [
				`Taxable pay = ${gbp(EX_GROSS)} − ${gbp(PERSONAL_ALLOWANCE)} = ${gbp(EX_GROSS - PERSONAL_ALLOWANCE)}, all in the ${pc(RUK_BANDS[0].rate)} band: tax = ${gbp2(EX_TAX)}`,
				`National Insurance = ${pc(NI_MAIN_RATE)} × (${gbp(EX_GROSS)} − ${gbp(NI_PRIMARY_THRESHOLD)}) = ${gbp2(EX_NI)}`,
				`Take-home = ${gbp(EX_GROSS)} − ${gbp2(EX_TAX)} − ${gbp2(EX_NI)} = ${gbp2(EX_NET)} a year`
			],
			result: `Take-home pay of ${gbp2(EX_NET)} a year, which is ${gbp2(EX_NET / 12)} a month.`
		},
		faq: [
			{
				q: 'How is UK take-home pay calculated?',
				a: `Start with your gross salary. Take off income tax on pay above your personal allowance, then National Insurance, then any pension and student loan. What is left is your take-home pay. This calculator does each step for the ${UK_TAX_YEAR} tax year.`
			},
			{
				q: 'What is the difference between net pay, relief at source and salary sacrifice?',
				a: 'Net pay takes the pension before income tax but not National Insurance. Relief at source takes it after tax, and the provider adds 20%. Salary sacrifice cuts your salary, so both tax and National Insurance fall. Check which one your employer uses.'
			},
			{
				q: `Why does my take-home pay drop quickly between ${gbp(PA_TAPER_START)} and ${gbp(RUK_BANDS[1].upTo)}?`,
				a: `Your personal allowance falls by ${gbp(1)} for every ${gbp(2)} over ${gbp(PA_TAPER_START)}. In England, Wales and Northern Ireland that makes the effective income tax rate ${pc(RUK_BANDS[1].rate * 1.5)} on that slice. In Scotland the slice is taxed at a higher rate, so the effective rate is ${pc(SCOTTISH_BANDS[4].rate * 1.5)}.`
			},
			{
				q: 'Is the take-home pay the same in Scotland?',
				a: 'No. Scottish income tax has different bands and rates, so the result can be higher or lower than in the rest of the UK. National Insurance and student loan deductions are the same.'
			},
			{
				q: 'What does this calculator not include?',
				a: 'It leaves out taxable benefits, bonuses taxed separately, Marriage Allowance, other income, Gift Aid and the High Income Child Benefit Charge. It also ignores pay-period rounding. Pay while off sick has its own [statutory sick pay calculator](/statutory-sick-pay-calculator). Figures use an annual basis and the rates on 28 October 2026, before any later Budget change.'
			}
		],
		sources: [UK_RATES_SOURCE, UK_INCOME_TAX_RATES_TABLE_SOURCE, SCOTTISH_TAX_SOURCE],
		disclaimer: `Estimate for the ${UK_TAX_YEAR} tax year only. Your payslip may differ because of your tax code, benefits and pay-period rounding. Not tax advice.`
	}
});
