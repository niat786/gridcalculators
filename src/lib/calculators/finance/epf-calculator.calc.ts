import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct, plural } from '../format';
import {
	EPF_CEILING_SOURCE,
	EPF_EMPLOYEE_PCT,
	EPF_EMPLOYER_PCT,
	EPF_MAX_RETIREMENT_AGE,
	EPF_RATE,
	EPF_RATE_YEAR,
	EPF_SOURCE,
	EPF_WAGE_CEILING,
	EPF_WAGE_CEILING_EFFECTIVE,
	EPS_PCT
} from '../data/in-epf';
import meta from './epf-calculator.meta';

const inr = (n: number) => moneyIn('INR', n, true);

export interface EpfYear {
	year: number;
	age: number;
	wage: number;
	employee: number;
	employer: number;
	eps: number;
	interest: number;
	closing: number;
}

export interface EpfInput {
	startAge: number;
	retireAge: number;
	/** Monthly basic + DA today. */
	wage: number;
	/** Yearly increase, % (applied after every 12 months). */
	raisePct: number;
	openingBalance: number;
	ratePct: number;
	/** 'ceiling' = 12% of wage up to the ceiling; 'actual' = 12% of the full wage. */
	basis: 'ceiling' | 'actual';
	/** 'next' = a month's contribution starts earning from the following month (EPFO's own working); 'same' = from its own month. */
	interestFrom: 'next' | 'same';
}

/**
 * Month-by-month EPF model. For each month:
 *  - PF wage = min(wage, ceiling) ('ceiling') or the full wage ('actual');
 *  - employee = 12% × PF wage;  employer's 12% × PF wage is split: EPS = 8.33% × min(wage, ceiling), rest to EPF;
 *  - interest for the month = running balance × rate ÷ 12, added to a pot that is credited to the balance every 12 months
 *    (EPFO credits yearly on 31 March, so interest does not earn interest within the year).
 * EPS money goes to the pension fund, not to the EPF balance, and earns no interest here.
 */
export function epfSchedule(i: EpfInput): EpfYear[] {
	const years = i.retireAge - i.startAge;
	const rows: EpfYear[] = [];
	let balance = i.openingBalance;
	for (let y = 0; y < years; y++) {
		const wage = i.wage * Math.pow(1 + i.raisePct / 100, y);
		const pfWage = i.basis === 'actual' ? wage : Math.min(wage, EPF_WAGE_CEILING);
		const epsWage = Math.min(wage, EPF_WAGE_CEILING);
		const employee = (EPF_EMPLOYEE_PCT / 100) * pfWage;
		const eps = (EPS_PCT / 100) * epsWage;
		const employerEpf = (EPF_EMPLOYER_PCT / 100) * pfWage - eps;
		let accrued = 0;
		for (let m = 0; m < 12; m++) {
			const add = employee + employerEpf;
			const base = i.interestFrom === 'same' ? balance + add : balance;
			accrued += (base * i.ratePct) / 100 / 12;
			balance += add;
		}
		balance += accrued;
		rows.push({
			year: y + 1,
			age: i.startAge + y + 1,
			wage,
			employee: employee * 12,
			employer: employerEpf * 12,
			eps: eps * 12,
			interest: accrued,
			closing: balance
		});
	}
	return rows;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Your age now', type: 'number', default: 30, min: 15, max: 57, step: 1, decimal: false, suffix: 'years' },
		{
			id: 'retireAge',
			label: 'Retirement age',
			type: 'number',
			default: 58,
			min: 16,
			max: EPF_MAX_RETIREMENT_AGE,
			step: 1,
			decimal: false,
			suffix: 'years',
			help: `Up to ${EPF_MAX_RETIREMENT_AGE}, when EPS membership ends.`
		},
		{ id: 'wage', label: 'Monthly basic + DA', type: 'number', default: 50000, min: 1000, max: 10_000_000, step: 1000, prefix: '$' },
		{ id: 'raise', label: 'Yearly salary increase', type: 'number', default: 5, min: 0, max: 30, step: 0.5, suffix: '%' },
		{ id: 'balance', label: 'Current EPF balance', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 10000, prefix: '$', help: 'Leave 0 to start from scratch.' },
		{
			id: 'rate',
			label: 'EPF interest rate',
			type: 'number',
			default: EPF_RATE,
			min: 0,
			max: 15,
			step: 0.05,
			suffix: '%',
			help: `${EPF_RATE}% is the latest declared rate (${EPF_RATE_YEAR}). The rate is set every year; edit to test others.`
		},
		{
			id: 'basis',
			label: 'Contributions are on',
			type: 'select',
			display: 'segmented',
			default: 'ceiling',
			options: [
				{ label: 'Wage ceiling', value: 'ceiling' },
				{ label: 'Full basic + DA', value: 'actual' }
			],
			help: `Ceiling: 12% of wages up to ₹${num(EPF_WAGE_CEILING)} a month. Full: your employer also pays 12% on all of basic + DA.`
		},
		{
			id: 'interestFrom',
			label: 'A month’s contribution earns interest',
			type: 'select',
			display: 'segmented',
			default: 'next',
			options: [
				{ label: 'From next month', value: 'next' },
				{ label: 'From the same month', value: 'same' }
			],
			help: 'Next month matches EPFO’s own working. Some online calculators use the same month.'
		}
	],
	calculate(v: InputValues) {
		const age = Number(v.age);
		const retireAge = Number(v.retireAge);
		const wage = Number(v.wage);
		const raise = Number(v.raise);
		const balance = Number(v.balance);
		const rate = Number(v.rate);
		const basis = String(v.basis);
		const interestFrom = String(v.interestFrom);
		const fail = (summary: string) => ({ primaryResult: DASH, primaryLabel: 'EPF corpus at retirement', summary });
		if (!(Number.isInteger(age) && age >= 15 && age <= 57)) return fail('Enter your age as a whole number from 15 to 57.');
		if (!(Number.isInteger(retireAge) && retireAge <= EPF_MAX_RETIREMENT_AGE && retireAge > age)) {
			return fail(`Retirement age must be above your age and no more than ${EPF_MAX_RETIREMENT_AGE}.`);
		}
		if (!(wage >= 1000 && wage <= 10_000_000)) return fail('Enter your monthly basic + DA.');
		if (!(raise >= 0 && raise <= 30)) return fail('Enter a yearly increase between 0% and 30%.');
		if (!(balance >= 0 && balance <= 1_000_000_000)) return fail('Enter your current EPF balance (0 or more).');
		if (!(rate >= 0 && rate <= 15)) return fail('Enter an interest rate between 0% and 15%.');
		if (basis !== 'ceiling' && basis !== 'actual') return fail('Pick what contributions are based on.');
		if (interestFrom !== 'next' && interestFrom !== 'same') return fail('Pick when a contribution starts earning interest.');

		const rows = epfSchedule({ startAge: age, retireAge, wage, raisePct: raise, openingBalance: balance, ratePct: rate, basis, interestFrom });
		const last = rows[rows.length - 1];
		const sum = (k: 'employee' | 'employer' | 'eps' | 'interest') => rows.reduce((s, r) => s + r[k], 0);
		const employee = sum('employee');
		const employer = sum('employer');
		const interest = sum('interest');
		const years = retireAge - age;

		const first = rows[0];
		const chartData: Record<string, number>[] = [{ year: 0, balance, contributed: balance }];
		let contributed = balance;
		for (const r of rows) {
			contributed += r.employee + r.employer;
			chartData.push({ year: r.year, balance: r.closing, contributed });
		}

		return {
			primaryResult: money(last.closing, true),
			primaryLabel: `EPF corpus at age ${retireAge}`,
			summary: `${plural(years, 'year')} of contributions at ${pct(rate, 2)}, starting from ${money(first.employee / 12 + first.employer / 12, true)} a month into your EPF account.`,
			secondaryMetrics: [
				{ label: 'Your contributions', value: money(employee, true) },
				{ label: 'Employer’s share into EPF', value: money(employer, true) },
				{ label: 'Interest earned', value: money(interest, true) },
				{ label: 'Employer share to EPS (pension, not in corpus)', value: money(sum('eps'), true) }
			],
			chart: {
				type: 'line',
				title: 'EPF balance and contributions',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'EPF balance' },
					{ key: 'contributed', label: 'Contributions + opening balance' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'EPF balance by year',
				collapsed: true,
				columns: [
					{ key: 'age', label: 'Age', align: 'end' },
					{ key: 'wage', label: 'Monthly basic + DA', align: 'end' },
					{ key: 'employee', label: 'You', align: 'end' },
					{ key: 'employer', label: 'Employer (EPF)', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'closing', label: 'Balance', align: 'end' }
				],
				rows: rows.map((r) => ({
					age: String(r.age),
					wage: money(r.wage, true),
					employee: money(r.employee, true),
					employer: money(r.employer, true),
					interest: money(r.interest, true),
					closing: money(r.closing, true)
				}))
			}
		};
	},
	content: {
		intro: `Use this EPF calculator to estimate the Employees' Provident Fund (EPF) corpus you will have at retirement in India. It follows EPFO's rules: ${EPF_EMPLOYEE_PCT}% from you, ${EPF_EMPLOYER_PCT}% from your employer (${EPS_PCT}% of wages up to the ${inr(EPF_WAGE_CEILING)} ceiling goes to the pension scheme), and the ${EPF_RATE_YEAR} rate of ${EPF_RATE}%.`,
		howTo: [
			'Enter your age, the age you will retire (up to 58) and your monthly basic + DA.',
			'Add your expected yearly raise, any balance you already have and the interest rate.',
			'Choose whether contributions are on the wage ceiling or on your full basic + DA, then read the corpus and the yearly table.'
		],
		about: [
			{
				heading: 'What is the Employees’ Provident Fund?',
				paragraphs: [
					'The Employees’ Provident Fund (EPF) is a retirement savings scheme run by EPFO for salaried people in India. Every month, a part of your salary goes into your PF account, and your employer adds an equal share.',
					'The money earns interest set by the government each year. You usually get the balance when you retire. Because the contributions come straight from your salary, saving is automatic.'
				]
			},
			{
				heading: 'How EPF contributions are split',
				paragraphs: [
					`You pay ${EPF_EMPLOYEE_PCT}% of your PF wage (basic + DA). Your employer also pays ${EPF_EMPLOYER_PCT}%, but that share is split. ${EPS_PCT}% of wages, up to the ceiling, goes to the Employees’ Pension Scheme (EPS), and the rest (${(EPF_EMPLOYER_PCT - EPS_PCT).toFixed(2)}%) goes to your EPF account.`,
					`The wage ceiling is ${inr(EPF_WAGE_CEILING)} a month, raised from ₹15,000 on ${EPF_WAGE_CEILING_EFFECTIVE}. At the ceiling, you pay ${inr((EPF_WAGE_CEILING * EPF_EMPLOYEE_PCT) / 100)} a month, and the employer’s EPS share is about ${inr((EPF_WAGE_CEILING * EPS_PCT) / 100)}. So about ${inr((EPF_WAGE_CEILING * (EPF_EMPLOYEE_PCT + EPF_EMPLOYER_PCT - EPS_PCT)) / 100)} a month reaches your EPF account.`,
					'The EPS share builds your pension and does not add to your EPF balance. The calculator shows it separately.'
				]
			},
			{
				heading: 'How EPF interest is calculated',
				paragraphs: [
					`EPFO declares the rate once a year after the financial year ends. The latest declared rate is ${EPF_RATE}% for ${EPF_RATE_YEAR}. The calculator holds it constant, so edit it to test other rates.`,
					'Interest is worked out each month on the running balance, using the yearly rate divided by 12. The 12 monthly amounts are added up and credited once a year. As a result, a contribution starts earning from the month after it is made, which matches EPFO’s own working. You can switch this to the same month if you want to compare.'
				]
			},
			{
				heading: 'How the inputs change your corpus',
				paragraphs: [
					'The biggest levers are the interest rate, the starting age and whether contributions are on the ceiling or on your full wage. All rows below assume a monthly basic + DA of ₹50,000, a 5% yearly raise and retirement at 58, unless stated.'
				],
				table: {
					caption: 'Estimated EPF corpus',
					columns: ['Scenario', 'Corpus at retirement'],
					rows: [
						['Age 30, 8.25%, contributions on the ceiling', '₹48,51,613'],
						['Same, but at 7%', '₹39,15,310'],
						['Age 30, 8.25%, 5% yearly raise, on full basic + DA', '₹2,17,18,261'],
						['Age 40, ₹10,00,000 already saved, on the ceiling', '₹60,38,001']
					]
				}
			},
			{
				heading: 'Tips for growing your EPF',
				paragraphs: ['A few points can help you plan:'],
				list: [
					'**Remember the ceiling.** When your wage is above the ceiling, a raise does not change your contributions, unless you choose the full basic option. The calculator shows this.',
					'**Ask about PF on full basic.** If your employer agrees to pay on the full wage, the corpus can be several times higher, as the table shows.',
					'**Check your passbook.** Your EPFO passbook is the final word on your balance.',
					'**Combine with other savings.** Add a [PPF account](/ppf-calculator) or [NPS](/nps-calculator) for extra retirement money.',
					'**Know your take-home.** PF reduces your monthly pay. See the effect in the [in-hand salary calculator](/in-hand-salary-calculator).',
					'**Think about gratuity.** On leaving, you may also get [gratuity](/gratuity-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly contributions',
				expression: `You = 12% × PF wage;  Employer to EPS = ${EPS_PCT}% × min(wage, ceiling);  Employer to EPF = 12% × PF wage − EPS`,
				variables: [
					{ symbol: 'PF wage', meaning: `basic + DA, capped at ₹${num(EPF_WAGE_CEILING)} a month unless you choose the full amount` },
					{ symbol: 'Ceiling', meaning: `₹${num(EPF_WAGE_CEILING)} a month from ${EPF_WAGE_CEILING_EFFECTIVE} (it was ₹15,000 before)` }
				]
			},
			{
				title: 'Interest (EPFO method)',
				expression: 'Interest for a month = running balance × rate ÷ 12;  credited once a year',
				variables: [
					{ symbol: 'Running balance', meaning: 'balance carried into the month, so a contribution earns from the next month' },
					{ symbol: 'Yearly credit', meaning: 'the 12 monthly amounts are added at the end of the year and earn interest from then on' }
				]
			}
		],
		example: {
			title: 'Age 57 to 58, basic + DA ₹50,000, 8.25%, no raise, starting balance 0',
			steps: [
				'PF wage = ₹25,000 (the ceiling). You pay 12% = ₹3,000 a month.',
				'EPS = 8.33% × ₹25,000 = ₹2,082.50. Employer to EPF = ₹3,000 − ₹2,082.50 = ₹917.50.',
				'Into EPF each month: ₹3,000 + ₹917.50 = ₹3,917.50, so ₹47,010 over the year.',
				'Interest is the running balance × 8.25% ÷ 12 for each month, added up and credited at year end: ₹1,778.'
			],
			result: 'The corpus after the one year is ₹48,788 (₹47,010 contributed plus ₹1,778 interest).'
		},
		faq: [
			{
				q: 'How is the EPF corpus calculated?',
				a: 'Each month, your 12% and the employer’s EPF share are added to the balance. Interest is worked out on the running balance each month and credited once a year. The calculator repeats this until your retirement age.'
			},
			{
				q: 'What is the current EPF interest rate?',
				a: `The latest declared rate is ${EPF_RATE}% for ${EPF_RATE_YEAR}. EPFO declares the rate once a year after the financial year ends, so the calculator holds it constant for the future. Edit it to test other rates.`
			},
			{
				q: 'Why does the wage ceiling matter?',
				a: `Contributions are mandatory on basic + DA up to ${inr(EPF_WAGE_CEILING)} a month (₹15,000 before ${EPF_WAGE_CEILING_EFFECTIVE}). If you earn more, your employer may still pay 12% on the full wage, but the pension (EPS) share stays at ${EPS_PCT}% of the ceiling.`
			},
			{
				q: 'Does the corpus include the pension share?',
				a: 'No. The EPS share goes to the Employees’ Pension Scheme and builds your pension, not your EPF balance. It is shown separately.'
			},
			{
				q: 'Why does the calculator stop at age 58?',
				a: 'EPS membership ends at 58, and the split after 58 is not modelled here. The calculator also leaves out withdrawals, voluntary contributions and tax.'
			}
		],
		sources: [EPF_SOURCE, EPF_CEILING_SOURCE],
		disclaimer:
			'Estimates only. This tool does not model withdrawals, job changes, voluntary contributions (VPF), contributions after 58, income tax on interest, or the exact month your employer deposits. Your EPFO passbook is the final word.'
	}
});
