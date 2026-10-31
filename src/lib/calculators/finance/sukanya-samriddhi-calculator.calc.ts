import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import { CAP_80C, IN_SEC123_SOURCE } from '../data/in-tax-fy2026-27';
import { PPF_RATE } from '../data/in-small-savings';
import meta from './sukanya-samriddhi-calculator.meta';
import { parseIso } from './capital-gains-tax-calculator-india.calc';
import {
	NSI_SOURCE,
	SMALL_SAVINGS_PERIOD,
	SMALL_SAVINGS_PERIOD_SHORT,
	SMALL_SAVINGS_RATE_SOURCE,
	SMALL_SAVINGS_RATE_SOURCE_2,
	SSY_DEPOSIT_YEARS,
	SSY_EXAMPLE_SOURCE,
	SSY_MATURITY_YEARS,
	SSY_MAX_DEPOSIT,
	SSY_MAX_OPENING_AGE,
	SSY_MIN_DEPOSIT,
	SSY_RATE,
	SSY_SOURCE
} from '../data/in-savings-2026';

/**
 * Year-by-year balance. Each yearly deposit is made at the start of the year (before the 5th of April, so it earns the
 * full year), interest is added at the end of every year, and the balance keeps earning until year 21.
 */
export function ssySchedule(deposit: number, ratePct: number) {
	const r = ratePct / 100;
	let balance = 0;
	let deposited = 0;
	const rows: { year: number; deposit: number; interest: number; balance: number; deposited: number }[] = [];
	for (let y = 1; y <= SSY_MATURITY_YEARS; y++) {
		const d = y <= SSY_DEPOSIT_YEARS ? deposit : 0;
		deposited += d;
		const interest = (balance + d) * r;
		balance = balance + d + interest;
		rows.push({ year: y, deposit: d, interest, balance, deposited });
	}
	return rows;
}

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Maturity amount', summary });

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'deposit', label: 'Yearly deposit', type: 'number', default: 150000, min: SSY_MIN_DEPOSIT, max: SSY_MAX_DEPOSIT, step: 1000, prefix: '$', help: `Between ₹${SSY_MIN_DEPOSIT} and ₹1.5 lakh a financial year.` },
		{ id: 'age', label: 'Girl’s age when the account opens', type: 'number', default: 2, min: 0, max: SSY_MAX_OPENING_AGE, step: 1, decimal: false, suffix: 'years', help: 'She must be under 10 on the opening date.' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: SSY_RATE, min: 0, max: 20, step: 0.1, suffix: '%', help: `${SMALL_SAVINGS_PERIOD_SHORT} rate. The government resets it every quarter, so this is an estimate.` },
		{ id: 'opened', label: 'Account opening date', type: 'date', default: 'today' }
	],
	calculate(v: InputValues): CalculationResult {
		const deposit = Number(v.deposit);
		const age = Number(v.age);
		const rate = Number(v.rate);
		const opened = parseIso(v.opened);
		if (!Number.isFinite(deposit) || deposit < SSY_MIN_DEPOSIT || deposit > SSY_MAX_DEPOSIT) return fail(`Enter a yearly deposit from ₹${SSY_MIN_DEPOSIT} to ₹1,50,000.`);
		if (!Number.isInteger(age) || age < 0 || age > SSY_MAX_OPENING_AGE) return fail('The girl must be under 10 years old when the account opens (enter 0 to 9).');
		if (!Number.isFinite(rate) || rate < 0 || rate > 20) return fail('Enter an interest rate from 0% to 20%.');
		if (!opened) return fail('Enter a valid opening date.');

		const rows = ssySchedule(deposit, rate);
		const last = rows[rows.length - 1];
		const total = deposit * SSY_DEPOSIT_YEARS;
		const interest = last.balance - total;
		const afterDeposits = rows[SSY_DEPOSIT_YEARS - 1].balance;
		const maturityYear = opened.y + SSY_MATURITY_YEARS;
		const lastDepositYear = opened.y + SSY_DEPOSIT_YEARS;

		return {
			primaryResult: money(last.balance),
			primaryLabel: `Maturity amount after ${SSY_MATURITY_YEARS} years`,
			summary: `${money(deposit, true)} a year for ${SSY_DEPOSIT_YEARS} years at ${pct(rate)} grows to ${money(last.balance, true)} by ${maturityYear}, when she is ${age + SSY_MATURITY_YEARS}.`,
			secondaryMetrics: [
				{ label: 'Total you deposit', value: money(total) },
				{ label: 'Interest earned', value: money(interest) },
				{ label: `Balance when deposits stop (year ${SSY_DEPOSIT_YEARS})`, value: money(afterDeposits) },
				{ label: 'Last deposit year', value: String(lastDepositYear) },
				{ label: 'Maturity year', value: `${maturityYear} (age ${age + SSY_MATURITY_YEARS})` }
			],
			chart: {
				type: 'line',
				title: 'Account balance and total deposited',
				x: 'year',
				xLabel: 'Year of the account',
				series: [
					{ key: 'balance', label: 'Balance' },
					{ key: 'deposited', label: 'Total deposited' }
				],
				data: [{ year: 0, balance: 0, deposited: 0 }, ...rows.map((r) => ({ year: r.year, balance: r.balance, deposited: r.deposited }))],
				valueFormat: 'currency'
			},
			table: {
				title: 'Year by year',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'deposit', label: 'Deposit', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows: rows.map((r) => ({ year: String(r.year), deposit: money(r.deposit, true), interest: money(r.interest), balance: money(r.balance) }))
			}
		};
	},
	content: {
		intro: `Use this Sukanya Samriddhi calculator to estimate what a Sukanya Samriddhi Account (SSY) will be worth after ${SSY_MATURITY_YEARS} years. Deposits run for the first ${SSY_DEPOSIT_YEARS} years, and the balance keeps earning interest until the account matures. Rate shown: ${SSY_RATE}% for ${SMALL_SAVINGS_PERIOD}.`,
		howTo: [
			`Enter the amount you will deposit each year, from ${inr(SSY_MIN_DEPOSIT)} to ${inr(SSY_MAX_DEPOSIT)}.`,
			`Enter your daughter’s age when the account opens (0 to ${SSY_MAX_OPENING_AGE}) and the account opening date.`,
			'Check the interest rate (it is set each quarter) and read the maturity amount, the interest and the year-by-year table.'
		],
		about: [
			{
				heading: 'What is the Sukanya Samriddhi Account?',
				paragraphs: [
					`The Sukanya Samriddhi Account is a government savings scheme for a girl child. A parent or guardian can open it if the girl is under 10 years old on the day the account opens. You can open it at a post office or at many banks. As a result, it is easy to start.`,
					`You can deposit ${inr(SSY_MIN_DEPOSIT)} to ${inr(SSY_MAX_DEPOSIT)} in a financial year. Deposits run for ${SSY_DEPOSIT_YEARS} years from opening. Then the account matures ${SSY_MATURITY_YEARS} years after opening, and interest is added once a year.`
				]
			},
			{
				heading: 'How the maturity amount is calculated',
				paragraphs: [
					`The government resets the SSY rate every quarter. For ${SMALL_SAVINGS_PERIOD}, it is ${SSY_RATE}%, which is higher than the ${PPF_RATE}% PPF rate for the same period. The calculator keeps one rate for all ${SSY_MATURITY_YEARS} years, but the real rate will change over time.`,
					`Each year, the calculator adds your deposit at the start of the year and then adds a full year of interest on the balance. It does this for ${SSY_DEPOSIT_YEARS} years. After that, you stop depositing, but the balance keeps growing for ${SSY_MATURITY_YEARS - SSY_DEPOSIT_YEARS} more years.`,
					'This assumes you deposit before the 5th of April each year. If you deposit later in the year, your interest is a little lower.'
				]
			},
			{
				heading: 'How much will the account be worth?',
				paragraphs: [
					`First, the table shows the balance for different yearly deposits at ${SSY_RATE}%. The final column is the maturity amount at year ${SSY_MATURITY_YEARS}. Also, more than half of the maturity amount comes from interest.`
				],
				table: {
					caption: `At ${SSY_RATE}% for ${SSY_MATURITY_YEARS} years`,
					columns: ['Yearly deposit', 'Total deposited', 'Balance at year 15', 'Maturity amount'],
					rows: [
						['₹12,000', '₹1,80,000', '₹3,58,079', '₹5,74,570'],
						['₹50,000', '₹7,50,000', '₹14,91,996', '₹23,94,040'],
						['₹1,00,000', '₹15,00,000', '₹29,83,993', '₹47,88,079'],
						['₹1,50,000', '₹22,50,000', '₹44,75,989', '₹71,82,119']
					]
				}
			},
			{
				heading: 'Why the last six years matter',
				paragraphs: [
					'After year 15, no more money goes in. Even so, the balance keeps compounding. With a ₹1,50,000 yearly deposit, the balance at year 15 is ₹44,75,989. By year 21, it reaches ₹71,82,119 without a single extra deposit.',
					'So starting early helps, because the scheme gives your daughter a long stretch of compounding.'
				]
			},
			{
				heading: 'SSY and tax',
				paragraphs: [
					`In the old tax regime, your yearly deposit counts toward the section 80C limit of ${inr(CAP_80C)}. The interest and the maturity amount are tax-free. The new regime does not allow the 80C deduction.`,
					'Then see how this changes your tax in the [India income tax calculator](/india-income-tax-calculator). To compare with another tax-free option, try the [PPF calculator](/ppf-calculator).'
				]
			},
			{
				heading: 'Tips for planning an SSY account',
				paragraphs: ['A few simple habits help you stay on track:'],
				list: [
					'**Open it early.** The girl must be under 10 on the opening date, and the longer the account runs, the more it earns.',
					'**Pay each year before 5 April.** A single early deposit earns the full year of interest.',
					'**Set a yearly amount you can keep up.** Even ₹12,000 a year grows to ₹5,74,570 at the rate used here.',
					'**Mix with other goals.** Pair it with a [SIP](/sip-calculator) for education costs, or the [NSC calculator](/nsc-calculator) for a 5-year saving.',
					'**Check the current rate.** The rate changes every quarter, so recheck before you plan.'
				]
			}
		],
		formulas: [
			{
				expression: 'Maturity = P × (1 + r) × [(1 + r)¹⁵ − 1] ÷ r × (1 + r)⁶',
				variables: [
					{ symbol: 'P', meaning: 'yearly deposit, made at the start of each year' },
					{ symbol: 'r', meaning: 'yearly interest rate ÷ 100, compounded once a year' },
					{ symbol: '15 and 6', meaning: '15 years of deposits, then 6 more years of interest to reach year 21' }
				]
			}
		],
		example: {
			title: '₹1,50,000 a year at 8.2%',
			steps: [
				'Deposit ₹1,50,000 at the start of each of the first 15 years: ₹22,50,000 in total.',
				'Each year the balance grows by 8.2%. After year 15 the balance is ₹44,75,989.33. It then grows for 6 more years with no new deposits.',
				'At year 21 the balance is ₹71,82,119.17, so interest is ₹49,32,119.17. This matches the ₹71.82 lakh in a published SSY example for the same inputs.'
			],
			result: '₹71,82,119.17 at maturity'
		},
		faq: [
			{
				q: 'What is the Sukanya Samriddhi interest rate now?',
				a: `It is ${SSY_RATE}% a year for ${SMALL_SAVINGS_PERIOD}. The government sets the rate every quarter and it applies to the whole balance, so the calculator keeps one rate for all ${SSY_MATURITY_YEARS} years.`
			},
			{
				q: 'How long do I deposit and when does the account mature?',
				a: `You deposit for ${SSY_DEPOSIT_YEARS} years from opening. The account matures ${SSY_MATURITY_YEARS} years after opening, and interest continues on the balance after the deposits stop.`
			},
			{
				q: 'How much can I deposit in a year?',
				a: `The minimum is ${inr(SSY_MIN_DEPOSIT)} and the maximum is ${inr(SSY_MAX_DEPOSIT)} in a financial year. The girl must be under 10 years old when the account opens.`
			},
			{
				q: 'Is Sukanya Samriddhi interest tax-free?',
				a: 'Yes. The interest and the maturity amount are tax-free. In the old tax regime, your deposits also count toward the section 80C limit.'
			},
			{
				q: 'Why might my actual maturity be different?',
				a: 'The rate will change over 21 years, and interest is worked on the lowest balance between the 5th and the end of each month. This calculator assumes each deposit is made at the start of the year, which gives the best case. Depositing later in the year gives less.'
			}
		],
		sources: [NSI_SOURCE, SSY_SOURCE, SMALL_SAVINGS_RATE_SOURCE, SMALL_SAVINGS_RATE_SOURCE_2, SSY_EXAMPLE_SOURCE, IN_SEC123_SOURCE],
		disclaimer: 'This is an estimate for general information, not financial advice. Rates are set by the Government of India each quarter; check India Post or your bank for the current rate.'
	}
});
