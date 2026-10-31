import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './malaysia-epf-calculator.meta';
import {
	MY_EPF_BAND_LARGE,
	MY_EPF_BAND_LIMIT,
	MY_EPF_BAND_SMALL,
	MY_EPF_BAND_SMALL_LIMIT,
	MY_EPF_DIVIDEND_SOURCE,
	MY_EPF_DIVIDEND_SOURCE_2,
	MY_EPF_EMPLOYEE_PCT,
	MY_EPF_EMPLOYER_PCT_HIGH,
	MY_EPF_EMPLOYER_PCT_LOW,
	MY_EPF_EMPLOYER_THRESHOLD,
	MY_EPF_FOREIGN_PCT,
	MY_EPF_FOREIGN_SOURCE,
	MY_EPF_LATEST_DIVIDEND,
	MY_EPF_LATEST_DIVIDEND_YEAR,
	MY_EPF_SOURCE,
	MY_EPF_SOURCE_2,
	MY_EPF_SOURCE_3,
	MY_RELIEF_EPF_CAP
} from '../data/my-2026';

const rm = (n: number) => money(n);
/** Content is built before a currency is chosen, so format ringgit explicitly. */
const myr = (n: number) => moneyIn('MYR', n, true);
/** Round up to the next ringgit, ignoring floating-point noise. */
const ceilRinggit = (x: number) => Math.ceil(Math.round(x * 1e6) / 1e6 - 1e-9);

export interface EpfShare {
	employee: number;
	employer: number;
}

/**
 * Monthly EPF contribution. Citizens under 60: read from the Third Schedule band (RM20 bands up to RM5,000, RM100 bands
 * up to RM20,000), which equals the percentage of the band's upper limit; above RM20,000 the percentage applies to the
 * wage. Foreign employees: 2% each on the wage. Everything is rounded up to the next ringgit.
 */
export function epfMonthly(wage: number, category: string): EpfShare {
	if (category === 'foreign') {
		const c = ceilRinggit((wage * MY_EPF_FOREIGN_PCT) / 100);
		return { employee: c, employer: c };
	}
	const base =
		wage <= MY_EPF_BAND_SMALL_LIMIT
			? Math.ceil(wage / MY_EPF_BAND_SMALL - 1e-9) * MY_EPF_BAND_SMALL
			: wage <= MY_EPF_BAND_LIMIT
				? Math.ceil(wage / MY_EPF_BAND_LARGE - 1e-9) * MY_EPF_BAND_LARGE
				: wage;
	const employerPct = wage <= MY_EPF_EMPLOYER_THRESHOLD ? MY_EPF_EMPLOYER_PCT_LOW : MY_EPF_EMPLOYER_PCT_HIGH;
	return { employee: ceilRinggit((base * MY_EPF_EMPLOYEE_PCT) / 100), employer: ceilRinggit((base * employerPct) / 100) };
}

const inputs: CalculatorInput[] = [
	{ id: 'wage', label: 'Monthly wages', type: 'number', default: 4_000, min: 20, max: 10_000_000, step: 100, prefix: '$', help: 'Your basic pay plus regular allowances and commission, before deductions.' },
	{
		id: 'who',
		label: 'Employee type',
		type: 'select',
		default: 'citizen',
		display: 'segmented',
		options: [
			{ label: 'Malaysian under 60', value: 'citizen' },
			{ label: 'Foreign employee', value: 'foreign' }
		],
		help: 'Foreign employees (not domestic helpers) pay 2% each from October 2025 wages.'
	},
	{ id: 'age', label: 'Your age now', type: 'number', default: 30, min: 16, max: 59, step: 1, decimal: false, suffix: 'years' },
	{ id: 'retire', label: 'Project savings to age', type: 'select', default: '55', display: 'segmented', options: [{ label: '55', value: '55' }, { label: '60', value: '60' }] },
	{ id: 'balance', label: 'EPF savings now', type: 'number', default: 20_000, min: 0, max: 1_000_000_000, step: 1000, prefix: '$' },
	{ id: 'raise', label: 'Yearly pay rise', type: 'number', default: 3, min: 0, max: 30, step: 0.5, suffix: '%' },
	{ id: 'dividend', label: 'Yearly dividend rate', type: 'number', default: MY_EPF_LATEST_DIVIDEND, min: 0, max: 20, step: 0.05, suffix: '%', help: `${MY_EPF_LATEST_DIVIDEND}% was declared for ${MY_EPF_LATEST_DIVIDEND_YEAR}. Future rates are not guaranteed.` }
];

function calculate(v: InputValues): CalculationResult {
	const wage = Number(v.wage);
	const age = Number(v.age);
	const retire = Number(v.retire);
	const balance = Number(v.balance);
	const raise = Number(v.raise);
	const dividend = Number(v.dividend);
	const who = String(v.who);
	if (!Number.isFinite(wage) || wage < 20 || wage > 10_000_000) {
		return { primaryResult: DASH, primaryLabel: 'Projected EPF savings', summary: 'Enter monthly wages of at least RM20.' };
	}
	if (who !== 'citizen' && who !== 'foreign') {
		return { primaryResult: DASH, primaryLabel: 'Projected EPF savings', summary: 'Choose an employee type.' };
	}
	if (![balance, raise, dividend].every((x) => Number.isFinite(x) && x >= 0) || raise > 30 || dividend > 20) {
		return { primaryResult: DASH, primaryLabel: 'Projected EPF savings', summary: 'Enter savings, pay rise and dividend rate as zero or more.' };
	}
	if (!Number.isFinite(age) || age < 16 || !(retire === 55 || retire === 60)) {
		return { primaryResult: DASH, primaryLabel: 'Projected EPF savings', summary: 'Enter your age and choose 55 or 60.' };
	}

	const now = epfMonthly(wage, who);
	const monthlyTotal = now.employee + now.employer;
	const years = Math.floor(retire - age);
	const base = {
		secondary: [
			{ label: 'Your contribution per month (employee)', value: rm(now.employee) },
			{ label: 'Employer contribution per month', value: rm(now.employer) },
			{ label: 'Total going into EPF per month', value: rm(monthlyTotal) },
			{ label: 'Total going into EPF per year', value: rm(monthlyTotal * 12) }
		]
	};
	if (years < 1) {
		return {
			primaryResult: rm(monthlyTotal),
			primaryLabel: 'EPF contributions per month',
			summary: `You are already at or past ${retire}, so there is nothing to project. This is what goes into EPF each month on today's wages.`,
			secondaryMetrics: base.secondary
		};
	}

	let bal = balance;
	let accrued = 0;
	let contributed = 0;
	let wageNow = wage;
	let plain = balance; // savings with contributions only, no dividends
	const data: Record<string, number>[] = [{ age, balance: Math.round(bal), contributions: Math.round(plain) }];
	for (let m = 0; m < years * 12; m++) {
		if (m > 0 && m % 12 === 0) wageNow = wage * Math.pow(1 + raise / 100, m / 12);
		const share = epfMonthly(Math.round(wageNow * 100) / 100, who);
		const c = share.employee + share.employer;
		accrued += (bal * dividend) / 100 / 12;
		bal += c;
		plain += c;
		contributed += c;
		if (m % 12 === 11) {
			bal += accrued;
			accrued = 0;
			data.push({ age: age + (m + 1) / 12, balance: Math.round(bal), contributions: Math.round(plain) });
		}
	}
	const dividends = bal - balance - contributed;

	return {
		primaryResult: rm(bal),
		primaryLabel: `Projected EPF savings at ${retire}`,
		summary: `${years} years of contributions (starting at ${rm(monthlyTotal)} a month) plus ${rm(dividends)} of dividends at ${pct(dividend, 2)} a year.`,
		secondaryMetrics: [
			...base.secondary,
			{ label: 'Contributions over the period', value: rm(contributed) },
			{ label: 'Dividends over the period', value: rm(dividends) },
			{ label: 'Years to go', value: num(years, 0) }
		],
		chart: {
			type: 'line',
			title: 'EPF savings by age',
			x: 'age',
			xLabel: 'Age',
			series: [
				{ key: 'balance', label: 'With dividends' },
				{ key: 'contributions', label: 'Contributions only' }
			],
			data,
			valueFormat: 'currency'
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `See how much you and your employer pay into EPF (KWSP) each month in Malaysia, and project your savings to age 55 or 60. This Malaysia EPF calculator follows the EPF Third Schedule for Malaysians under 60 and the ${MY_EPF_FOREIGN_PCT}% rule for foreign employees.`,
		howTo: [
			'Enter your monthly wages and choose Malaysian under 60 or foreign employee.',
			'Add your age, your current EPF savings and the age you want to project to.',
			'Set your expected yearly pay rise and dividend rate.',
			'Read the monthly contributions and the projected savings at 55 or 60.'
		],
		about: [
			{
				heading: 'What is EPF?',
				paragraphs: [
					'The Employees Provident Fund (EPF, or KWSP in Malay) is Malaysia’s main retirement savings scheme. Each month, you and your employer pay a share of your wages into your EPF account. EPF then adds a dividend to your savings every year.',
					'This tool covers the rates in force in 2026. It focuses on two groups: Malaysian citizens under 60, and foreign employees.'
				]
			},
			{
				heading: 'EPF contribution rates in 2026',
				paragraphs: [
					`For a Malaysian under 60, you pay ${MY_EPF_EMPLOYEE_PCT}% of your wages. Your employer pays ${MY_EPF_EMPLOYER_PCT_LOW}% if your monthly wages are ${myr(MY_EPF_EMPLOYER_THRESHOLD)} or less, and ${MY_EPF_EMPLOYER_PCT_HIGH}% if they are above that.`,
					`Foreign employees (except domestic workers) and their employers pay ${MY_EPF_FOREIGN_PCT}% each. This rule applies to wages from October 2025.`
				],
				table: {
					caption: 'EPF rates on monthly wages',
					columns: ['Employee type', 'You pay', 'Employer pays'],
					rows: [
						[`Malaysian under 60, wages up to ${myr(MY_EPF_EMPLOYER_THRESHOLD)}`, `${MY_EPF_EMPLOYEE_PCT}%`, `${MY_EPF_EMPLOYER_PCT_LOW}%`],
						[`Malaysian under 60, wages above ${myr(MY_EPF_EMPLOYER_THRESHOLD)}`, `${MY_EPF_EMPLOYEE_PCT}%`, `${MY_EPF_EMPLOYER_PCT_HIGH}%`],
						['Foreign employee', `${MY_EPF_FOREIGN_PCT}%`, `${MY_EPF_FOREIGN_PCT}%`]
					]
				}
			},
			{
				heading: 'How the monthly contribution is worked out',
				paragraphs: [
					`EPF does not apply the percentage to your exact wage. For wages up to ${myr(MY_EPF_BAND_SMALL_LIMIT)}, it uses bands of ${myr(MY_EPF_BAND_SMALL)}. Up to ${myr(MY_EPF_BAND_LIMIT)}, the bands are ${myr(MY_EPF_BAND_LARGE)} wide. The percentage is applied to the top of your band.`,
					`For example, wages of ${myr(2990)} sit in the band that ends at ${myr(3000)}. You pay ${MY_EPF_EMPLOYEE_PCT}% of ${myr(3000)}, which is ${myr(3000 * MY_EPF_EMPLOYEE_PCT / 100)}. Your employer pays ${MY_EPF_EMPLOYER_PCT_LOW}%, which is ${myr(3000 * MY_EPF_EMPLOYER_PCT_LOW / 100)}.`,
					`Above ${myr(MY_EPF_BAND_LIMIT)}, the percentage applies to your actual wage. Any contribution with cents is rounded up to the next ringgit.`
				]
			},
			{
				heading: 'How the savings projection works',
				paragraphs: [
					'The tool starts with your current EPF savings. Each month it adds your contribution and your employer’s. Your wages grow by the pay rise you enter, once a year.',
					`It also adds a dividend. EPF declared ${MY_EPF_LATEST_DIVIDEND}% for ${MY_EPF_LATEST_DIVIDEND_YEAR}, and that rate is the default. EPF sets the rate every year, and a future rate is not guaranteed. So try a lower figure too.`,
					'The real dividend is credited once a year on your daily balances. The tool uses a close monthly approximation, so your EPF statement will differ a little.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: ['The result is an illustration, not a forecast. Some cases are outside the tool, so check with EPF for them.'],
				list: [
					'Malaysians aged 60 and over.',
					'Permanent residents who chose a different rate.',
					'Voluntary contributions and withdrawals.',
					'The split of savings between EPF accounts.'
				]
			},
			{
				heading: 'Tips to grow your EPF savings',
				paragraphs: [
					`Your own EPF contributions also count as a tax relief, up to ${myr(MY_RELIEF_EPF_CAP)} a year. See what that does to your bill in the [Malaysia income tax calculator](/malaysia-income-tax-calculator).`,
					'To plan beyond EPF, the [retirement calculator](/retirement-calculator) shows how much monthly income your savings can support. The [compound interest calculator](/compound-interest-calculator) and the [savings calculator](/savings-calculator) help you test extra savings on top.'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly contribution (Malaysian under 60)',
				expression: `Employee = ${MY_EPF_EMPLOYEE_PCT}% × wage · Employer = ${MY_EPF_EMPLOYER_PCT_LOW}% × wage (wage ≤ ${myr(MY_EPF_EMPLOYER_THRESHOLD)}) or ${MY_EPF_EMPLOYER_PCT_HIGH}% × wage (above ${myr(MY_EPF_EMPLOYER_THRESHOLD)}), rounded up to the next ringgit`,
				variables: [
					{ symbol: 'Wage band', meaning: `Wages up to ${myr(MY_EPF_BAND_SMALL_LIMIT)} sit in ${myr(MY_EPF_BAND_SMALL)} bands and wages up to ${myr(MY_EPF_BAND_LIMIT)} in ${myr(MY_EPF_BAND_LARGE)} bands, and the percentage is applied to the top of the band. Above ${myr(MY_EPF_BAND_LIMIT)} it is applied to the actual wage` },
					{ symbol: 'Foreign employee', meaning: `${MY_EPF_FOREIGN_PCT}% employee and ${MY_EPF_FOREIGN_PCT}% employer on wages from October 2025, rounded up to the next ringgit` }
				]
			},
			{
				title: 'Projection',
				expression: 'Each month: dividend accrues on the balance at rate ÷ 12, contributions are added; the accrued dividend is credited every 12 months',
				variables: [{ symbol: 'Dividend', meaning: 'EPF actually credits dividends once a year on daily balances. This is a close monthly approximation' }]
			}
		],
		example: {
			title: 'Wages of RM4,000, age 30 to 55, RM20,000 saved, 3% pay rise, 6.15% dividend',
			steps: [
				'Employee: 11% × RM4,000 = RM440. Employer: 13% × RM4,000 = RM520. Together RM960 a month, or RM11,520 a year.',
				'Wages rise 3% each year, so the contributions grow with them.',
				'Contributions and dividends are added month by month for 25 years, starting from RM20,000.'
			],
			result: 'Projected EPF savings at 55: RM957,290.39 (RM409,860 contributions plus RM527,430.39 dividends)'
		},
		faq: [
			{ q: 'How much EPF do I and my employer pay in Malaysia?', a: `For Malaysians under 60, you pay ${MY_EPF_EMPLOYEE_PCT}% of wages. Your employer pays ${MY_EPF_EMPLOYER_PCT_LOW}% on wages up to ${myr(MY_EPF_EMPLOYER_THRESHOLD)} or ${MY_EPF_EMPLOYER_PCT_HIGH}% above that. Foreign employees and their employers pay ${MY_EPF_FOREIGN_PCT}% each from October 2025.` },
			{ q: 'Which dividend rate should I use?', a: `EPF declared ${MY_EPF_LATEST_DIVIDEND}% for ${MY_EPF_LATEST_DIVIDEND_YEAR}. The rate changes every year and is not guaranteed, so try a lower figure too.` },
			{ q: 'Why is my EPF contribution rounded up?', a: 'EPF rounds any contribution with cents up to the next ringgit. It also applies the percentage to the top of your wage band, so the amount can be a little above the exact percentage.' },
			{ q: 'Is my EPF contribution tax deductible?', a: `Yes, up to ${myr(MY_RELIEF_EPF_CAP)} a year as a tax relief. Use the [Malaysia income tax calculator](/malaysia-income-tax-calculator) to see the effect.` },
			{ q: 'Can I use this for age 60 and over?', a: 'No. The tool covers Malaysians under 60 and foreign employees. Rates for other groups differ, so check with EPF.' },
			{ q: 'What is not included?', a: 'Permanent residents who chose a different rate, voluntary contributions, withdrawals and the split between EPF accounts are not modelled.' }
		],
		sources: [MY_EPF_SOURCE, MY_EPF_SOURCE_2, MY_EPF_SOURCE_3, MY_EPF_FOREIGN_SOURCE, MY_EPF_DIVIDEND_SOURCE, MY_EPF_DIVIDEND_SOURCE_2],
		disclaimer: 'Projection for illustration only, using Malaysian EPF rules for 2026. Your actual EPF statement and the dividends EPF declares will differ. It is not financial advice.'
	}
});
