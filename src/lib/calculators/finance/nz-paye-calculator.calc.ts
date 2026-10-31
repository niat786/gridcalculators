import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './nz-paye-calculator.meta';
import {
	ACC_MAX_EARNINGS,
	ACC_RATE,
	IETC_ABATE_RATE,
	IETC_END,
	IETC_FROM,
	IETC_FULL_TO,
	IETC_MAX,
	KIWISAVER_RATE_OPTIONS,
	NZ_BRACKETS,
	NZ_TAX_YEAR_LONG,
	STUDENT_LOAN_RATE,
	STUDENT_LOAN_THRESHOLD,
	type NzBracket,
	IRD_ACC_SOURCE,
	IRD_IETC_SOURCE,
	IRD_KIWISAVER_CHANGES_SOURCE,
	IRD_RATES_SOURCE,
	IRD_STUDENT_LOAN_SOURCE,
	KIWISAVER_DEFAULT_RATE,
	NZ_TAX_YEAR,
	accLevy,
	ietc,
	nzIncomeTax,
	studentLoanRepayment
} from '../data/nz-tax-2026-27';

const PERIODS: Record<string, { n: number; label: string }> = {
	annual: { n: 1, label: 'year' },
	monthly: { n: 12, label: 'month' },
	fortnightly: { n: 26, label: 'fortnight' },
	weekly: { n: 52, label: 'week' }
};

/** Content is written once at build time, so format dollars explicitly (NZ$15,600). */
const nzd = (n: number) => moneyIn('NZD', n, true);
function bandRows(brackets: NzBracket[]): string[][] {
	let from = 0;
	return brackets.map((b) => {
		const band = Number.isFinite(b.upTo) ? (from === 0 ? `Up to ${nzd(b.upTo)}` : `${nzd(from + 1)} to ${nzd(b.upTo)}`) : `Over ${nzd(from)}`;
		from = b.upTo;
		return [band, pct(b.rate * 100, 1)];
	});
}

export function nzPay(gross: number, code: string, kiwisaverPct: number, studentLoan: boolean) {
	const taxBefore = nzIncomeTax(gross);
	const credit = code === 'ME' ? Math.min(ietc(gross), taxBefore) : 0;
	const paye = taxBefore - credit;
	const acc = accLevy(gross);
	const sl = studentLoan ? studentLoanRepayment(gross) : 0;
	const ks = (gross * kiwisaverPct) / 100;
	return { paye, credit, acc, sl, ks, net: gross - paye - acc - sl - ks };
}

function incomeRows(): string[][] {
	return [40_000, 60_000, 80_000, 120_000, 180_000].map((g) => {
		const r = nzPay(g, 'M', KIWISAVER_DEFAULT_RATE, false);
		return [nzd(g), nzd(r.paye), nzd(r.acc), nzd(r.ks), nzd(r.net), nzd(r.net / 12)];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'salary', label: 'Gross pay', type: 'number', default: 80000, min: 0, max: 100_000_000, step: 1000, prefix: '$', help: 'Before tax, for the period chosen below.' },
		{
			id: 'period',
			label: 'Pay period',
			type: 'select',
			display: 'segmented',
			default: 'annual',
			options: [
				{ label: 'Year', value: 'annual' },
				{ label: 'Month', value: 'monthly' },
				{ label: 'Fortnight', value: 'fortnightly' },
				{ label: 'Week', value: 'weekly' }
			]
		},
		{
			id: 'code',
			label: 'Tax code',
			type: 'select',
			display: 'segmented',
			default: 'M',
			options: [
				{ label: 'M', value: 'M' },
				{ label: 'ME (with IETC)', value: 'ME' }
			],
			help: 'ME adds the independent earner tax credit if you qualify.'
		},
		{
			id: 'ks',
			label: 'KiwiSaver (your rate)',
			type: 'select',
			display: 'menu',
			default: String(KIWISAVER_DEFAULT_RATE),
			options: [
				{ label: 'Not a member', value: '0' },
				{ label: '3% (temporary reduced rate)', value: '3' },
				{ label: '3.5% (default from 1 April 2026)', value: '3.5' },
				{ label: '4%', value: '4' },
				{ label: '6%', value: '6' },
				{ label: '8%', value: '8' },
				{ label: '10%', value: '10' }
			]
		},
		{ id: 'sl', label: 'I have a student loan', type: 'toggle', default: false }
	],
	calculate(v): CalculationResult {
		const p = PERIODS[String(v.period)];
		const input = Number(v.salary);
		const ksPct = Number(v.ks);
		const code = String(v.code);
		if (!p || !(input >= 0) || !Number.isFinite(input) || !Number.isFinite(ksPct) || ksPct < 0 || !['M', 'ME'].includes(code)) {
			return { primaryResult: DASH, primaryLabel: 'Take-home pay', summary: 'Enter your pay before tax.' };
		}
		const gross = input * p.n;
		const r = nzPay(gross, code, ksPct, v.sl === true);
		const per = (x: number) => money(x / p.n);
		const total = r.paye + r.acc + r.sl + r.ks;
		return {
			primaryResult: per(r.net),
			primaryLabel: `Take-home pay per ${p.label}`,
			summary:
				`On ${money(gross, true)} a year, PAYE, ACC, KiwiSaver and student loan take ${money(total, true)} (${pct(gross > 0 ? (total / gross) * 100 : 0, 1)}).` +
				(code === 'ME' && r.credit === 0 ? ' No independent earner tax credit applies at this income (it needs $24,000 to under $70,000).' : '') +
				(gross > ACC_MAX_EARNINGS ? ' ACC levy stops at the maximum earnings.' : ''),
			secondaryMetrics: [
				{ label: 'Take-home per year', value: money(r.net) },
				{ label: 'PAYE income tax per year', value: money(r.paye) },
				{ label: 'ACC levy per year', value: money(r.acc) },
				{ label: 'KiwiSaver per year', value: money(r.ks) },
				{ label: 'Student loan per year', value: money(r.sl) },
				{ label: 'IETC included', value: money(r.credit) }
			],
			table: {
				title: `Breakdown (${NZ_TAX_YEAR})`,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'annual', label: 'Per year', align: 'end' },
					{ key: 'period', label: `Per ${p.label}`, align: 'end' }
				],
				rows: [
					{ item: 'Gross pay', annual: money(gross), period: per(gross) },
					{ item: 'PAYE income tax', annual: money(r.paye), period: per(r.paye) },
					{ item: 'ACC earners\' levy', annual: money(r.acc), period: per(r.acc) },
					{ item: 'KiwiSaver (employee)', annual: money(r.ks), period: per(r.ks) },
					{ item: 'Student loan', annual: money(r.sl), period: per(r.sl) },
					{ item: 'Take-home pay', annual: money(r.net), period: per(r.net) }
				]
			}
		};
	},
	content: {
		intro: `Work out your take-home pay in New Zealand for the ${NZ_TAX_YEAR} tax year (${NZ_TAX_YEAR_LONG}). This NZ PAYE calculator takes off PAYE income tax, the ACC earners' levy, KiwiSaver and any student loan repayments.`,
		howTo: [
			'Enter your gross pay and choose whether it is per year, month, fortnight or week.',
			'Pick tax code M, or ME if you are claiming the independent earner tax credit.',
			'Choose your KiwiSaver rate, and switch on the student loan option if you repay one.',
			'Read your take-home pay per period and the yearly breakdown.'
		],
		about: [
			{
				heading: 'What is PAYE?',
				paragraphs: [
					'PAYE stands for pay as you earn. Your employer takes income tax out of each payment and sends it to Inland Revenue, so you do not pay a big bill at the end of the year.',
					'However, other amounts can come out of your pay too. The ACC earners\' levy pays for accident cover. KiwiSaver is your retirement saving. A student loan repayment is taken if you owe one.',
					'This calculator adds them all up for a full year, and then splits the result across your pay periods.'
				]
			},
			{
				heading: `Income tax rates for ${NZ_TAX_YEAR}`,
				paragraphs: [
					`New Zealand tax residents pay tax in brackets. Each rate applies only to the part of your income in that bracket. The top rate is ${pct(NZ_BRACKETS[NZ_BRACKETS.length - 1].rate * 100, 0)}.`,
					'Also, these bands have applied since 31 July 2024, and they are the same for 2026-27.'
				],
				table: { caption: `NZ income tax rates, ${NZ_TAX_YEAR}`, columns: ['Taxable income', 'Rate'], rows: bandRows(NZ_BRACKETS) }
			},
			{
				heading: 'ACC levy, tax codes and the IETC',
				paragraphs: [
					`The ACC earners' levy is ${pct(ACC_RATE * 100, 2)} of your earnings, up to ${nzd(ACC_MAX_EARNINGS)} a year. That makes the most you can pay ${moneyIn('NZD', accLevy(ACC_MAX_EARNINGS))}.`,
					`First, tax code M is the standard code for a main job. Code ME adds the independent earner tax credit (IETC). The credit is ${nzd(IETC_MAX)} a year for income from ${nzd(IETC_FROM)} to ${nzd(IETC_FULL_TO)}. It then falls by ${Math.round(IETC_ABATE_RATE * 100)} cents per dollar, and it ends at ${nzd(IETC_END)}.`,
					'But the tool does not include secondary-job codes such as S and SH.'
				]
			},
			{
				heading: 'KiwiSaver and student loan repayments',
				paragraphs: [
					`Your KiwiSaver rate comes out of your gross pay. The default rate is ${KIWISAVER_DEFAULT_RATE}% from 1 April 2026. You can also choose ${KIWISAVER_RATE_OPTIONS.filter((r) => r > KIWISAVER_DEFAULT_RATE && r !== 3).join('%, ')}% or, for a while, 3%. See the [KiwiSaver calculator](/kiwisaver-calculator) to project what it grows to.`,
					`A student loan repayment is ${Math.round(STUDENT_LOAN_RATE * 100)} cents for every dollar you earn over ${nzd(STUDENT_LOAN_THRESHOLD)} a year.`,
					'Both are taken from your pay, so they lower what you receive. They are not part of income tax.'
				]
			},
			{
				heading: 'Ways to use your result',
				paragraphs: ['Your take-home pay is the number to build a budget on, not your gross pay. Here are a few ways to use it:'],
				list: [
					'**Build a budget.** Start from take-home pay in the [budget calculator](/budget-calculator).',
					'**Test a higher KiwiSaver rate.** Raising it lowers your pay now but grows your balance. Compare the effect in the [KiwiSaver calculator](/kiwisaver-calculator).',
					'**Plan a home loan.** Use your net pay to judge a repayment in the [mortgage calculator](/mortgage-calculator).',
					'**Check your tax code.** If you work two jobs or qualify for ME, make sure your employer has the right code.'
				]
			},
			{
				heading: 'Take-home pay at different incomes',
				paragraphs: [
					`The table shows code M, a ${KIWISAVER_DEFAULT_RATE}% KiwiSaver rate and no student loan, for ${NZ_TAX_YEAR}.`,
					'The tool leaves out secondary jobs, other credits, extra KiwiSaver contributions, your employer\'s KiwiSaver share and payroll rounding. It spreads annual tax evenly over the year, so your payslip can differ a little. Check your own situation with Inland Revenue or an accountant.'
				],
				table: { caption: `Annual take-home pay, ${NZ_TAX_YEAR}`, columns: ['Gross pay', 'PAYE', 'ACC levy', 'KiwiSaver', 'Take-home', 'Per month'], rows: incomeRows() }
			}
		],
		formulas: [
			{
				title: `Income tax ${NZ_TAX_YEAR}`,
				expression: NZ_BRACKETS.map((b, i) => `${Number.isFinite(b.upTo) ? `${i === 0 ? '$0' : ''}${i === 0 ? '–' : 'to '}${nzd(b.upTo)}: ` : 'above: '}${pct(b.rate * 100, 1)}`).join(' · '),
				variables: [
					{ symbol: 'ACC', meaning: `${pct(ACC_RATE * 100, 2)} of earnings up to ${nzd(ACC_MAX_EARNINGS)} (maximum ${moneyIn('NZD', accLevy(ACC_MAX_EARNINGS))})` },
					{ symbol: 'Student loan', meaning: `${Math.round(STUDENT_LOAN_RATE * 100)}% of earnings over ${nzd(STUDENT_LOAN_THRESHOLD)} a year` },
					{ symbol: 'KiwiSaver', meaning: 'your chosen rate × gross pay, taken before you are paid' },
					{ symbol: 'IETC', meaning: `ME code only: ${nzd(IETC_MAX)} a year for ${nzd(IETC_FROM)}–${nzd(IETC_FULL_TO)}, falling ${Math.round(IETC_ABATE_RATE * 100)}c per $1 to nil at ${nzd(IETC_END)}` }
				]
			}
		],
		example: {
			title: '$80,000 a year, code M, 3.5% KiwiSaver',
			steps: [
				'Income tax: $1,638 + $6,632.50 + $7,380 + 33% × ($80,000 − $78,100) = $16,277.50',
				'ACC: 1.75% × $80,000 = $1,400; KiwiSaver: 3.5% × $80,000 = $2,800',
				'Take-home: $80,000 − $16,277.50 − $1,400 − $2,800 = $59,522.50 a year'
			],
			result: '$59,522.50 a year'
		},
		faq: [
			{
				q: 'How much is $80,000 after tax in New Zealand?',
				a: 'With tax code M and 3.5% KiwiSaver, you take home about $59,522 a year, or $4,960 a month. A student loan would lower that by about $6,705 a year.'
			},
			{
				q: 'Did the tax brackets change for 2026-27?',
				a: `No. The brackets introduced on 31 July 2024 still apply, with a top rate of ${pct(NZ_BRACKETS[NZ_BRACKETS.length - 1].rate * 100, 0)}. The ACC levy is ${pct(ACC_RATE * 100, 2)} for ${NZ_TAX_YEAR}.`
			},
			{
				q: 'What does tax code ME mean?',
				a: `ME is the tax code for people who qualify for the independent earner tax credit. You earn between ${nzd(IETC_FROM)} and ${nzd(IETC_END)}, and you do not receive Working for Families, a main benefit or NZ Super. The credit is up to ${nzd(IETC_MAX)} a year.`
			},
			{
				q: 'How does KiwiSaver affect my pay?',
				a: 'Your rate is taken from gross pay before you receive it, so a higher rate lowers your take-home pay. Your employer adds its own contribution on top, which this tool does not show.'
			},
			{
				q: 'What is left out?',
				a: 'Secondary jobs (code S and SH), other credits, extra KiwiSaver contributions, the employer\'s KiwiSaver contribution and payroll rounding. Annual tax is divided evenly across pay periods.'
			}
		],
		sources: [IRD_RATES_SOURCE, IRD_ACC_SOURCE, IRD_IETC_SOURCE, IRD_STUDENT_LOAN_SOURCE, IRD_KIWISAVER_CHANGES_SOURCE],
		disclaimer: 'An estimate of annual deductions spread evenly over the year. It is not tax advice; check your own situation with Inland Revenue or an accountant.'
	}
});
