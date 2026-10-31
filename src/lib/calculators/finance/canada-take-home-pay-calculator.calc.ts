import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './canada-take-home-pay-calculator.meta';
import {
	CA_TAX_YEAR,
	CPP2_RATE,
	CPP_BASE_RATE,
	CPP_BASIC_EXEMPTION,
	CPP_FIRST_ADDITIONAL_RATE,
	CPP_SOURCE,
	CRA_RATES_SOURCE,
	CRA_T4127_SOURCE,
	EI_MAX_INSURABLE,
	EI_MAX_PREMIUM,
	EI_RATE,
	EI_SOURCE,
	PROVINCES,
	YAMPE,
	YMPE,
	canadaIncomeTax,
	payrollContributions,
	type ProvinceCode
} from '../data/ca-tax-2026';
import { PROVINCE_OPTIONS, QUEBEC_MESSAGE, isProvince } from './canada-income-tax-calculator.calc';

/** Content is written once at build time, so format dollars explicitly (CA$74,600). */
const cad = (n: number) => moneyIn('CAD', n, true);
const cppMain = payrollContributions(YMPE).cppTotal;
const cpp2Max = payrollContributions(YAMPE).cpp2;
const COMPARE_SALARY = 85_000;
const COMPARE_PROVINCES: ProvinceCode[] = ['AB', 'BC', 'SK', 'ON', 'NS'];
function compareRows(): string[][] {
	return COMPARE_PROVINCES.map((code) => {
		const r = canadaIncomeTax({ province: code, employment: COMPARE_SALARY, other: 0, rrsp: 0 });
		const net = COMPARE_SALARY - r.totalTax - r.contributions.cppTotal - r.contributions.ei;
		return [PROVINCES[code].name, moneyIn('CAD', net, true), pct((net / COMPARE_SALARY) * 100, 1)];
	});
}

const PERIODS: Record<string, { n: number; label: string; per: string }> = {
	weekly: { n: 52, label: 'Weekly', per: 'week' },
	biweekly: { n: 26, label: 'Every 2 weeks', per: 'pay period' },
	semimonthly: { n: 24, label: 'Twice a month', per: 'pay period' },
	monthly: { n: 12, label: 'Monthly', per: 'month' }
};

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'salary', label: 'Annual salary', type: 'number', default: 85000, min: 0, max: 10_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Gross pay before any deductions.' },
		{ id: 'province', label: 'Province or territory', type: 'select', display: 'menu', default: 'ON', options: PROVINCE_OPTIONS, help: 'Quebec is not included yet.' },
		{
			id: 'frequency',
			label: 'Pay frequency',
			type: 'select',
			display: 'menu',
			default: 'biweekly',
			options: Object.entries(PERIODS).map(([value, p]) => ({ label: p.label, value }))
		},
		{ id: 'pretax', label: 'Pre-tax deductions', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr', help: 'RRSP or pension contributions taken from your pay before tax.' }
	],
	calculate(v): CalculationResult {
		const salary = Number(v.salary);
		const pretax = Number(v.pretax);
		const province = v.province;
		const period = PERIODS[String(v.frequency)];
		if (province === 'QC') return { primaryResult: DASH, primaryLabel: 'Net pay', summary: QUEBEC_MESSAGE };
		if (!isProvince(province) || !period || !(salary > 0) || !Number.isFinite(salary) || !Number.isFinite(pretax) || pretax < 0 || pretax > salary) {
			return { primaryResult: DASH, primaryLabel: 'Net pay', summary: 'Enter a salary above zero, pre-tax deductions up to your salary, and pick a province or territory.' };
		}
		const r = canadaIncomeTax({ province, employment: salary, other: 0, rrsp: pretax });
		const cpp = r.contributions.cppTotal;
		const ei = r.contributions.ei;
		const annualNet = salary - pretax - r.totalTax - cpp - ei;
		const perPeriod = (x: number) => money(x / period.n);
		const name = PROVINCES[province].name;
		const note = province === 'YT' ? ' The Yukon employment credit (up to about $96 a year) is not included.' : '';
		return {
			primaryResult: perPeriod(annualNet),
			primaryLabel: `Net pay per ${period.per}`,
			summary: `${name}: ${money(annualNet)} a year after tax, CPP and EI, which is ${pct((annualNet / salary) * 100, 1)} of your salary. Based on a full year of tax, not payroll withholding tables.${note}`,
			secondaryMetrics: [
				{ label: 'Gross pay per period', value: perPeriod(salary) },
				{ label: 'Net pay per year', value: money(annualNet) },
				{ label: 'Federal income tax', value: money(r.federalTax) },
				{ label: `${name} income tax`, value: money(r.provincialTax) },
				{ label: 'CPP and CPP2', value: money(cpp) },
				{ label: 'EI premiums', value: money(ei) },
				{ label: 'Average tax rate', value: pct(r.averageRate * 100, 2) }
			],
			table: {
				title: 'Yearly deductions',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'year', label: 'Per year', align: 'end' },
					{ key: 'period', label: `Per ${period.per}`, align: 'end' }
				],
				rows: [
					{ item: 'Gross salary', year: money(salary), period: perPeriod(salary) },
					{ item: 'Pre-tax deductions', year: money(-pretax), period: perPeriod(-pretax) },
					{ item: 'Federal income tax', year: money(-r.federalTax), period: perPeriod(-r.federalTax) },
					{ item: `${name} income tax`, year: money(-r.provincialTax), period: perPeriod(-r.provincialTax) },
					{ item: 'CPP and CPP2', year: money(-cpp), period: perPeriod(-cpp) },
					{ item: 'EI premiums', year: money(-ei), period: perPeriod(-ei) },
					{ item: 'Net pay', year: money(annualNet), period: perPeriod(annualNet) }
				]
			}
		};
	},
	content: {
		intro: `Find your ${CA_TAX_YEAR} take-home pay in Canada after federal and provincial or territorial income tax, CPP (including the second ceiling, CPP2) and EI. Choose your pay frequency to see each paycheque. Quebec is not included yet.`,
		howTo: [
			'Enter your annual salary and pick your province or territory. Quebec is not included yet.',
			'Choose how often you are paid.',
			'Add any pre-tax RRSP or pension deductions taken from your pay.',
			'Read your net pay per pay period, then open the yearly deductions table for the full picture.'
		],
		about: [
			{
				heading: 'What is take-home pay?',
				paragraphs: [
					'Take-home pay, or net pay, is what lands in your bank account after your employer takes off tax and other required amounts. Your gross pay is the number in your job offer, before any deductions.',
					`In Canada, four things usually come off. Income tax is the biggest, and it has a federal part and a provincial or territorial part. Then you pay CPP, the extra CPP2 tier on higher earnings, and EI premiums. If you give to an RRSP or a pension plan through work, that comes off before tax.`,
					'This calculator works out all of them for a full year, then splits the result across your pay periods.'
				]
			},
			{
				heading: `CPP and EI amounts for ${CA_TAX_YEAR}`,
				paragraphs: [
					'CPP and EI are not the same as income tax. You pay each one on your earnings up to a yearly limit, and then the deduction stops for the rest of the year. So higher earners see bigger paycheques late in the year.',
					`The table shows the rates and maximums used here for employees outside Quebec. Employer shares are not included, because they do not come out of your pay.`
				],
				table: {
					caption: `Employee CPP and EI, ${CA_TAX_YEAR}`,
					columns: ['Item', 'Rate', 'Earnings range', 'Yearly maximum'],
					rows: [
						['CPP', pct((CPP_BASE_RATE + CPP_FIRST_ADDITIONAL_RATE) * 100, 2), `${cad(CPP_BASIC_EXEMPTION)} to ${cad(YMPE)}`, moneyIn('CAD', cppMain)],
						['CPP2', pct(CPP2_RATE * 100, 0), `${cad(YMPE)} to ${cad(YAMPE)}`, moneyIn('CAD', cpp2Max)],
						['EI', pct(EI_RATE * 100, 2), `Up to ${cad(EI_MAX_INSURABLE)}`, moneyIn('CAD', EI_MAX_PREMIUM)]
					]
				}
			},
			{
				heading: 'How your province changes your pay',
				paragraphs: [
					`Federal rules are the same everywhere, but provincial and territorial tax is not. The table compares the same ${cad(COMPARE_SALARY)} salary in five provinces, using this calculator's rules for ${CA_TAX_YEAR}.`,
					'The gap comes from different brackets, basic personal amounts and extras such as the Ontario surtax and Health Premium. To see the tax part alone, try the [Canada income tax calculator](/canada-income-tax-calculator).'
				],
				table: { caption: `Net pay on ${cad(COMPARE_SALARY)} a year, ${CA_TAX_YEAR}`, columns: ['Province', 'Net pay per year', 'Share of salary'], rows: compareRows() }
			},
			{
				heading: 'Why your real paycheque may differ',
				paragraphs: [
					'Your employer does not use this method. Instead, it follows the CRA payroll deduction formulas and the claims on your TD1 form. This tool works out the tax for the whole year, so your first paycheques can be a little different.',
					'Other items change your pay too. Group benefits, union dues, a pension plan, a bonus or a taxable benefit can all move the number. Yukon employees also get an employment credit that this tool leaves out.',
					'For these reasons, use the result for planning and compare it with your latest pay stub.'
				]
			},
			{
				heading: 'Tips to keep more of your pay',
				paragraphs: ['A few simple steps can raise your net pay or your long-term savings:'],
				list: [
					'**Check your TD1.** If you have credits that your employer does not know about, you may be over-withheld all year.',
					'**Use pre-tax savings.** An RRSP contribution through payroll reduces tax at source. Plan one with the [RRSP calculator](/rrsp-calculator).',
					'**Open a TFSA.** Growth is tax-free, though you get no deduction. See the [TFSA calculator](/tfsa-calculator).',
					'**Know your limit before a home loan.** Lenders look at gross income, so test your budget with the [mortgage stress test calculator](/canada-mortgage-stress-test-calculator).'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'Quebec is not included yet. Quebec uses QPP, QPIP and its own income tax, so the numbers here would be wrong for Quebec employees. The tool shows a message instead of a result.',
					'It also leaves out benefits, union dues, bonuses taxed separately, spouse and dependant credits, and the Yukon employment credit. It uses a full year of tax, not payroll withholding tables.'
				]
			}
		],
		formulas: [
			{
				title: 'Net pay',
				expression: 'Net = salary − pre-tax deductions − income tax − CPP − CPP2 − EI',
				variables: [
					{ symbol: 'CPP', meaning: `${pct((CPP_BASE_RATE + CPP_FIRST_ADDITIONAL_RATE) * 100, 2)} of earnings between ${cad(CPP_BASIC_EXEMPTION)} and ${cad(YMPE)} (maximum ${moneyIn('CAD', cppMain)})` },
					{ symbol: 'CPP2', meaning: `${pct(CPP2_RATE * 100, 0)} of earnings between ${cad(YMPE)} and ${cad(YAMPE)} (maximum ${moneyIn('CAD', cpp2Max)})` },
					{ symbol: 'EI', meaning: `${pct(EI_RATE * 100, 2)} of earnings up to ${cad(EI_MAX_INSURABLE)} (maximum ${moneyIn('CAD', EI_MAX_PREMIUM)})` },
					{ symbol: 'Income tax', meaning: `${CA_TAX_YEAR} federal and provincial brackets less basic, employment, CPP and EI credits` },
					{ symbol: 'Per pay period', meaning: 'Net pay per year ÷ 52, 26, 24 or 12, depending on how often you are paid' }
				]
			}
		],
		example: {
			title: '$85,000 salary in Ontario, paid every two weeks',
			steps: [
				'Federal income tax $10,226.60 and Ontario income tax $5,324.46 (including the Health Premium). The unrounded parts add to $15,551.05.',
				'CPP and CPP2 $4,646.45; EI $1,123.07.',
				'Net pay per year = $85,000 − $15,551.05 tax − $4,646.45 − $1,123.07 = $63,679.43.',
				'Per pay period = $63,679.43 ÷ 26.'
			],
			result: 'Net pay is about $2,449.21 every two weeks.'
		},
		faq: [
			{
				q: 'How much is a $85,000 salary after tax in Ontario?',
				a: 'About $63,679 a year in 2026, or $2,449.21 every two weeks, after income tax, CPP and EI. That is roughly 74.9% of gross pay. Other provinces give different results, so pick yours above.'
			},
			{
				q: 'What is CPP2?',
				a: `CPP2 is a second CPP tier on earnings between ${cad(YMPE)} and ${cad(YAMPE)}. The employee rate is ${pct(CPP2_RATE * 100, 0)}, so it adds up to ${moneyIn('CAD', cpp2Max)} a year. It only affects people who earn above the first ceiling.`
			},
			{
				q: 'Do CPP and EI stop partway through the year?',
				a: `Yes, once you reach the yearly maximum. EI stops at ${moneyIn('CAD', EI_MAX_PREMIUM)} and CPP at ${moneyIn('CAD', cppMain)}, with CPP2 adding up to ${moneyIn('CAD', cpp2Max)} more if you earn above ${cad(YMPE)}. Higher earners then see larger paycheques late in the year.`
			},
			{
				q: 'How much does an RRSP contribution change my take-home pay?',
				a: 'Less than the contribution itself, because it lowers your tax. For example, putting $5,000 a year into an RRSP through payroll in Ontario cuts the $85,000 salary result by about $3,517 a year, not $5,000.'
			},
			{
				q: 'Why is my real paycheque slightly different?',
				a: 'Employers withhold tax with CRA payroll tables and your TD1 claims, and benefits or union dues may also apply. This tool works out the tax for the full year, so your first paycheques can differ a little.'
			},
			{
				q: 'Can I use it if I work in Quebec?',
				a: 'Not yet. Quebec uses QPP, QPIP and its own income tax, which this tool does not model.'
			}
		],
		sources: [CRA_RATES_SOURCE, CRA_T4127_SOURCE, CPP_SOURCE, EI_SOURCE],
		disclaimer: `Estimates for tax year ${CA_TAX_YEAR}, not payroll advice. Benefits, union dues and credits you claim on your TD1 are not included.`
	}
});
