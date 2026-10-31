import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct, plural } from '../format';
import meta from './uk-student-loan-calculator.meta';
import {
	LOAN_BASE_RATE_PLUS_ONE,
	LOAN_INTEREST_CAP,
	LOAN_MARGIN,
	LOAN_PLAN2_UPPER_INTEREST_THRESHOLD,
	LOAN_PLANS,
	LOAN_RPI,
	PLAN5_FIRST_REPAYMENT_YEAR,
	UK_RATES_SOURCE,
	UK_TAX_YEAR,
	UK_STUDENT_LOAN_INTEREST_SOURCE,
	UK_STUDENT_LOAN_SOURCE,
	UK_STUDENT_LOAN_WRITE_OFF_SOURCE,
	type LoanPlan
} from '../data/uk-tax-2026-27';

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;
/** Percentage with up to two decimals and no trailing zeros, e.g. 4.1% or 5.46%. */
const pc2 = (r: number) => `${Number((r * 100).toFixed(2))}%`;
const PLAN_WHO: Record<LoanPlan, string> = {
	plan1: 'England and Wales before 2012; Northern Ireland',
	plan2: 'England and Wales, 2012 to 2023',
	plan4: 'Scotland',
	plan5: 'England, from August 2023',
	pg: 'Postgraduate Loan'
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Current interest rate for a plan (1 Sept 2026 – 31 Aug 2027 rules), as a fraction. */
export function planInterestRate(plan: LoanPlan, income: number, thresholdFactor = 1): number {
	switch (plan) {
		case 'plan1':
		case 'plan4':
			return Math.min(LOAN_RPI, LOAN_BASE_RATE_PLUS_ONE);
		case 'plan5':
			return LOAN_RPI;
		case 'pg':
			return Math.min(LOAN_RPI + LOAN_MARGIN, LOAN_INTEREST_CAP);
		case 'plan2': {
			const lower = LOAN_PLANS.plan2.threshold * thresholdFactor;
			const upper = LOAN_PLAN2_UPPER_INTEREST_THRESHOLD * thresholdFactor;
			const frac = Math.min(1, Math.max(0, (income - lower) / (upper - lower)));
			return Math.min(LOAN_INTEREST_CAP, LOAN_RPI + LOAN_MARGIN * frac);
		}
	}
}

function parseDate(s: string): { y: number; m: number } | null {
	const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!x) return null;
	const m = Number(x[2]);
	return m >= 1 && m <= 12 ? { y: Number(x[1]), m } : null;
}

const EX_SALARY = 38_900;
const EX_REPAYMENT = (LOAN_PLANS.plan1.rate * (EX_SALARY - LOAN_PLANS.plan1.threshold)) / 12;
const PLAN2_40K = (LOAN_PLANS.plan2.rate * (40_000 - LOAN_PLANS.plan2.threshold)) / 12;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'plan',
			label: 'Loan plan',
			type: 'select',
			display: 'menu',
			default: 'plan2',
			options: [
				{ label: 'Plan 1 (England/Wales before 2012, Northern Ireland)', value: 'plan1' },
				{ label: 'Plan 2 (England/Wales 2012–2023)', value: 'plan2' },
				{ label: 'Plan 4 (Scotland)', value: 'plan4' },
				{ label: 'Plan 5 (England from August 2023)', value: 'plan5' },
				{ label: 'Postgraduate Loan', value: 'pg' }
			]
		},
		{ id: 'salary', label: 'Annual gross salary', type: 'number', default: 40000, min: 0, max: 5_000_000, step: 500, prefix: '$' },
		{ id: 'balance', label: 'Loan balance', type: 'number', default: 45000, min: 0, max: 1_000_000, step: 500, prefix: '$' },
		{ id: 'auto', label: 'Use the current interest rate for my plan', type: 'toggle', default: true },
		{
			id: 'rate',
			label: 'Interest rate',
			type: 'number',
			default: 5,
			min: 0,
			max: 25,
			step: 0.1,
			suffix: '%',
			visibleWhen: (v) => !v.auto
		},
		{ id: 'growth', label: 'Salary growth per year', type: 'number', default: 3, min: -10, max: 30, step: 0.5, suffix: '%' },
		{
			id: 'thresholdGrowth',
			label: 'Repayment threshold rise per April',
			type: 'number',
			default: 0,
			min: 0,
			max: 20,
			step: 0.5,
			suffix: '%',
			help: 'Thresholds are set each year; 0% keeps the 2026/27 amount.'
		},
		{
			id: 'firstYear',
			label: 'April you first became due to repay (year)',
			type: 'number',
			default: 2021,
			min: 1990,
			max: 2060,
			decimal: false,
			help: 'The April after you left or finished your course. Write-off is counted from here. Plan 5 repayments start in April 2026 at the earliest.'
		},
		{ id: 'today', label: "Today's date", type: 'date', default: 'today', help: 'The calculation starts this month.' }
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Monthly repayment', summary });
		const plan = String(v.plan) as LoanPlan;
		const info = LOAN_PLANS[plan];
		const salary = Number(v.salary);
		const balance0 = Number(v.balance);
		const growth = Number(v.growth) / 100;
		const tGrowth = Number(v.thresholdGrowth) / 100;
		const firstYear = Math.floor(Number(v.firstYear));
		const start = parseDate(String(v.today));
		const auto = Boolean(v.auto);
		const customRate = Number(v.rate) / 100;
		if (!info) return fail('Pick a loan plan.');
		if (!(salary >= 0) || !Number.isFinite(salary)) return fail('Enter your annual salary.');
		if (!(balance0 > 0) || !Number.isFinite(balance0)) return fail('Enter your loan balance.');
		if (!(growth > -1) || !(tGrowth >= 0) || !Number.isFinite(firstYear) || !start) return fail('Check the growth rates, year and date.');
		if (!auto && !(customRate >= 0 && customRate <= 0.25)) return fail('Enter an interest rate between 0% and 25%.');

		const effectiveFirst = plan === 'plan5' ? Math.max(firstYear, PLAN5_FIRST_REPAYMENT_YEAR) : firstYear;
		const writeOffYear = effectiveFirst + info.writeOffYears; // written off in April of this year
		const MAX_MONTHS = 12 * 60;

		let bal = balance0;
		let totalRepaid = 0;
		let totalInterest = 0;
		let y = start.y;
		let m = start.m;
		let aprils = 0;
		let firstPayment = 0;
		let firstRate = 0;
		let paidOffAt = -1; // month index of the final payment
		let writtenOff = 0;
		let wroteOffReached = false;
		const yearly: { year: number; open: number; repaid: number; interest: number; close: number }[] = [];
		let yOpen = bal;
		let yRepaid = 0;
		let yInterest = 0;

		for (let i = 0; i < MAX_MONTHS; i++) {
			if (i > 0) {
				m++;
				if (m > 12) {
					m = 1;
					y++;
				}
				if (m === 4) aprils++;
			}
			if (y > writeOffYear || (y === writeOffYear && m >= 4)) {
				writtenOff = bal;
				bal = 0;
				wroteOffReached = true;
				break;
			}
			const salaryNow = salary * Math.pow(1 + growth, Math.floor(i / 12));
			const factor = Math.pow(1 + tGrowth, aprils);
			const rate = auto ? planInterestRate(plan, salaryNow, factor) : customRate;
			const beforePlan5 = plan === 'plan5' && (y < PLAN5_FIRST_REPAYMENT_YEAR || (y === PLAN5_FIRST_REPAYMENT_YEAR && m < 4));
			const due = beforePlan5 ? 0 : (info.rate * Math.max(0, salaryNow - info.threshold * factor)) / 12;
			if (i === 0) {
				firstPayment = due;
				firstRate = rate;
			}
			const interest = bal * (rate / 12);
			bal += interest;
			const pay = Math.min(due, bal);
			bal -= pay;
			totalInterest += interest;
			totalRepaid += pay;
			yRepaid += pay;
			yInterest += interest;
			if ((i + 1) % 12 === 0) {
				yearly.push({ year: (i + 1) / 12, open: yOpen, repaid: yRepaid, interest: yInterest, close: bal });
				yOpen = bal;
				yRepaid = 0;
				yInterest = 0;
			}
			if (bal <= 0.005) {
				bal = 0;
				paidOffAt = i;
				break;
			}
			if (i === MAX_MONTHS - 1) writtenOff = bal;
		}
		const lastIndex = paidOffAt >= 0 ? paidOffAt : -1;
		if (lastIndex >= 0 && (lastIndex + 1) % 12 !== 0) {
			const n = Math.floor(lastIndex / 12) + 1;
			yearly.push({ year: n, open: yOpen, repaid: yRepaid, interest: yInterest, close: 0 });
		} else if (lastIndex < 0 && !wroteOffReached && yRepaid + yInterest > 0) {
			yearly.push({ year: Math.floor(MAX_MONTHS / 12) + 1, open: yOpen, repaid: yRepaid, interest: yInterest, close: bal });
		}

		let outcome: string;
		let endsLabel: string;
		if (paidOffAt >= 0) {
			const months = paidOffAt + 1;
			const yrs = Math.floor(months / 12);
			const rem = months % 12;
			const endIndex = start.y * 12 + (start.m - 1) + paidOffAt;
			outcome = `Repaid in ${[yrs ? plural(yrs, 'year') : '', rem ? plural(rem, 'month') : ''].filter(Boolean).join(' ')}`;
			endsLabel = `${MONTHS[endIndex % 12]} ${Math.floor(endIndex / 12)}`;
		} else {
			outcome = writtenOff > 0 ? 'Written off before it is repaid' : 'Not repaid';
			endsLabel = `April ${writeOffYear}`;
		}

		return {
			primaryResult: money(firstPayment),
			primaryLabel: 'Monthly repayment now',
			summary:
				paidOffAt >= 0
					? `${outcome}, finishing in ${endsLabel}. You repay ${money(totalRepaid, true)} in total.`
					: `You are still paying when the loan is cancelled in April ${writeOffYear}; ${money(writtenOff, true)} is written off.`,
			secondaryMetrics: [
				{ label: 'Outcome', value: outcome },
				{ label: paidOffAt >= 0 ? 'Last payment' : 'Written off in', value: endsLabel },
				{ label: 'Total repaid', value: money(totalRepaid) },
				{ label: 'Interest charged', value: money(totalInterest) },
				{ label: 'Balance written off', value: money(writtenOff) },
				{ label: 'Interest rate now', value: pct(firstRate * 100) },
				{ label: 'Repayment threshold now', value: money(info.threshold, true) }
			],
			chart: {
				type: 'line',
				title: 'Loan balance over time',
				x: 'year',
				xLabel: 'Years from now',
				series: [{ key: 'balance', label: 'Balance' }],
				data: [{ year: 0, balance: balance0 }, ...yearly.map((r) => ({ year: r.year, balance: r.close }))],
				valueFormat: 'currency'
			},
			table: {
				title: 'Year by year',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'open', label: 'Opening balance', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'repaid', label: 'Repaid', align: 'end' },
					{ key: 'close', label: 'Closing balance', align: 'end' }
				],
				rows: yearly.map((r) => ({
					year: String(r.year),
					open: money(r.open),
					interest: money(r.interest),
					repaid: money(r.repaid),
					close: money(r.close)
				}))
			}
		};
	},
	content: {
		intro: `Estimate your UK student loan repayments for ${UK_TAX_YEAR}: how much comes out each month, whether you will clear the loan or have it written off, and the total you will repay. Choose Plan 1, 2, 4, 5 or a Postgraduate Loan.`,
		howTo: [
			'Choose your loan plan, then enter your salary and your loan balance.',
			'Keep the current interest rate for your plan, or switch it off and type your own.',
			'Set your yearly salary growth and the April you first became due to repay. That year sets the write-off date.',
			'Read your monthly repayment, the outcome and the year-by-year table.'
		],
		about: [
			{
				heading: 'How do UK student loan repayments work?',
				paragraphs: [
					'UK student loans are income-contingent. You repay a percentage of what you earn above a threshold, not a fixed share of the balance. If you earn less than the threshold, you repay nothing.',
					'Your employer takes the repayment from your pay through PAYE, along with tax and National Insurance. So a bigger balance does not raise your monthly repayment. It only changes how long you keep paying, or how much is written off at the end.',
					'The [UK take-home pay calculator](/uk-take-home-pay-calculator) shows how a repayment fits into your whole payslip.'
				]
			},
			{
				heading: `Repayment thresholds and write-off dates for ${UK_TAX_YEAR}`,
				paragraphs: [
					'Which plan you have depends on where and when you studied. Check your plan on your Student Loans Company account or your loan statement before you use the calculator.',
					'You can repay an undergraduate plan and a Postgraduate Loan at the same time. In that case, run the calculator once for each loan.'
				],
				table: {
					caption: `Repayment rules by plan, ${UK_TAX_YEAR}`,
					columns: ['Plan', 'Who it covers', 'Repay', 'Written off after'],
					rows: (['plan1', 'plan2', 'plan4', 'plan5', 'pg'] as LoanPlan[]).map((k) => [
						LOAN_PLANS[k].label,
						PLAN_WHO[k],
						`${pc(LOAN_PLANS[k].rate)} above ${gbp(LOAN_PLANS[k].threshold)}`,
						`${LOAN_PLANS[k].writeOffYears} years`
					])
				}
			},
			{
				heading: 'What interest rate does the calculator use?',
				paragraphs: [
					`Interest is added to your balance. From 1 September 2026 to 31 August 2027 it is based on the Retail Prices Index (RPI), which is ${pc2(LOAN_RPI)}. Plans 1 and 4 use the lower of RPI and the Bank of England base rate plus 1% (${pc2(LOAN_BASE_RATE_PLUS_ONE)}). Plan 5 uses RPI.`,
					`Plan 2 and the Postgraduate Loan add up to ${pc2(LOAN_MARGIN)} on top of RPI. For Plan 2 the extra amount grows with your income between ${gbp(LOAN_PLANS.plan2.threshold)} and ${gbp(LOAN_PLAN2_UPPER_INTEREST_THRESHOLD)}. Both are capped at ${pc2(LOAN_INTEREST_CAP)} for this period.`
				],
				table: {
					caption: 'Interest rate used when "current rate" is on',
					columns: ['Plan', 'Rate'],
					rows: [
						['Plan 1', pc2(planInterestRate('plan1', 0))],
						['Plan 2 at the lower threshold', pc2(planInterestRate('plan2', 0))],
						['Plan 2 at the upper interest threshold or above', pc2(planInterestRate('plan2', LOAN_PLAN2_UPPER_INTEREST_THRESHOLD))],
						['Plan 4', pc2(planInterestRate('plan4', 0))],
						['Plan 5', pc2(planInterestRate('plan5', 0))],
						['Postgraduate Loan', pc2(planInterestRate('pg', 0))]
					]
				}
			},
			{
				heading: 'Things that change the result',
				paragraphs: [
					'The calculator runs month by month from today. Four things move the answer the most.'
				],
				list: [
					'**Salary growth:** pay rises lift your repayment each year, so the loan clears sooner.',
					'**Threshold rises:** thresholds are set each year. The calculator keeps the 2026/27 amount unless you enter a yearly rise.',
					`**Your first repayment April:** write-off is counted from the April after you left your course. Plan 5 repayments start in April ${PLAN5_FIRST_REPAYMENT_YEAR} at the earliest.`,
					'**Interest:** a higher rate means a slower fall in the balance, especially when your repayment is small.'
				]
			},
			{
				heading: 'Should you repay your loan early?',
				paragraphs: [
					'That depends on whether you expect to clear the loan before it is written off. If the calculator shows a balance written off, extra payments may only reduce the amount that would have been cancelled.',
					'If it shows the loan fully repaid, extra payments can save interest instead. In both cases, compare the loan with other goals, such as a deposit. The [UK mortgage calculator](/uk-mortgage-calculator) shows the cost of the home loan side, and the [loan calculator](/loan-calculator) works for other debts.',
					'This is a general guide, not financial advice. A regulated adviser or MoneyHelper can look at your whole situation.'
				]
			}
		],
		formulas: [
			{
				title: 'Repayment and interest',
				expression: 'Monthly repayment = rate × (salary − threshold) ÷ 12. Each month: balance = balance × (1 + interest ÷ 12) − repayment.',
				variables: [
					{ symbol: 'rate', meaning: `${pc(LOAN_PLANS.plan1.rate)} of income over the threshold (${pc(LOAN_PLANS.pg.rate)} for the Postgraduate Loan)` },
					{
						symbol: 'threshold',
						meaning: (['plan1', 'plan2', 'plan4', 'plan5', 'pg'] as LoanPlan[]).map((k) => `${LOAN_PLANS[k].label} ${gbp(LOAN_PLANS[k].threshold)}`).join(', ')
					},
					{
						symbol: 'Write-off',
						meaning: `${(['plan1', 'plan2', 'plan4', 'plan5', 'pg'] as LoanPlan[]).map((k) => `${LOAN_PLANS[k].label} ${LOAN_PLANS[k].writeOffYears} years`).join(', ')}, counted from the April you were first due to repay`
					}
				]
			},
			{
				title: 'Interest rates used (1 Sept 2026 to 31 Aug 2027)',
				expression: `Plans 1 and 4: lower of RPI (${pc2(LOAN_RPI)}) and base rate + 1% (${pc2(LOAN_BASE_RATE_PLUS_ONE)}). Plan 5: RPI. Plan 2: RPI up to RPI + ${pc2(LOAN_MARGIN)} by income between ${gbp(LOAN_PLANS.plan2.threshold)} and ${gbp(LOAN_PLAN2_UPPER_INTEREST_THRESHOLD)}, capped at ${pc2(LOAN_INTEREST_CAP)}. Postgraduate: RPI + ${pc2(LOAN_MARGIN)}, capped at ${pc2(LOAN_INTEREST_CAP)}.`,
				variables: []
			}
		],
		example: {
			title: `Plan 1, ${gbp(EX_SALARY)} salary, £10,000 balance, 6% interest, no pay rise`,
			steps: [
				`Repayment = ${pc(LOAN_PLANS.plan1.rate)} × (${gbp(EX_SALARY)} − ${gbp(LOAN_PLANS.plan1.threshold)}) ÷ 12 = ${gbp2(EX_REPAYMENT)} a month`,
				'Monthly interest = 6% ÷ 12 = 0.5% of the balance',
				'It takes 163 monthly payments to clear the loan'
			],
			result: 'The loan is repaid in 13 years 7 months, with £14,633.26 repaid in total.'
		},
		faq: [
			{
				q: 'How much student loan will I repay each month?',
				a: `You repay your plan’s percentage of pay above its threshold, divided by 12. For example, on Plan 2 with a ${gbp(40_000)} salary, that is ${pc(LOAN_PLANS.plan2.rate)} of ${gbp(40_000 - LOAN_PLANS.plan2.threshold)}, or about ${gbp2(PLAN2_40K)} a month.`
			},
			{
				q: 'Why does my repayment not depend on my balance?',
				a: 'You repay a percentage of your income above the threshold, not a share of the loan. A bigger balance just takes longer to clear, or is written off before you finish.'
			},
			{
				q: 'When is my student loan written off?',
				a: `It depends on your plan: Plan 1 after ${LOAN_PLANS.plan1.writeOffYears} years, Plans 2, 4 and the Postgraduate Loan after ${LOAN_PLANS.plan2.writeOffYears} years, and Plan 5 after ${LOAN_PLANS.plan5.writeOffYears} years. The count starts from the April you were first due to repay. Some older loans follow different rules, which this tool does not model.`
			},
			{
				q: 'Can I have a student loan and a Postgraduate Loan at once?',
				a: 'Yes. You repay each one separately, so both deductions come out of your pay. Run the calculator once per loan, or use the take-home pay calculator to see both on one payslip.'
			},
			{
				q: 'What does the calculator assume?',
				a: 'It assumes your salary grows at the rate you choose, interest stays at the 2026/27 level, and you have one loan and a full-year salary. The cap on Plan 2 and Postgraduate interest is temporary. Interest is applied monthly, whereas the real figure is calculated daily.'
			}
		],
		sources: [UK_STUDENT_LOAN_SOURCE, UK_STUDENT_LOAN_INTEREST_SOURCE, UK_STUDENT_LOAN_WRITE_OFF_SOURCE, UK_RATES_SOURCE],
		disclaimer: 'Estimate only. Real interest is calculated daily and repayments depend on your pay each period. Not financial advice.'
	}
});
