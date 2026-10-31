import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct, plural } from '../format';
import meta from './kiwisaver-calculator.meta';
import {
	BUSINESS_ESCT_SOURCE,
	ESCT_BANDS,
	GOV_CONTRIBUTION_RATE,
	GOV_CONTRIBUTION_INCOME_LIMIT,
	GOV_CONTRIBUTION_MAX,
	GOV_CONTRIBUTION_MAX_AGE,
	GOV_CONTRIBUTION_MIN_AGE,
	IRD_GOV_CONTRIBUTION_SOURCE,
	IRD_KIWISAVER_CHANGES_SOURCE,
	KIWISAVER_DEFAULT_RATE,
	NZ_TAX_YEAR,
	esctRate,
	govContribution
} from '../data/nz-tax-2026-27';

/** Illustrative long-run returns (after tax, before fees) for each fund type. These are assumptions, not rules. */
export const FUND_RETURNS: Record<string, { label: string; ret: number }> = {
	defensive: { label: 'Defensive', ret: 3.5 },
	conservative: { label: 'Conservative', ret: 4.5 },
	balanced: { label: 'Balanced', ret: 5.5 },
	growth: { label: 'Growth', ret: 6.5 },
	aggressive: { label: 'Aggressive', ret: 7.5 }
};

export interface KsInput {
	age: number;
	balance: number;
	salary: number;
	employeePct: number;
	employerPct: number;
	government: boolean;
	returnPct: number;
	feePct: number;
	growthPct: number;
	inflationPct: number;
}

/**
 * Yearly projection to age 65. Each year: employee contribution = rate × salary; employer contribution is taxed at
 * the ESCT rate for (salary + employer contribution); the member's contribution earns the government contribution
 * (25c per $1, max $260.72, none above $180,000 salary) which is credited at the end of the year. Employee and
 * employer money arrives evenly through the year (mid-year); the balance grows at (return − fees).
 */
export function projectKiwiSaver(i: KsInput) {
	const years = GOV_CONTRIBUTION_MAX_AGE - i.age;
	const net = (i.returnPct - i.feePct) / 100;
	let bal = i.balance;
	let employee = 0;
	let employer = 0;
	let esct = 0;
	let gov = 0;
	const path: { age: number; nominal: number; real: number }[] = [{ age: i.age, nominal: bal, real: bal }];
	for (let t = 0; t < years; t++) {
		const s = i.salary * Math.pow(1 + i.growthPct / 100, t);
		const mine = (s * i.employeePct) / 100;
		const theirs = (s * i.employerPct) / 100;
		const tax = esctRate(s + theirs) * theirs;
		const g = i.government && i.age + t >= GOV_CONTRIBUTION_MIN_AGE ? govContribution(mine, s) : 0;
		employee += mine;
		employer += theirs - tax;
		esct += tax;
		gov += g;
		bal = bal * (1 + net) + (mine + theirs - tax) * Math.pow(1 + net, 0.5) + g;
		path.push({ age: i.age + t + 1, nominal: bal, real: bal / Math.pow(1 + i.inflationPct / 100, t + 1) });
	}
	return { years, nominal: bal, real: bal / Math.pow(1 + i.inflationPct / 100, years), employee, employer, esct, gov, path };
}

/** Content is written once at build time, so format dollars explicitly (NZ$180,000). */
const nzd = (n: number) => moneyIn('NZD', n, true);
function esctRows(): string[][] {
	let from = 0;
	return ESCT_BANDS.map((b) => {
		const band = Number.isFinite(b.upTo) ? (from === 0 ? `Up to ${nzd(b.upTo)}` : `${nzd(from + 1)} to ${nzd(b.upTo)}`) : `Over ${nzd(from)}`;
		from = b.upTo;
		return [band, pct(b.rate * 100, 1)];
	});
}
/** Default case in the text: age 30, NZ$20,000 balance, NZ$70,000 salary, 3.5% each, balanced fund, 0.7% fees. */
const BASE_CASE: KsInput = {
	age: 30,
	balance: 20_000,
	salary: 70_000,
	employeePct: 3.5,
	employerPct: 3.5,
	government: true,
	returnPct: FUND_RETURNS.balanced.ret,
	feePct: 0.7,
	growthPct: 3,
	inflationPct: 2.5
};
function fundRows(): string[][] {
	return Object.values(FUND_RETURNS).map((f) => [f.label, pct(f.ret, 1), nzd(projectKiwiSaver({ ...BASE_CASE, returnPct: f.ret }).real)]);
}
function scenarioRows(): string[][] {
	const cases: [string, Partial<KsInput>][] = [
		['Default case', {}],
		['Starting at age 25', { age: 25 }],
		['Starting at age 45', { age: 45 }],
		['You contribute 6%', { employeePct: 6 }],
		['No employer contribution', { employerPct: 0 }],
		['Fees of 1.5%', { feePct: 1.5 }]
	];
	return cases.map(([label, change]) => [label, nzd(projectKiwiSaver({ ...BASE_CASE, ...change }).real)]);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Your age', type: 'number', default: 30, min: 16, max: 64, step: 1, decimal: false, suffix: 'years' },
		{ id: 'balance', label: 'Current KiwiSaver balance', type: 'number', default: 20000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'salary', label: 'Salary', type: 'number', default: 70000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Before tax. Contributions are a share of this.' },
		{
			id: 'employee',
			label: 'Your contribution rate',
			type: 'select',
			display: 'menu',
			default: String(KIWISAVER_DEFAULT_RATE),
			options: [
				{ label: '3% (temporary reduced rate)', value: '3' },
				{ label: '3.5% (default from 1 April 2026)', value: '3.5' },
				{ label: '4%', value: '4' },
				{ label: '6%', value: '6' },
				{ label: '8%', value: '8' },
				{ label: '10%', value: '10' }
			]
		},
		{ id: 'employer', label: 'Employer contribution rate', type: 'number', default: KIWISAVER_DEFAULT_RATE, min: 0, max: 20, step: 0.5, suffix: '%', help: 'Before employer superannuation contribution tax (ESCT), which is deducted for you.' },
		{ id: 'gov', label: 'Include government contribution', type: 'toggle', default: true },
		{
			id: 'fund',
			label: 'Fund type',
			type: 'select',
			display: 'menu',
			default: 'balanced',
			options: [
				...Object.entries(FUND_RETURNS).map(([value, f]) => ({ label: `${f.label} (assumed ${f.ret}%)`, value })),
				{ label: 'Custom return', value: 'custom' }
			],
			help: 'Assumed yearly returns after tax, before fees. Real returns vary.'
		},
		{ id: 'custom', label: 'Custom return', type: 'number', default: 5.5, min: -10, max: 30, step: 0.1, suffix: '%', visibleWhen: (v) => v.fund === 'custom' },
		{ id: 'fees', label: 'Fees', type: 'number', default: 0.7, min: 0, max: 10, step: 0.05, suffix: '%', help: 'Yearly fund fees as a share of your balance.' },
		{ id: 'growth', label: 'Salary growth', type: 'number', default: 3, min: 0, max: 20, step: 0.1, suffix: '%' },
		{ id: 'inflation', label: 'Inflation', type: 'number', default: 2.5, min: 0, max: 20, step: 0.1, suffix: '%' }
	],
	calculate(v): CalculationResult {
		const fundKey = String(v.fund);
		const returnPct = fundKey === 'custom' ? Number(v.custom) : FUND_RETURNS[fundKey]?.ret;
		const i: KsInput = {
			age: Number(v.age),
			balance: Number(v.balance),
			salary: Number(v.salary),
			employeePct: Number(v.employee),
			employerPct: Number(v.employer),
			government: v.gov === true,
			returnPct: returnPct as number,
			feePct: Number(v.fees),
			growthPct: Number(v.growth),
			inflationPct: Number(v.inflation)
		};
		const nums = [i.age, i.balance, i.salary, i.employeePct, i.employerPct, i.returnPct, i.feePct, i.growthPct, i.inflationPct];
		if (
			!nums.every(Number.isFinite) ||
			!(i.age >= 15 && i.age < GOV_CONTRIBUTION_MAX_AGE) ||
			i.balance < 0 || i.salary < 0 || i.employeePct < 0 || i.employerPct < 0 || i.feePct < 0 ||
			i.growthPct <= -50 || i.inflationPct <= -50 || i.returnPct - i.feePct <= -100
		) {
			return { primaryResult: DASH, primaryLabel: 'KiwiSaver balance at 65', summary: 'Enter an age under 65, your balance and salary.' };
		}
		const r = projectKiwiSaver(i);
		const govNote = i.government
			? i.salary > GOV_CONTRIBUTION_INCOME_LIMIT
				? ' No government contribution is paid on salaries over $180,000.'
				: ''
			: '';
		return {
			primaryResult: money(r.real, true),
			primaryLabel: 'Balance at 65 (today\'s dollars)',
			summary: `In ${plural(r.years, 'year')} your balance reaches ${money(r.nominal, true)} in future dollars, worth ${money(r.real, true)} today at ${pct(i.inflationPct, 1)} inflation.${govNote}`,
			secondaryMetrics: [
				{ label: 'Balance in future dollars', value: money(r.nominal, true) },
				{ label: 'Your contributions', value: money(r.employee, true) },
				{ label: 'Employer contributions (after ESCT)', value: money(r.employer, true) },
				{ label: 'ESCT paid on employer money', value: money(r.esct, true) },
				{ label: 'Government contributions', value: money(r.gov, true) },
				{ label: 'Government max per year', value: money(GOV_CONTRIBUTION_MAX) }
			],
			chart: {
				type: 'line',
				title: 'KiwiSaver balance by age',
				x: 'age',
				xLabel: 'Age',
				series: [
					{ key: 'nominal', label: 'Future dollars' },
					{ key: 'real', label: 'Today\'s dollars' }
				],
				data: r.path.map((p) => ({ age: p.age, nominal: Math.round(p.nominal), real: Math.round(p.real) })),
				valueFormat: 'currency'
			}
		};
	},
	content: {
		intro: `Project your KiwiSaver balance at 65 using the ${NZ_TAX_YEAR} rules. This KiwiSaver calculator uses your rate, your employer's contribution after ESCT, the government contribution of ${Math.round(GOV_CONTRIBUTION_RATE * 100)} cents per dollar (up to ${moneyIn('NZD', GOV_CONTRIBUTION_MAX)} a year), fees and returns.`,
		howTo: [
			'Enter your age, current balance and salary.',
			'Pick your contribution rate and your employer\'s rate.',
			'Choose a fund type, or enter your own return, and set the yearly fees.',
			'Set salary growth and inflation, then read your balance at 65 in current dollars and in future dollars.'
		],
		about: [
			{
				heading: 'What is KiwiSaver?',
				paragraphs: [
					'KiwiSaver is New Zealand\'s voluntary retirement saving scheme. You put in a share of your pay, your employer adds its own share, and the money is invested in a fund you choose.',
					'The government also adds a small yearly contribution if you qualify. The money is mostly locked in until you reach the eligibility age, with some exceptions such as buying a first home.',
					'This calculator estimates what your balance could be at 65. It is a projection, not a promise.'
				]
			},
			{
				heading: `KiwiSaver rates and the government contribution for ${NZ_TAX_YEAR}`,
				paragraphs: [
					`The default rate for you and your employer is ${KIWISAVER_DEFAULT_RATE}% from 1 April 2026. It rises to 4% from 1 April 2028, which this tool does not include. You can also choose a higher rate, such as 6%, 8% or 10%.`,
					`Inland Revenue pays ${Math.round(GOV_CONTRIBUTION_RATE * 100)} cents for each dollar you contribute between 1 July and 30 June, up to ${moneyIn('NZD', GOV_CONTRIBUTION_MAX)} a year. You need to contribute ${moneyIn('NZD', GOV_CONTRIBUTION_MAX / GOV_CONTRIBUTION_RATE)} to get the maximum. It is not paid if your taxable income is over ${nzd(GOV_CONTRIBUTION_INCOME_LIMIT)}, and it covers ages ${GOV_CONTRIBUTION_MIN_AGE} to ${GOV_CONTRIBUTION_MAX_AGE}.`,
					'Your employer pays tax on its contribution before it reaches your account. That tax is called ESCT, and its rate depends on your pay.'
				],
				table: { caption: `ESCT rates on employer contributions, ${NZ_TAX_YEAR}`, columns: ['Salary plus employer contributions', 'ESCT rate'], rows: esctRows() }
			},
			{
				heading: 'Which fund type should you assume?',
				paragraphs: [
					'Fund types differ in how much they hold in shares and in safer assets. A growth fund has more shares, so it can earn more over many years, but it can also fall in value.',
					'The calculator uses illustrative long-run returns after tax and before fees. These are assumptions, not rules, and real returns change every year. Choose Custom return to use your own figure.'
				],
				table: { caption: 'Default case, balance at 65 in current dollars', columns: ['Fund type', 'Assumed return', 'Balance at 65'], rows: fundRows() }
			},
			{
				heading: 'What changes your result most',
				paragraphs: [
					'Time, your rates and your employer\'s contribution matter most. The table starts from the default case (age 30, NZ$20,000 balance, NZ$70,000 salary, 3.5% each, balanced fund) and changes one thing at a time.',
					'Starting early gives your money more years to grow. If you want to see the pay side, try the [NZ PAYE calculator](/nz-paye-calculator).'
				],
				table: { caption: 'Balance at 65 in current dollars', columns: ['What changes', 'Balance'], rows: scenarioRows() }
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It holds your chosen rates steady, so it leaves out the 2028 step-up. It also holds ESCT bands at today\'s values and does not model first-home withdrawals, extra lump sums or changes in fund.',
					'Fees and returns are your own guesses, so check them against your provider. For other savings goals, the [savings calculator](/savings-calculator) and the [compound interest calculator](/compound-interest-calculator) work in any currency.'
				]
			}
		],
		formulas: [
			{
				title: 'Yearly projection',
				expression: 'Balance₍ₜ₊₁₎ = Balance₍ₜ₎ × (1 + r − f) + [Me + Employer × (1 − ESCT)] × (1 + r − f)^½ + Government',
				variables: [
					{ symbol: 'Me', meaning: 'your rate × salary' },
					{ symbol: 'Government', meaning: `${Math.round(GOV_CONTRIBUTION_RATE * 100)}% × your contributions, up to ${moneyIn('NZD', GOV_CONTRIBUTION_MAX)}, nil above ${nzd(GOV_CONTRIBUTION_INCOME_LIMIT)} income, paid for ages ${GOV_CONTRIBUTION_MIN_AGE} to ${GOV_CONTRIBUTION_MAX_AGE}` },
					{ symbol: 'ESCT', meaning: `employer contribution tax: ${ESCT_BANDS.map((b) => pct(b.rate * 100, 1)).join(', ')} by salary plus employer contribution` },
					{ symbol: 'r − f', meaning: 'return less fees' }
				]
			}
		],
		example: {
			title: 'Age 30, $20,000 balance, $70,000 salary, 3.5% each, balanced fund',
			steps: [
				'Year one: you add 3.5% × $70,000 = $2,450; your employer adds 3.5% × $70,000 = $2,450 less 30% ESCT',
				'The government adds 25c per $1, capped at $260.72 a year',
				'With a 5.5% return, 0.7% fees and 3% salary growth the balance reaches about $674,014 at 65, or $284,010 in current dollars at 2.5% inflation'
			],
			result: '$284,010 in current dollars'
		},
		faq: [
			{
				q: 'How much will I have in KiwiSaver at 65?',
				a: 'It depends on your age, pay, rates, fund and fees. In the default case, a 30-year-old on $70,000 reaches about $284,010 in current dollars. Enter your own details above to see yours.'
			},
			{
				q: 'What are the KiwiSaver rates now?',
				a: `The default employee and employer rate is ${KIWISAVER_DEFAULT_RATE}% from 1 April 2026, rising to 4% from 1 April 2028. You can also choose 4%, 6%, 8% or 10%. This calculator holds your chosen rates constant, so it does not include the 2028 step-up.`
			},
			{
				q: 'How does the government contribution work?',
				a: `Inland Revenue pays ${Math.round(GOV_CONTRIBUTION_RATE * 100)} cents for each dollar you contribute between 1 July and 30 June, up to ${moneyIn('NZD', GOV_CONTRIBUTION_MAX)} a year. You need to contribute ${moneyIn('NZD', GOV_CONTRIBUTION_MAX / GOV_CONTRIBUTION_RATE)} for the maximum. It is not paid if your taxable income is over ${nzd(GOV_CONTRIBUTION_INCOME_LIMIT)}.`
			},
			{
				q: 'What is ESCT?',
				a: 'ESCT is employer superannuation contribution tax. Your employer deducts it from its KiwiSaver contribution before the money reaches your account. The rate is between 10.5% and 39%, based on your salary plus employer contributions.'
			},
			{
				q: 'Are the fund returns guaranteed?',
				a: 'No. The returns for each fund type are illustrative long-run assumptions. Pick Custom return to use your own figure, and remember returns can be negative in some years.'
			}
		],
		sources: [IRD_KIWISAVER_CHANGES_SOURCE, IRD_GOV_CONTRIBUTION_SOURCE, BUSINESS_ESCT_SOURCE],
		disclaimer: 'A projection based on your assumptions, not a forecast or financial advice. ESCT bands are held at today\'s values and the 2028 rate increase is not included.'
	}
});
