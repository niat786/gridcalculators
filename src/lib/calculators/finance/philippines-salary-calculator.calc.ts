import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn } from '../format';
import meta from './philippines-salary-calculator.meta';
import {
	PH_13TH_DEADLINE,
	PH_13TH_DIVISOR,
	PH_BONUS_EXEMPTION,
	PH_PAGIBIG_EMPLOYEE_RATE,
	PH_PAGIBIG_EMPLOYEE_RATE_LOW,
	PH_PAGIBIG_LOW_PAY_LIMIT,
	PH_PAGIBIG_MAX_FUND_SALARY,
	PH_PAGIBIG_SOURCE,
	PH_PAGIBIG_SOURCE_2,
	PH_PHILHEALTH_CEILING,
	PH_PHILHEALTH_EMPLOYEE_SHARE,
	PH_PHILHEALTH_FLOOR,
	PH_PHILHEALTH_RATE,
	PH_PHILHEALTH_SOURCE,
	PH_PHILHEALTH_SOURCE_2,
	PH_SSS_EMPLOYEE_RATE,
	PH_SSS_EMPLOYER_RATE,
	PH_SSS_MSC_MAX,
	PH_SSS_MSC_MIN,
	PH_SSS_MSC_STEP,
	PH_SSS_SOURCE,
	PH_SSS_TABLE_SOURCE,
	PH_TAX_BRACKETS,
	PH_TAX_CONTRIBUTIONS_SOURCE,
	PH_TAX_SOURCE,
	PH_TAX_SOURCE_2,
	PH_YEAR_LABEL
} from '../data/ph-2026';

const cents = (n: number) => Math.round(n * 100) / 100;
const peso = (n: number) => money(n);
/** Content is built before a currency is chosen, so format pesos explicitly. */
const php = (n: number) => moneyIn('PHP', n, true);
/** A rate such as 0.025 as "2.5%". */
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function taxRows(): string[][] {
	return PH_TAX_BRACKETS.map((b, i) => {
		const next = PH_TAX_BRACKETS[i + 1];
		const band = i === 0 ? `Up to ${php(next.over)}` : next ? `${php(b.over)} to ${php(next.over)}` : `Over ${php(b.over)}`;
		const tax = b.rate === 0 ? 'Nil' : b.base === 0 ? `${pc(b.rate)} of the amount over ${php(b.over)}` : `${php(b.base)} plus ${pc(b.rate)} of the amount over ${php(b.over)}`;
		return [band, tax];
	});
}

/** SSS monthly salary credit: 500-peso bands centred on the MSC, floor 5,000 and cap 35,000. */
export function sssMsc(pay: number): number {
	const banded = Math.floor((pay + PH_SSS_MSC_STEP / 2) / PH_SSS_MSC_STEP) * PH_SSS_MSC_STEP;
	return Math.min(PH_SSS_MSC_MAX, Math.max(PH_SSS_MSC_MIN, banded));
}

/** Annual income tax on taxable compensation (TRAIN table, 2023 onward). */
export function phAnnualTax(taxable: number): number {
	if (!(taxable > 0)) return 0;
	let b = PH_TAX_BRACKETS[0];
	for (const x of PH_TAX_BRACKETS) if (taxable > x.over) b = x;
	return b.base + (taxable - b.over) * b.rate;
}

const inputs: CalculatorInput[] = [
	{ id: 'basic', label: 'Monthly basic salary', type: 'number', default: 30_000, min: 1, max: 100_000_000, step: 500, prefix: '$', help: 'Before any deductions. SSS, PhilHealth and Pag-IBIG are all worked out on this figure.' },
	{ id: 'thirteenth', label: 'Include 13th month pay', type: 'toggle', default: true },
	{ id: 'bonus', label: 'Other bonuses and benefits per year', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 1000, prefix: '$', help: 'Christmas bonus, productivity incentives and similar. Tax-free together with the 13th month up to ₱90,000.' }
];

function calculate(v: InputValues): CalculationResult {
	const basic = Number(v.basic);
	const bonusIn = Number(v.bonus);
	if (!Number.isFinite(basic) || basic <= 0) {
		return { primaryResult: DASH, primaryLabel: 'Net monthly pay', summary: 'Enter your monthly basic salary as more than zero.' };
	}
	if (!Number.isFinite(bonusIn) || bonusIn < 0) {
		return { primaryResult: DASH, primaryLabel: 'Net monthly pay', summary: 'Enter other bonuses as zero or more.' };
	}

	// SSS: employee 5% of the monthly salary credit.
	const msc = sssMsc(basic);
	const sss = cents(msc * PH_SSS_EMPLOYEE_RATE);
	// PhilHealth: 5% of basic salary within the floor and ceiling, split equally.
	const phBase = Math.min(PH_PHILHEALTH_CEILING, Math.max(PH_PHILHEALTH_FLOOR, basic));
	const phTotal = cents(phBase * PH_PHILHEALTH_RATE);
	const philhealth = cents(phTotal * PH_PHILHEALTH_EMPLOYEE_SHARE);
	// Pag-IBIG: 1% up to 1,500 of pay, otherwise 2%, on a fund salary capped at 10,000.
	const fundSalary = Math.min(basic, PH_PAGIBIG_MAX_FUND_SALARY);
	const pagibig = cents(fundSalary * (basic <= PH_PAGIBIG_LOW_PAY_LIMIT ? PH_PAGIBIG_EMPLOYEE_RATE_LOW : PH_PAGIBIG_EMPLOYEE_RATE));
	const contributions = cents(sss + philhealth + pagibig);

	// Withholding: mandatory contributions come off first, then the annualised pay goes through the TRAIN table.
	const taxableMonthly = basic - contributions;
	const annualRegular = taxableMonthly * 12;
	const regularTax = phAnnualTax(annualRegular);
	const monthlyTax = cents(regularTax / 12);
	const net = cents(basic - contributions - monthlyTax);

	// Bonuses: 13th month (one-twelfth of a full year's basic pay) plus other benefits, tax-free up to 90,000 together.
	const thirteenth = v.thirteenth === true ? cents((basic * 12) / PH_13TH_DIVISOR) : 0;
	const bonusTotal = thirteenth + bonusIn;
	const exemptBonus = Math.min(bonusTotal, PH_BONUS_EXEMPTION);
	const taxableBonus = bonusTotal - exemptBonus;
	const annualTax = phAnnualTax(annualRegular + taxableBonus);
	const bonusTax = cents(annualTax - regularTax);
	const annualTakeHome = cents(net * 12 + bonusTotal - bonusTax);

	const deductionTotal = cents(contributions + monthlyTax);
	const summary =
		`${peso(basic)} basic less ${peso(contributions)} SSS, PhilHealth and Pag-IBIG and ${peso(monthlyTax)} withholding tax leaves ${peso(net)} a month.` +
		(bonusTax > 0 ? ` Bonuses above the ${money(PH_BONUS_EXEMPTION, true)} exemption add ${peso(bonusTax)} of tax at year end.` : '');

	return {
		primaryResult: peso(net),
		primaryLabel: 'Net monthly pay',
		summary,
		secondaryMetrics: [
			{ label: 'SSS (employee share)', value: peso(sss) },
			{ label: 'PhilHealth (employee share)', value: peso(philhealth) },
			{ label: 'Pag-IBIG (employee share)', value: peso(pagibig) },
			{ label: 'Withholding tax per month', value: peso(monthlyTax) },
			{ label: 'Total deductions per month', value: peso(deductionTotal) },
			{ label: 'Tax on bonuses above the exemption', value: peso(bonusTax) },
			{ label: 'Take-home for the year, bonuses included', value: peso(annualTakeHome) }
		],
		table: {
			title: `Monthly pay breakdown, ${PH_YEAR_LABEL}`,
			columns: [
				{ key: 'item', label: 'Item' },
				{ key: 'amount', label: 'Amount', align: 'end' }
			],
			rows: [
				{ item: 'Monthly basic salary', amount: peso(basic) },
				{ item: `SSS monthly salary credit ${money(msc, true)} × 5%`, amount: peso(sss) },
				{ item: `PhilHealth ${money(phBase, true)} × 5% ÷ 2`, amount: peso(philhealth) },
				{ item: `Pag-IBIG fund salary ${money(fundSalary, true)} × ${basic <= PH_PAGIBIG_LOW_PAY_LIMIT ? '1' : '2'}%`, amount: peso(pagibig) },
				{ item: 'Taxable pay per month', amount: peso(taxableMonthly) },
				{ item: 'Taxable pay for the year (× 12)', amount: peso(annualRegular) },
				{ item: 'Income tax for the year on regular pay', amount: peso(regularTax) },
				{ item: 'Withholding tax per month', amount: peso(monthlyTax) },
				{ item: 'Net monthly pay', amount: peso(net) },
				{ item: '13th month pay and other bonuses', amount: peso(bonusTotal) },
				{ item: 'Tax-free part (up to ₱90,000)', amount: peso(exemptBonus) },
				{ item: 'Taxable part added to income', amount: peso(taxableBonus) }
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Enter your monthly basic salary to see your net pay in the Philippines for ${PH_YEAR_LABEL}. This Philippines salary calculator takes out the employee shares of SSS, PhilHealth and Pag-IBIG, then BIR withholding tax under the TRAIN law table.`,
		howTo: [
			'Enter your monthly basic salary before any deductions.',
			'Switch the 13th month pay on or off, and add any other yearly bonuses you expect.',
			'Read your net monthly pay and each deduction in the breakdown.',
			`Check the year-end tax on bonuses above ${php(PH_BONUS_EXEMPTION)}, if there is any.`
		],
		about: [
			{
				heading: `How much of your salary do you keep in the Philippines in ${PH_YEAR_LABEL}?`,
				paragraphs: [
					'Your take-home pay is your basic salary minus four things: SSS, PhilHealth, Pag-IBIG and income tax. The first three are mandatory contributions. The last is withholding tax, which your employer pays to the BIR (Bureau of Internal Revenue) for you.',
					'Your employer also pays its own share of SSS, PhilHealth and Pag-IBIG. That money is on top of your pay, so it never shows as a deduction. This tool only shows what leaves your pay.'
				]
			},
			{
				heading: `SSS, PhilHealth and Pag-IBIG rules for ${PH_YEAR_LABEL}`,
				paragraphs: [
					`SSS is the social security system for private-sector workers. Your share is ${pc(PH_SSS_EMPLOYEE_RATE)} of a monthly salary credit (MSC), which is your pay rounded to the nearest ${php(PH_SSS_MSC_STEP)}. The MSC never goes below ${php(PH_SSS_MSC_MIN)} or above ${php(PH_SSS_MSC_MAX)}.`,
					`PhilHealth is the national health insurance. The premium is ${pc(PH_PHILHEALTH_RATE)} of basic pay, and you and your employer split it equally. Pay below ${php(PH_PHILHEALTH_FLOOR)} is treated as ${php(PH_PHILHEALTH_FLOOR)}, and pay above ${php(PH_PHILHEALTH_CEILING)} is treated as ${php(PH_PHILHEALTH_CEILING)}.`,
					`Pag-IBIG is the home development fund. You pay ${pc(PH_PAGIBIG_EMPLOYEE_RATE)} of your pay, or ${pc(PH_PAGIBIG_EMPLOYEE_RATE_LOW)} if you earn ${php(PH_PAGIBIG_LOW_PAY_LIMIT)} or less. The calculation stops at a fund salary of ${php(PH_PAGIBIG_MAX_FUND_SALARY)}, so the most you pay is ${php(PH_PAGIBIG_MAX_FUND_SALARY * PH_PAGIBIG_EMPLOYEE_RATE)} a month.`
				],
				table: {
					caption: `Employee share of monthly contributions, ${PH_YEAR_LABEL}`,
					columns: ['Contribution', 'Rate', 'Pay used', 'Most you pay'],
					rows: [
						['SSS', pc(PH_SSS_EMPLOYEE_RATE), `MSC from ${php(PH_SSS_MSC_MIN)} to ${php(PH_SSS_MSC_MAX)}`, php(PH_SSS_MSC_MAX * PH_SSS_EMPLOYEE_RATE)],
						['PhilHealth', pc(PH_PHILHEALTH_RATE * PH_PHILHEALTH_EMPLOYEE_SHARE), `${php(PH_PHILHEALTH_FLOOR)} to ${php(PH_PHILHEALTH_CEILING)}`, php(PH_PHILHEALTH_CEILING * PH_PHILHEALTH_RATE * PH_PHILHEALTH_EMPLOYEE_SHARE)],
						['Pag-IBIG', pc(PH_PAGIBIG_EMPLOYEE_RATE), `Up to ${php(PH_PAGIBIG_MAX_FUND_SALARY)}`, php(PH_PAGIBIG_MAX_FUND_SALARY * PH_PAGIBIG_EMPLOYEE_RATE)]
					]
				}
			},
			{
				heading: 'How withholding tax is worked out',
				paragraphs: [
					'First, the three contributions come off your pay, because they are not taxed. Next, the tool multiplies what is left by 12 to get a yearly figure. Then it applies the TRAIN law table below, and divides the tax by 12.',
					`Bonuses are treated separately. Your 13th month pay and other benefits are tax-free up to ${php(PH_BONUS_EXEMPTION)} a year together. Only the part above that is added to taxable income. To see your 13th month pay on its own, use the [13th month pay calculator](/thirteenth-month-pay-calculator).`
				],
				table: { caption: `Annual income tax table for resident individuals, ${PH_YEAR_LABEL}`, columns: ['Taxable income for the year', 'Tax'], rows: taxRows() }
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It is built for a private-sector employee on a fixed monthly salary. Some cases need different rules, so the result can be off for them.',
					'SSS and PhilHealth are worked out on basic salary here. In real payroll, SSS uses your total compensation, so the figure on your payslip may differ.'
				],
				list: [
					'The minimum-wage earner exemption and de minimis benefits.',
					'Taxable allowances, overtime and night pay.',
					'Government employees, who pay GSIS instead of SSS.',
					'Self-employed and voluntary members, including the 8% flat-rate tax option.',
					'SSS WISP and MPF opt-outs, and tax on other income.'
				]
			},
			{
				heading: 'Tips for reading your result',
				paragraphs: [
					`Compare the result with your payslip line by line. If one line is different, ask your payroll team which pay amount they use. Then plan your month with the net figure, for example in the [budget calculator](/budget-calculator). To convert between monthly, daily and hourly pay, try the [salary calculator](/salary-calculator).`,
					`If you save from your net pay, the [savings calculator](/savings-calculator) shows how a monthly amount can grow. For a loan, the [loan calculator](/loan-calculator) shows the payment before you commit.`
				]
			}
		],
		formulas: [
			{
				title: 'Contributions (employee share)',
				expression: `SSS = ${pc(PH_SSS_EMPLOYEE_RATE)} × MSC · PhilHealth = ${pc(PH_PHILHEALTH_RATE * PH_PHILHEALTH_EMPLOYEE_SHARE)} × salary (${php(PH_PHILHEALTH_FLOOR)} to ${php(PH_PHILHEALTH_CEILING)}) · Pag-IBIG = ${pc(PH_PAGIBIG_EMPLOYEE_RATE)} × salary (up to ${php(PH_PAGIBIG_MAX_FUND_SALARY)})`,
				variables: [
					{ symbol: 'MSC', meaning: `SSS monthly salary credit: pay rounded to the nearest ${php(PH_SSS_MSC_STEP)}, with a minimum of ${php(PH_SSS_MSC_MIN)} and a maximum of ${php(PH_SSS_MSC_MAX)}` },
					{ symbol: 'PhilHealth', meaning: `The premium is ${pc(PH_PHILHEALTH_RATE)} of basic pay, shared equally. Pay under ${php(PH_PHILHEALTH_FLOOR)} counts as ${php(PH_PHILHEALTH_FLOOR)}, and pay over ${php(PH_PHILHEALTH_CEILING)} counts as ${php(PH_PHILHEALTH_CEILING)}` },
					{ symbol: 'Pag-IBIG', meaning: `${pc(PH_PAGIBIG_EMPLOYEE_RATE_LOW)} if pay is ${php(PH_PAGIBIG_LOW_PAY_LIMIT)} or less, otherwise ${pc(PH_PAGIBIG_EMPLOYEE_RATE)}, on a fund salary capped at ${php(PH_PAGIBIG_MAX_FUND_SALARY)}` }
				]
			},
			{
				title: 'Withholding tax (annual TRAIN table, 2023 onward)',
				expression: 'Tax per month = annual tax on [(basic − SSS − PhilHealth − Pag-IBIG) × 12] ÷ 12',
				variables: [
					{ symbol: 'Annual tax', meaning: taxRows().map((r) => `${r[0]}: ${r[1]}`).join(' · ') },
					{ symbol: 'Bonuses', meaning: `13th month pay and other benefits up to ${php(PH_BONUS_EXEMPTION)} a year are tax-free. Only the excess is taxed` }
				]
			}
		],
		example: {
			title: 'Basic salary of ₱30,000 a month, with 13th month pay',
			steps: [
				'SSS: salary credit ₱30,000 × 5% = ₱1,500. PhilHealth: ₱30,000 × 5% ÷ 2 = ₱750. Pag-IBIG: ₱10,000 × 2% = ₱200.',
				'Taxable pay: ₱30,000 − ₱2,450 = ₱27,550 a month, so ₱330,600 a year. Tax: (₱330,600 − ₱250,000) × 15% = ₱12,090 a year, or ₱1,007.50 a month.',
				'Net pay: ₱30,000 − ₱2,450 − ₱1,007.50 = ₱26,542.50. The 13th month pay of ₱30,000 is under ₱90,000, so it is tax-free.'
			],
			result: 'Net monthly pay ₱26,542.50'
		},
		faq: [
			{ q: 'How do I compute my take-home pay in the Philippines?', a: `Start with your monthly basic salary. Subtract your SSS, PhilHealth and Pag-IBIG shares, then subtract withholding tax on what is left. This Philippines salary calculator does all four steps for ${PH_YEAR_LABEL}.` },
			{ q: 'Is the 13th month pay taxed?', a: `Not up to ${php(PH_BONUS_EXEMPTION)} a year. That limit covers the 13th month pay and other benefits together. Only the part above it is added to taxable income. It must be paid by ${PH_13TH_DEADLINE}.` },
			{ q: 'What is the SSS rate in 2026?', a: `The total is ${pc(PH_SSS_EMPLOYEE_RATE + PH_SSS_EMPLOYER_RATE)} of the monthly salary credit. Employees pay ${pc(PH_SSS_EMPLOYEE_RATE)} and employers pay ${pc(PH_SSS_EMPLOYER_RATE)}. The credit runs from ${php(PH_SSS_MSC_MIN)} to ${php(PH_SSS_MSC_MAX)}.` },
			{ q: 'Why does the employer share not show?', a: 'You do not pay it. Your employer adds its own share of SSS, PhilHealth and Pag-IBIG on top of your pay, plus a small SSS employees’ compensation (EC) amount.' },
			{ q: 'Why is my payslip different from this result?', a: 'Payslips can include overtime, allowances, unpaid leave or company deductions. SSS also uses total compensation, while this tool uses basic salary. Small differences are normal.' },
			{ q: 'What is not included?', a: 'The minimum-wage earner exemption, taxable allowances, overtime, GSIS for government employees, self-employed rates and voluntary contributions are not modelled.' }
		],
		sources: [PH_SSS_SOURCE, PH_SSS_TABLE_SOURCE, PH_PHILHEALTH_SOURCE, PH_PHILHEALTH_SOURCE_2, PH_PAGIBIG_SOURCE, PH_PAGIBIG_SOURCE_2, PH_TAX_SOURCE, PH_TAX_SOURCE_2, PH_TAX_CONTRIBUTIONS_SOURCE],
		disclaimer: 'Estimate for a private-sector employee on a fixed monthly salary, using 2026 Philippine rules. It is not tax advice. Check the exact figures with your employer, the SSS, PhilHealth, Pag-IBIG and the BIR.'
	}
});
