import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import {
	ADDL_MEDICARE_RATE,
	ADDL_MEDICARE_THRESHOLD,
	FILING_LABEL,
	FILING_OPTIONS,
	federalTax,
	fica,
	IRS_TAX_SOURCE,
	MEDICARE_RATE,
	SS_RATE,
	SS_WAGE_BASE,
	STANDARD_DEDUCTION,

	TAX_YEAR,
	type FilingStatus
} from '../data/us-tax-2026';
import { LIMIT_401K } from '../data/us-retirement';
import meta from './take-home-pay-calculator.meta';

const PERIODS: Record<string, { label: string; n: number }> = {
	weekly: { label: 'Weekly', n: 52 },
	biweekly: { label: 'Every two weeks', n: 26 },
	semimonthly: { label: 'Twice a month', n: 24 },
	monthly: { label: 'Monthly', n: 12 },
	annual: { label: 'Yearly', n: 1 }
};

const usd = (n: number) => moneyIn('USD', n, true);
const usd2 = (n: number) => moneyIn('USD', n);
const pc = (r: number) => `${Math.round(r * 10000) / 100}%`;
const EX = (() => {
	const salary = 75_000;
	const deferral = Math.min(salary * 0.05, LIMIT_401K.elective);
	const fed = federalTax({ status: 'single', income: salary, adjustments: deferral, itemized: 0, seniors: 0, children: 0 });
	const payroll = fica(salary, 'single');
	const net = salary - deferral - fed.tax - payroll.total;
	const slices = fed.slices.filter((s) => s.taxed > 0).map((s) => `${pc(s.rate)} × ${usd(s.taxed)}`).join(' + ');
	return { salary, deferral, fed, payroll, net, slices };
})();

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'salary', label: 'Annual salary', type: 'number', default: 75000, min: 0, max: 50_000_000, prefix: '$' },
		{
			id: 'period',
			label: 'Pay frequency',
			type: 'select',
			default: 'biweekly',
			display: 'menu',
			options: Object.entries(PERIODS).map(([value, p]) => ({ label: p.label, value }))
		},
		{ id: 'status', label: 'Filing status', type: 'select', default: 'single', display: 'menu', options: FILING_OPTIONS },
		{ id: 'k401', label: 'Pre-tax 401(k)', type: 'number', default: 5, min: 0, max: 100, step: 0.5, suffix: '% of pay', width: 'half' },
		{ id: 'health', label: 'Pre-tax benefits', type: 'number', default: 0, min: 0, max: 1_000_000, prefix: '$', suffix: '/ yr', width: 'half', help: 'Health premiums, HSA, FSA (section 125)' },
		{ id: 'kids', label: 'Children under 17', type: 'number', default: 0, min: 0, max: 15, decimal: false, width: 'half' },
		{ id: 'state', label: 'State income tax', type: 'number', default: 0, min: 0, max: 15, step: 0.1, suffix: '%', width: 'half', help: 'Your state’s average rate. 0% in states with no wage tax (e.g. TX, FL)' }
	],
	calculate(v): CalculationResult {
		const salary = Number(v.salary);
		const period = PERIODS[String(v.period)];
		const status = String(v.status) as FilingStatus;
		const k401 = Number(v.k401) / 100;
		const health = Number(v.health);
		const kids = Number(v.kids);
		const stateRate = Number(v.state) / 100;
		if (!period || !(status in FILING_LABEL) || [salary, k401, health, kids, stateRate].some((x) => !Number.isFinite(x) || x < 0)) {
			return { primaryResult: DASH, primaryLabel: 'Take-home pay', summary: 'Enter your salary and pay details.' };
		}
		// 401(k) deferrals are capped by the IRS elective limit (under-50 figure).
		const deferral = Math.min(salary * k401, LIMIT_401K.elective);
		if (deferral + health > salary) {
			return { primaryResult: DASH, primaryLabel: 'Take-home pay', summary: 'Pre-tax deductions can’t be more than your salary.' };
		}
		// 401(k) is exempt from income tax but not FICA; section 125 benefits are exempt from both.
		const fed = federalTax({ status, income: salary, adjustments: deferral + health, itemized: 0, seniors: 0, children: kids, earned: salary - health });
		const fedTax = Math.max(0, fed.tax); // the refundable credit comes at filing, not in each paycheck
		const payroll = fica(salary - health, status);
		const stateTax = Math.max(0, salary - deferral - health) * stateRate;
		const net = salary - deferral - health - fedTax - payroll.total - stateTax;
		const per = (x: number) => money(x / period.n);
		const totalTax = fedTax + payroll.total + stateTax;
		return {
			primaryResult: per(net),
			primaryLabel: `Take-home pay (${period.label.toLowerCase()})`,
			summary: `${money(net, true)} a year after ${pct(salary > 0 ? (totalTax / salary) * 100 : 0, 1)} of your pay goes to taxes.`,
			secondaryMetrics: [
				{ label: 'Federal income tax', value: per(fedTax) },
				{ label: 'Social Security (6.2%)', value: per(payroll.ss) },
				{ label: 'Medicare (1.45%+)', value: per(payroll.medicare + payroll.addl) },
				{ label: 'State income tax', value: per(stateTax) },
				{ label: '401(k) contribution', value: per(deferral) },
				{ label: 'Pre-tax benefits', value: per(health) },
				{ label: 'Gross pay', value: per(salary) }
			],
			table: {
				title: `Your pay for ${TAX_YEAR} (${FILING_LABEL[status]})`,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'period', label: period.label, align: 'end' },
					{ key: 'year', label: 'Yearly', align: 'end' }
				],
				rows: [
					['Gross pay', salary],
					['401(k)', -deferral],
					['Pre-tax benefits', -health],
					['Federal income tax', -fedTax],
					['Social Security', -payroll.ss],
					['Medicare', -(payroll.medicare + payroll.addl)],
					['State income tax', -stateTax],
					['Take-home pay', net]
				].map(([item, x]) => ({ item: String(item), period: per(Number(x)), year: money(Number(x)) }))
			}
		};
	},
	content: {
		intro: `Use this take-home pay calculator to estimate your US paycheck after ${TAX_YEAR} federal income tax, Social Security, Medicare, a state tax rate and pre-tax deductions such as your 401(k). Enter your salary and pay schedule to see your net pay.`,
		howTo: [
			'Enter your annual salary and how often you are paid.',
			'Choose your filing status and add children under 17 for the child tax credit.',
			'Add your 401(k) percentage and any pre-tax health or HSA deductions.',
			'Enter your state’s income tax rate (0% if your state has none), then read your net pay.'
		],
		about: [
			{
				heading: 'What comes out of a US paycheck?',
				paragraphs: [
					'Your gross pay is your salary before anything is taken out. Your net pay, or take-home pay, is what lands in your bank account. The gap between them is made of a few parts.',
					`First, pre-tax deductions come out, such as 401(k) contributions and health insurance premiums. Next come taxes: federal income tax, Social Security, Medicare and, in most states, state income tax. Finally, any after-tax deductions are taken, like a Roth 401(k) contribution or union dues.`,
					`Your employer also pays ${pc(SS_RATE)} for Social Security and ${pc(MEDICARE_RATE)} for Medicare on your wages. Those payments don’t reduce your paycheck, so this calculator shows only your share.`
				]
			},
			{
				heading: `Payroll tax rules for ${TAX_YEAR}`,
				paragraphs: [
					'Social Security and Medicare are called FICA taxes. They are taken from wages at flat rates, unlike income tax, which rises in steps. The table shows the main rules the calculator uses.'
				],
				table: {
					caption: `Payroll and 401(k) figures, ${TAX_YEAR}`,
					columns: ['Item', 'Rate or limit'],
					rows: [
						['Social Security tax', `${pc(SS_RATE)} of wages up to ${usd(SS_WAGE_BASE)}`],
						['Medicare tax', `${pc(MEDICARE_RATE)} of all wages`],
						['Additional Medicare tax', `${pc(ADDL_MEDICARE_RATE)} on wages above ${usd(ADDL_MEDICARE_THRESHOLD.single)} (single), ${usd(ADDL_MEDICARE_THRESHOLD.mfj)} (joint) or ${usd(ADDL_MEDICARE_THRESHOLD.mfs)} (married filing separately)`],
						['Standard deduction (federal)', `${usd(STANDARD_DEDUCTION.single)} single, ${usd(STANDARD_DEDUCTION.mfj)} joint, ${usd(STANDARD_DEDUCTION.hoh)} head of household`],
						['401(k) employee limit', `${usd(LIMIT_401K.elective)} a year (the calculator caps your deferral here)`]
					]
				}
			},
			{
				heading: 'How the calculator works out your net pay',
				paragraphs: [
					'The calculator takes your 401(k) and pre-tax benefits off first. Then it works out your federal income tax on what is left, after the standard deduction and any child tax credit. For a closer look at that step, try the [income tax calculator](/income-tax-calculator).',
					'Next, it applies Social Security and Medicare. A traditional 401(k) contribution lowers your income tax but not your FICA tax. Health premiums paid through a section 125 plan lower both, so the calculator treats them that way.',
					'Last, it applies your state rate to your pay after those deductions. This is a flat estimate. Real state tax often uses brackets, so enter your average rate for the best result.'
				]
			},
			{
				heading: 'Why your real paycheck may differ',
				paragraphs: [
					'Your employer withholds tax using your W-4 form and the IRS withholding tables, not your final tax bill. So the two can differ a little. You settle the difference when you file your return.',
					'Some costs aren’t in this estimate. These include local income taxes, state disability or family leave contributions, after-tax deductions and wage garnishments.',
					'Pay frequency matters too. If you are paid every two weeks, you get 26 paychecks a year, so two months have three paychecks. Twice-monthly pay gives 24 equal checks.'
				]
			},
			{
				heading: 'Ways to plan around your take-home pay',
				paragraphs: ['A few simple checks can help you plan, whether you are comparing job offers or setting a budget:'],
				list: [
					'**Get the full employer match.** The [401(k) calculator](/401k-calculator) shows what a match is worth over time.',
					'**Compare pay in the same terms.** The [salary calculator](/salary-calculator) turns hourly pay into weekly, monthly and yearly amounts before tax.',
					'**Check your W-4.** If you often owe tax or get a large refund, your withholding may need a change.',
					'**Think about Roth savings.** Roth contributions don’t cut your tax today, but they can grow tax-free. See the [Roth IRA calculator](/roth-ira-calculator).',
					'**Know your state.** Nine states don’t tax wages: Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming.'
				]
			}
		],
		formulas: [
			{
				title: 'Take-home pay',
				expression: 'Net = Gross − 401(k) − Benefits − Federal tax − Social Security − Medicare − State tax',
				variables: [
					{ symbol: 'Federal tax', meaning: `${TAX_YEAR} brackets on (Gross − 401(k) − Benefits − standard deduction), minus the child tax credit` },
					{ symbol: 'Social Security', meaning: `${pc(SS_RATE)} of wages up to ${usd(SS_WAGE_BASE)}` },
					{ symbol: 'Medicare', meaning: `${pc(MEDICARE_RATE)} of all wages, plus ${pc(ADDL_MEDICARE_RATE)} above ${usd(ADDL_MEDICARE_THRESHOLD.single)} (${usd(ADDL_MEDICARE_THRESHOLD.mfj)} joint)` },
					{ symbol: 'State tax', meaning: 'your rate × (Gross − 401(k) − Benefits); a simple flat estimate' }
				]
			},
			{
				title: 'Pay per period',
				expression: 'Paycheck = Net ÷ pay periods per year',
				variables: [{ symbol: 'Pay periods', meaning: '52 weekly, 26 every two weeks, 24 twice a month, 12 monthly' }]
			}
		],
		example: {
			title: `${usd(EX.salary)} salary, single, 5% to a 401(k), paid every two weeks, no state tax`,
			steps: [
				`401(k): ${usd(EX.salary)} × 5% = ${usd(EX.deferral)} a year. Taxable income: ${usd(EX.salary)} − ${usd(EX.deferral)} − ${usd(STANDARD_DEDUCTION.single)} = ${usd(EX.fed.taxable)}`,
				`Federal tax: ${EX.slices} = ${usd2(EX.fed.tax)}`,
				`Social Security ${usd2(EX.payroll.ss)} and Medicare ${usd2(EX.payroll.medicare)}`,
				`Net: ${usd(EX.salary)} − ${usd(EX.deferral)} − ${usd2(EX.fed.tax)} − ${usd2(EX.payroll.ss)} − ${usd2(EX.payroll.medicare)} = ${usd2(EX.net)} a year`
			],
			result: `Take-home pay: ${usd2(EX.net / 26)} every two weeks.`
		},
		faq: [
			{
				q: 'How is take-home pay calculated?',
				a: 'Start with your gross pay. Subtract pre-tax deductions, federal income tax, Social Security, Medicare and state tax. What remains is your net pay. This take-home pay calculator does each step and then divides by your pay periods.'
			},
			{
				q: 'Why is my real paycheck slightly different?',
				a: 'Employers withhold using the IRS percentage tables and your W-4, which can differ a little from your actual yearly tax. Local taxes, state disability insurance and after-tax deductions also change the number.'
			},
			{
				q: 'Which states have no income tax on wages?',
				a: 'Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington and Wyoming. Enter 0% in the state field for these.'
			},
			{
				q: `What is the Social Security wage base for ${TAX_YEAR}?`,
				a: `${usd(SS_WAGE_BASE)}. You pay ${pc(SS_RATE)} on wages up to that amount and nothing on wages above it. Medicare has no cap.`
			},
			{
				q: 'Does a 401(k) lower my Social Security tax?',
				a: 'No. Traditional 401(k) contributions lower federal and most state income tax, but Social Security and Medicare are still taxed on them. Health premiums paid through a section 125 plan lower both.'
			},
			{
				q: 'Does this work for self-employed people?',
				a: 'No. Self-employed people pay both the employee and employer halves of Social Security and Medicare, and they handle estimated tax themselves. This tool is built for wage earners.'
			}
		],
		sources: [
			IRS_TAX_SOURCE,
			{ title: 'SSA — Contribution and benefit base', url: 'https://www.ssa.gov/oact/cola/cbb.html' },
			{ title: 'IRS — Topic no. 751, Social Security and Medicare withholding rates', url: 'https://www.irs.gov/taxtopics/tc751' }
		],
		disclaimer: 'An estimate for wage income using a flat state rate. Your W-4, local taxes and employer withholding tables can change your actual paycheck. Not tax advice.'
	}
});
