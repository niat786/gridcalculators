import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import { CAP_80C, IN_SEC123_SOURCE } from '../data/in-tax-fy2026-27';
import meta from './scss-calculator.meta';
import {
	MIS_RATE,
	NSI_SCSS_SOURCE,
	SCSS_MAX,
	SCSS_MIN,
	SCSS_MULTIPLE,
	SCSS_PAYOUTS_PER_YEAR,
	SCSS_RATE,
	SCSS_TERM_YEARS,
	SMALL_SAVINGS_PERIOD,
	SMALL_SAVINGS_PERIOD_SHORT,
	SMALL_SAVINGS_RATE_SOURCE,
	SMALL_SAVINGS_RATE_SOURCE_2
} from '../data/in-savings-2026';

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Interest every quarter', summary });

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount deposited', type: 'number', default: 3000000, min: SCSS_MIN, max: SCSS_MAX, step: SCSS_MULTIPLE, prefix: '$', help: 'In multiples of ₹1,000, up to ₹30 lakh across all your SCSS accounts.' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: SCSS_RATE, min: 0, max: 20, step: 0.1, suffix: '%', help: `${SMALL_SAVINGS_PERIOD_SHORT} rate. The rate on the day you open the account stays fixed for the 5 years.` }
	],
	calculate(v: InputValues): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		if (!Number.isFinite(amount) || amount < SCSS_MIN) return fail('Enter at least ₹1,000.');
		if (amount > SCSS_MAX) return fail('The limit is ₹30 lakh across all SCSS accounts.');
		if (amount % SCSS_MULTIPLE !== 0) return fail(`SCSS deposits are in multiples of ₹${SCSS_MULTIPLE.toLocaleString('en-IN')}.`);
		if (!Number.isFinite(rate) || rate < 0 || rate > 20) return fail('Enter an interest rate from 0% to 20%.');

		const yearly = (amount * rate) / 100;
		const quarter = yearly / SCSS_PAYOUTS_PER_YEAR;
		const total = yearly * SCSS_TERM_YEARS;

		return {
			primaryResult: money(quarter),
			primaryLabel: 'Interest paid every quarter',
			summary: `${money(amount, true)} at ${pct(rate)} pays ${money(quarter)} each quarter. You get your ${money(amount, true)} back after ${SCSS_TERM_YEARS} years.`,
			secondaryMetrics: [
				{ label: 'Interest each year', value: money(yearly) },
				{ label: 'Average each month', value: money(yearly / 12) },
				{ label: `Interest over ${SCSS_TERM_YEARS} years`, value: money(total) },
				{ label: `Total received after ${SCSS_TERM_YEARS} years`, value: money(amount + total) },
				{ label: 'Interest rate', value: pct(rate) }
			],
			table: {
				title: 'Payouts',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'quarter', label: 'Each quarter', align: 'end' },
					{ key: 'total', label: 'Total for the year', align: 'end' }
				],
				rows: Array.from({ length: SCSS_TERM_YEARS }, (_, i) => ({ year: String(i + 1), quarter: money(quarter), total: money(yearly) }))
			}
		};
	},
	content: {
		intro: `Use this SCSS calculator to work out the interest a Senior Citizens Savings Scheme (SCSS) account pays every quarter. It uses the ${SMALL_SAVINGS_PERIOD} rate of ${SCSS_RATE}%, up to the ${inr(SCSS_MAX)} limit, for the standard ${SCSS_TERM_YEARS}-year term.`,
		howTo: [
			`Enter the amount you will deposit (in multiples of ${inr(SCSS_MULTIPLE)}, up to ${inr(SCSS_MAX)}).`,
			`Check the interest rate for the quarter in which you open the account. It stays fixed for the ${SCSS_TERM_YEARS} years.`,
			`Read the quarterly payout, the yearly interest and the ${SCSS_TERM_YEARS}-year total.`
		],
		about: [
			{
				heading: 'What is the Senior Citizens Savings Scheme?',
				paragraphs: [
					'The Senior Citizens Savings Scheme (SCSS) is a government-backed savings scheme for older people. It is built to give a steady income after retirement. As a result, many retirees use it. You can open an account at a post office or at many banks.',
					`First, you deposit a lump sum once. The minimum is ${inr(SCSS_MIN)}, in multiples of ${inr(SCSS_MULTIPLE)}, and the maximum is ${inr(SCSS_MAX)} across all your SCSS accounts. The term is ${SCSS_TERM_YEARS} years, and you can extend it by 3 years if you wish.`
				]
			},
			{
				heading: 'Who can open an SCSS account?',
				paragraphs: [
					'Anyone aged 60 or over can open an account. People aged 55 to 59 who retired under superannuation or VRS can also open one, and so can retired defence personnel from age 50. Joint accounts are only with a spouse.',
					'However, the scheme rules list the exact conditions and time limits. Check them with your post office or bank before you apply.'
				]
			},
			{
				heading: 'How SCSS interest is calculated',
				paragraphs: [
					`The government sets the SCSS rate every quarter. For ${SMALL_SAVINGS_PERIOD}, it is ${SCSS_RATE}% a year. The rate on the day you open the account stays fixed for the ${SCSS_TERM_YEARS} years.`,
					'The interest is simple, not compounded. Instead of being added to the deposit, it is paid out to you. So the calculator divides the yearly interest by 4 to get the quarterly payout.',
					'In practice, interest accrues to 31 March, 30 June, 30 September and 31 December. It is paid on the first working day of the next month. The first payment covers the days from your deposit to the quarter end, so it can differ from the later ones.'
				]
			},
			{
				heading: 'How much will you earn?',
				paragraphs: [
					'The payout is in direct proportion to the deposit, so a bigger deposit pays more. The table shows common amounts at 8.2%. At the maximum of ₹30,00,000, you receive ₹61,500 every quarter, and the deposit comes back at the end.'
				],
				table: {
					caption: `At ${SCSS_RATE}% for ${SCSS_TERM_YEARS} years`,
					columns: ['Deposit', 'Each quarter', 'Each year', 'Interest over 5 years'],
					rows: [
						['₹10,00,000', '₹20,500', '₹82,000', '₹4,10,000'],
						['₹15,00,000', '₹30,750', '₹1,23,000', '₹6,15,000'],
						['₹30,00,000', '₹61,500', '₹2,46,000', '₹12,30,000']
					]
				}
			},
			{
				heading: 'SCSS and tax',
				paragraphs: [
					`In the old tax regime, your SCSS deposit counts toward the section 80C limit of ${inr(CAP_80C)}. The new regime does not allow that deduction. The interest you receive is taxable at your slab rate.`,
					'This calculator shows interest before tax. If you want to know your slab, use the [India income tax calculator](/india-income-tax-calculator).'
				]
			},
			{
				heading: 'SCSS or post office MIS?',
				paragraphs: [
					`Both pay a regular income and return your deposit after 5 years. SCSS pays quarterly at ${SCSS_RATE}%, but it is only for older people. The [post office MIS](/post-office-mis-calculator) pays monthly at ${MIS_RATE}%, and it is open to adults.`,
					'For example, ₹9,00,000 in SCSS pays an average of ₹6,150 a month. In MIS, the same amount pays ₹5,550 a month. Also compare other safe options with the [FD calculator](/fd-calculator).'
				]
			}
		],
		formulas: [
			{
				expression: 'Quarterly interest = deposit × annual rate ÷ 4',
				variables: [
					{ symbol: 'deposit', meaning: 'amount in the account (up to ₹30 lakh in all SCSS accounts)' },
					{ symbol: 'annual rate', meaning: 'rate ÷ 100; interest is simple, paid out and not added to the balance' }
				]
			}
		],
		example: {
			title: '₹30,00,000 at 8.2%',
			steps: [
				'Interest each year: ₹30,00,000 × 8.2% = ₹2,46,000.',
				'Each quarter: ₹2,46,000 ÷ 4 = ₹61,500.',
				'Over 5 years: ₹2,46,000 × 5 = ₹12,30,000, and the ₹30,00,000 deposit is returned at the end.'
			],
			result: '₹61,500 every quarter'
		},
		faq: [
			{
				q: 'What is the SCSS interest rate now?',
				a: `It is ${SCSS_RATE}% a year for ${SMALL_SAVINGS_PERIOD}. The rate is fixed for your account from the day you open it.`
			},
			{
				q: 'How is SCSS interest calculated?',
				a: 'Interest is simple. Each quarter you get the deposit times the yearly rate, divided by 4. It is paid out and not added to your balance.'
			},
			{
				q: 'Who can open an SCSS account?',
				a: 'Anyone aged 60 or over. People aged 55 to 59 who retired under superannuation or VRS can also open one, and retired defence personnel from age 50. Joint accounts are only with a spouse.'
			},
			{
				q: 'What is the maximum deposit in SCSS?',
				a: `The limit is ${inr(SCSS_MAX)} across all your SCSS accounts. The minimum is ${inr(SCSS_MIN)}, in multiples of ${inr(SCSS_MULTIPLE)}.`
			},
			{
				q: 'When is the interest paid, and what is not included?',
				a: 'Interest accrues to 31 March, 30 June, 30 September and 31 December and is paid on the first working day of the next month. The first payment covers the days from your deposit to the quarter end, so it can differ. Tax and TDS on the interest are not included, and a 3-year extension is not modelled.'
			}
		],
		sources: [NSI_SCSS_SOURCE, SMALL_SAVINGS_RATE_SOURCE, SMALL_SAVINGS_RATE_SOURCE_2, IN_SEC123_SOURCE],
		disclaimer: 'This is an estimate for general information, not financial advice. Rates are set by the Government of India each quarter; check India Post or your bank for the current rate. Interest is taxable.'
	}
});
