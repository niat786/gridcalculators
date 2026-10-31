import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './south-africa-take-home-pay-calculator.meta';
import {
	SARS_EMPLOYER_GUIDE_SOURCE,
	SARS_RATES_SOURCE,
	SARS_UIF_SOURCE,
	ZA_BRACKETS,
	ZA_REBATE_PRIMARY,
	ZA_RETIREMENT_CAP,
	ZA_RETIREMENT_RATE,
	ZA_TAX_YEAR_LABEL,
	ZA_TAX_YEAR_SHORT,
	ZA_UIF_MONTHLY_CEILING,
	ZA_UIF_RATE,
	zaIncomeTax,
	zaRetirementDeduction
} from '../data/za-2026-27';
import { AGE_OPTIONS, isAge } from './south-africa-income-tax-calculator.calc';

/** Content is built before a currency is chosen, so format rand explicitly. */
const zar = (n: number) => moneyIn('ZAR', n, true);
const zar2 = (n: number) => moneyIn('ZAR', n);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'salary', label: 'Monthly gross salary', type: 'number', default: 35000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/month', help: 'Pay before PAYE, UIF and any other deductions.' },
		{ id: 'age', label: 'Your age on 28 February 2027', type: 'select', display: 'segmented', default: 'under65', options: AGE_OPTIONS },
		{ id: 'retirement', label: 'Retirement fund contribution', type: 'number', default: 0, min: 0, max: 100_000_000, step: 500, prefix: '$', suffix: '/month', help: 'Pension, provident or retirement annuity paid by you each month.' },
		{ id: 'members', label: 'Medical aid members', type: 'number', default: 0, min: 0, max: 20, decimal: false, help: 'You plus every dependant on your scheme. Use 0 if you have none.' },
		{ id: 'premium', label: 'Medical aid premium you pay', type: 'number', default: 0, min: 0, max: 10_000_000, step: 100, prefix: '$', suffix: '/month', help: 'Optional. Taken off your net pay; the tax credit comes from the number of members.' }
	],
	calculate(v): CalculationResult {
		const salary = Number(v.salary);
		const retirement = Number(v.retirement);
		const members = Number(v.members);
		const premium = Number(v.premium);
		const age = v.age;
		if (
			!(salary > 0) ||
			!Number.isFinite(salary) ||
			!isAge(age) ||
			!Number.isFinite(retirement) ||
			retirement < 0 ||
			!Number.isFinite(members) ||
			members < 0 ||
			members > 20 ||
			!Number.isFinite(premium) ||
			premium < 0
		) {
			return { primaryResult: DASH, primaryLabel: 'Net pay per month', summary: 'Enter a monthly salary above zero, pick your age group, and use zero or more for the other amounts.' };
		}
		if (retirement + premium > salary) {
			return { primaryResult: DASH, primaryLabel: 'Net pay per month', summary: 'Your retirement contribution and medical aid premium add up to more than your salary. Check the amounts.' };
		}
		const annual = salary * 12;
		const deduction = zaRetirementDeduction(retirement * 12, annual);
		const taxable = annual - deduction;
		const r = zaIncomeTax(taxable, age, Math.floor(members));
		const paye = r.tax / 12;
		const uif = ZA_UIF_RATE * Math.min(salary, ZA_UIF_MONTHLY_CEILING);
		const net = salary - paye - uif - retirement - premium;
		const capped = retirement * 12 > deduction + 0.005;
		const summary = `PAYE is worked out on your salary for the full year (${money(taxable)} taxable).${
			capped ? ` Only ${money(deduction / 12)} a month of your retirement contribution is deductible (27.5% of pay, up to R430,000 a year).` : ''
		} Net pay is ${pct((net / salary) * 100, 1)} of gross.`;
		return {
			primaryResult: money(net),
			primaryLabel: 'Net pay per month',
			summary,
			secondaryMetrics: [
				{ label: 'Gross salary per month', value: money(salary) },
				{ label: 'PAYE per month', value: money(paye) },
				{ label: 'UIF per month', value: money(uif) },
				{ label: 'Retirement contribution', value: money(retirement) },
				{ label: 'Medical aid premium', value: money(premium) },
				{ label: 'Medical tax credit per month', value: money(r.medicalCredit / 12) },
				{ label: 'Average tax rate', value: pct(r.averageRate * 100, 2) }
			],
			table: {
				title: 'Monthly payslip',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'month', label: 'Per month', align: 'end' },
					{ key: 'year', label: 'Per year', align: 'end' }
				],
				rows: [
					{ item: 'Gross salary', month: money(salary), year: money(annual) },
					{ item: 'PAYE', month: money(-paye), year: money(-r.tax) },
					{ item: 'UIF', month: money(-uif), year: money(-uif * 12) },
					{ item: 'Retirement contribution', month: money(-retirement), year: money(-retirement * 12) },
					{ item: 'Medical aid premium', month: money(-premium), year: money(-premium * 12) },
					{ item: 'Net pay', month: money(net), year: money(net * 12) }
				]
			}
		};
	},
	content: {
		intro: `Estimate your monthly take-home pay in South Africa for the ${ZA_TAX_YEAR_LABEL}. This South Africa take-home pay calculator takes off PAYE, UIF and your own retirement and medical aid payments.`,
		howTo: [
			'Enter your monthly gross salary and your age group.',
			'Add what you pay into a pension, provident or retirement annuity fund each month.',
			'Add the number of medical aid members and, if you like, your monthly premium.',
			'Read your net pay and the monthly payslip table.'
		],
		about: [
			{
				heading: 'From gross salary to net pay',
				paragraphs: [
					'Your gross salary is what your employer agrees to pay you before deductions. Then your net pay, or take-home pay, is what reaches your bank account. In between, this tool removes PAYE, UIF and the payments you choose to make.',
					`The tool is for the ${ZA_TAX_YEAR_LABEL}. It does not use the exact SARS PAYE tables. Instead, it takes your salary for the whole year and works out the tax for that year, then divides by 12.`
				]
			},
			{
				heading: 'PAYE: how the monthly tax is worked out',
				paragraphs: [
					`PAYE is the income tax your employer holds back each month. First, the tool multiplies your salary by 12, subtracts your allowed retirement deduction, and finds the tax in the SARS brackets. Then it subtracts the primary rebate of ${zar(ZA_REBATE_PRIMARY)}, plus any age rebates and medical credit.`,
					`For example, the top bracket rate is ${pc(ZA_BRACKETS[ZA_BRACKETS.length - 1].rate)} and the first is ${pc(ZA_BRACKETS[0].rate)}. For the full bracket table and the rebates, see the [South Africa income tax calculator](/south-africa-income-tax-calculator).`
				]
			},
			{
				heading: 'UIF',
				paragraphs: [
					`The Unemployment Insurance Fund (UIF) takes ${pc(ZA_UIF_RATE)} of your pay from you, and your employer pays another ${pc(ZA_UIF_RATE)}. The pay counted stops at ${zar(ZA_UIF_MONTHLY_CEILING)} a month, so the most you pay is ${zar2(ZA_UIF_RATE * ZA_UIF_MONTHLY_CEILING)}.`
				]
			},
			{
				heading: 'Retirement fund and medical aid',
				paragraphs: [
					`Contributions to a pension, provident or retirement annuity fund lower your taxable pay, so they lower your PAYE. The deduction is the lesser of what you paid, ${pc(ZA_RETIREMENT_RATE)} of your pay and ${zar(ZA_RETIREMENT_CAP)} a year. However, the full contribution still leaves your pay, even if only part is deductible.`,
					'Medical aid works differently. The tax credit depends on how many people are on your scheme, not on the premium. So the premium you enter only reduces your net pay.'
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: ['Your payslip may differ from the result, because some items are not modelled. So small differences are normal.'],
				list: [
					'The Skills Development Levy, which your employer pays.',
					'Fringe benefits, travel allowances and bonuses taxed on their own.',
					'The additional medical expenses tax credit.',
					'Retirement contributions above the yearly cap.'
				]
			},
			{
				heading: 'Plan with your net pay',
				paragraphs: [
					'First, use your net pay as the base for your budget. The [budget calculator](/budget-calculator) splits it into needs, wants and savings. To compare job offers, the [salary calculator](/salary-calculator) converts pay between yearly, monthly and hourly figures.',
					'If you are buying a home, the [transfer duty calculator](/transfer-duty-calculator) shows the SARS duty, and the [mortgage calculator](/mortgage-calculator) shows the monthly bond payment. Check the yearly tax in the [South Africa income tax calculator](/south-africa-income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Net pay',
				expression: 'Net = salary − PAYE − UIF − retirement − medical premium',
				variables: [
					{ symbol: 'PAYE', meaning: '(tax on salary × 12 − retirement deduction, less rebates and medical credit) ÷ 12' },
					{ symbol: 'Retirement deduction', meaning: `Lesser of your contributions, ${pc(ZA_RETIREMENT_RATE)} of annual pay and ${zar(ZA_RETIREMENT_CAP)}` },
					{ symbol: 'UIF', meaning: `${pc(ZA_UIF_RATE)} of salary up to ${zar(ZA_UIF_MONTHLY_CEILING)} a month (maximum ${zar2(ZA_UIF_RATE * ZA_UIF_MONTHLY_CEILING)})` }
				]
			}
		],
		example: {
			title: 'R35,000 a month, under 65, no retirement fund or medical aid',
			steps: [
				'Annual salary R420,000 falls in the 31% bracket: R79,998 + 31% × (R420,000 − R383,100) = R91,437.',
				'Less the R17,820 primary rebate: tax R73,617 a year, or R6,134.75 a month.',
				'UIF is 1% of R17,712 = R177.12 a month.',
				'Net = R35,000 − R6,134.75 − R177.12 = R28,688.13.'
			],
			result: 'Take-home pay of about R28,688.13 a month.'
		},
		faq: [
			{ q: 'How do I calculate my take-home pay in South Africa?', a: 'Start with your monthly gross salary. Subtract PAYE, UIF, your retirement fund contribution and your medical aid premium. This South Africa take-home pay calculator does each step for the 2026/27 tax year.' },
			{ q: 'Why is my payslip different from this result?', a: 'Employers use SARS PAYE tables and may include fringe benefits, allowances, bonuses or other deductions. This tool annualises your salary, so small differences are normal.' },
			{ q: 'Is UIF capped?', a: `Yes. UIF is ${pc(ZA_UIF_RATE)} of pay up to ${zar(ZA_UIF_MONTHLY_CEILING)} a month, so the most you pay is ${zar2(ZA_UIF_RATE * ZA_UIF_MONTHLY_CEILING)}. Your employer pays another ${pc(ZA_UIF_RATE)}.` },
			{ q: 'Do retirement contributions lower my tax?', a: `Yes, up to the lesser of ${pc(ZA_RETIREMENT_RATE)} of your pay and ${zar(ZA_RETIREMENT_CAP)} a year. The tool applies this limit and shows a note if you go over it.` },
			{ q: 'Does my medical aid premium lower my tax?', a: 'Not directly. You get a monthly tax credit based on the number of members on your scheme. Your premium only reduces your net pay in this tool.' },
			{ q: 'What is not included?', a: 'The Skills Development Levy (paid by your employer), fringe benefits, travel allowances, bonuses taxed on their own, the additional medical expenses credit and retirement contributions above the yearly cap are not included.' }
		],
		sources: [SARS_RATES_SOURCE, SARS_EMPLOYER_GUIDE_SOURCE, SARS_UIF_SOURCE],
		disclaimer: `An estimate for the ${ZA_TAX_YEAR_SHORT} tax year, not payroll or tax advice.`
	}
});
