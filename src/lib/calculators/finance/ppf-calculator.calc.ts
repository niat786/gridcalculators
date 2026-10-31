import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import { CAP_80C, IN_SEC123_SOURCE } from '../data/in-tax-fy2026-27';
import {
	PPF_EXTENSION_YEARS,
	PPF_MAX_DEPOSIT,
	PPF_MAX_EXTENSIONS,
	PPF_MIN_DEPOSIT,
	PPF_RATE,
	PPF_RATE_PERIOD,
	PPF_SOURCE,
	PPF_TERM_YEARS,
	SMALL_SAVINGS_SOURCE
} from '../data/in-small-savings';
import meta from './ppf-calculator.meta';

const inr = (n: number) => moneyIn('INR', n, true);

export interface PpfYear {
	year: number;
	opening: number;
	deposit: number;
	interest: number;
	closing: number;
}

/**
 * PPF schedule. Assumption: the full yearly deposit is made before the 5th of April, so it earns interest
 * for all 12 months. PPF interest is worked monthly on the lowest balance between the 5th and month-end and
 * credited once on 31 March; with the deposit in place from April, that adds up to
 * (opening balance + deposit) × annual rate for the year, compounding yearly.
 * `depositYears` is how many years get a deposit; the account runs for `totalYears`.
 */
export function ppfSchedule(deposit: number, ratePct: number, totalYears: number, depositYears: number): PpfYear[] {
	const rows: PpfYear[] = [];
	let balance = 0;
	for (let y = 1; y <= totalYears; y++) {
		const d = y <= depositYears ? deposit : 0;
		const interest = (balance + d) * (ratePct / 100);
		rows.push({ year: y, opening: balance, deposit: d, interest, closing: balance + d + interest });
		balance = balance + d + interest;
	}
	return rows;
}

const EXT_OPTIONS = Array.from({ length: PPF_MAX_EXTENSIONS + 1 }, (_, n) => ({
	value: String(n),
	label: n === 0 ? `No extension (${PPF_TERM_YEARS} years)` : `${n} × ${PPF_EXTENSION_YEARS}-year extension${n > 1 ? 's' : ''} (${PPF_TERM_YEARS + n * PPF_EXTENSION_YEARS} years)`
}));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'deposit',
			label: 'Yearly deposit',
			type: 'number',
			default: 150000,
			min: PPF_MIN_DEPOSIT,
			max: PPF_MAX_DEPOSIT,
			step: 500,
			prefix: '$',
			help: `Between ₹${num(PPF_MIN_DEPOSIT)} and ₹1,50,000 a year.`
		},
		{
			id: 'rate',
			label: 'Interest rate',
			type: 'number',
			default: PPF_RATE,
			min: 0,
			max: 15,
			step: 0.1,
			suffix: '%',
			help: `${PPF_RATE}% is the rate for ${PPF_RATE_PERIOD}. The rate changes every quarter; edit to test other rates.`
		},
		{ id: 'extensions', label: 'Extensions after 15 years', type: 'select', display: 'menu', default: '0', options: EXT_OPTIONS },
		{
			id: 'extDeposits',
			label: 'Keep depositing during extensions',
			type: 'toggle',
			default: true,
			help: 'Off = the balance just keeps earning interest.',
			visibleWhen: (v) => Number(v.extensions) > 0
		}
	],
	calculate(v: InputValues) {
		const deposit = Number(v.deposit);
		const rate = Number(v.rate);
		const ext = Number(v.extensions);
		const fail = (summary: string) => ({ primaryResult: DASH, primaryLabel: 'Maturity value', summary });
		if (!(deposit >= PPF_MIN_DEPOSIT && deposit <= PPF_MAX_DEPOSIT)) {
			return fail(`Enter a yearly deposit between ${money(PPF_MIN_DEPOSIT, true)} and ${money(PPF_MAX_DEPOSIT, true)}.`);
		}
		if (!(rate >= 0 && rate <= 15)) return fail('Enter an interest rate between 0% and 15%.');
		if (!(Number.isInteger(ext) && ext >= 0 && ext <= PPF_MAX_EXTENSIONS)) return fail('Pick the number of extensions.');

		const total = PPF_TERM_YEARS + ext * PPF_EXTENSION_YEARS;
		const depositYears = ext > 0 && v.extDeposits === false ? PPF_TERM_YEARS : total;
		const rows = ppfSchedule(deposit, rate, total, depositYears);
		const last = rows[rows.length - 1];
		const invested = deposit * depositYears;
		const interest = last.closing - invested;

		let cum = 0;
		const chartData: Record<string, number>[] = [{ year: 0, balance: 0, invested: 0 }];
		for (const r of rows) {
			cum += r.deposit;
			chartData.push({ year: r.year, balance: r.closing, invested: cum });
		}

		return {
			primaryResult: money(last.closing, true),
			primaryLabel: `Balance after ${total} years`,
			summary: `${money(deposit, true)} a year for ${depositYears} years at ${pct(rate, 2)}, deposited before 5 April each year, grows to ${money(last.closing, true)}.`,
			secondaryMetrics: [
				{ label: 'Total deposited', value: money(invested, true) },
				{ label: 'Interest earned (tax-free)', value: money(interest, true) },
				{ label: 'Account term', value: `${total} years` },
				{ label: 'Rate used', value: pct(rate, 2) }
			],
			chart: {
				type: 'line',
				title: 'PPF balance and total deposited',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Balance' },
					{ key: 'invested', label: 'Total deposited' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Year-by-year PPF balance',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'opening', label: 'Opening', align: 'end' },
					{ key: 'deposit', label: 'Deposit', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'closing', label: 'Closing', align: 'end' }
				],
				rows: rows.map((r) => ({
					year: String(r.year),
					opening: money(r.opening, true),
					deposit: money(r.deposit, true),
					interest: money(r.interest, true),
					closing: money(r.closing, true)
				}))
			}
		};
	},
	content: {
		intro: `Use this PPF calculator to estimate what your Public Provident Fund account in India will be worth after ${PPF_TERM_YEARS} years, or after one or more ${PPF_EXTENSION_YEARS}-year extensions. The default rate is ${PPF_RATE}%, the rate for ${PPF_RATE_PERIOD}.`,
		howTo: [
			`Enter what you will deposit each year (${inr(PPF_MIN_DEPOSIT)} to ${inr(PPF_MAX_DEPOSIT)}) and check the interest rate.`,
			`Pick how many ${PPF_EXTENSION_YEARS}-year extensions you want after the first ${PPF_TERM_YEARS} years, and whether you keep depositing in them.`,
			'Read the balance, the total you deposited and the tax-free interest, then open the year-by-year table.'
		],
		about: [
			{
				heading: 'What is the Public Provident Fund?',
				paragraphs: [
					'The Public Provident Fund (PPF) is a long-term savings scheme backed by the Government of India. You can open an account at a post office or at many banks. The money is locked in for a long time, so it suits retirement and long goals.',
					`You can deposit between ${inr(PPF_MIN_DEPOSIT)} and ${inr(PPF_MAX_DEPOSIT)} in a financial year. Anything above the maximum earns no interest. Also, the account runs for ${PPF_TERM_YEARS} years, and you can extend it in blocks of ${PPF_EXTENSION_YEARS} years, with or without further deposits.`
				]
			},
			{
				heading: 'How PPF interest is calculated',
				paragraphs: [
					`The government sets the PPF rate every quarter. For ${PPF_RATE_PERIOD}, it is ${PPF_RATE}% a year. The new rate applies to your whole balance, so the rate can change during the ${PPF_TERM_YEARS} years.`,
					'Interest is worked out every month on the lowest balance between the 5th and the end of the month. Then it is added to your account once a year, on 31 March. After that, it earns interest too, because it is part of the balance.',
					'This calculator assumes you deposit the full yearly amount before 5 April. In that case, the money earns for all 12 months, and each year adds up to (opening balance + deposit) × the yearly rate. However, if you deposit later, you earn a little less.'
				]
			},
			{
				heading: 'How much will your deposit grow to?',
				paragraphs: [
					`The table shows the balance after ${PPF_TERM_YEARS} years at ${PPF_RATE}%, with a deposit every year before 5 April. Because the rate may change, treat the numbers as estimates.`
				],
				table: {
					caption: `After ${PPF_TERM_YEARS} years at ${PPF_RATE}%`,
					columns: ['Yearly deposit', 'Total deposited', 'Balance after 15 years'],
					rows: [
						['₹12,000', '₹1,80,000', '₹3,25,457'],
						['₹50,000', '₹7,50,000', '₹13,56,070'],
						['₹1,00,000', '₹15,00,000', '₹27,12,139'],
						['₹1,50,000', '₹22,50,000', '₹40,68,209']
					]
				}
			},
			{
				heading: 'What happens if you extend the account?',
				paragraphs: [
					`After ${PPF_TERM_YEARS} years, you can keep the account going in blocks of ${PPF_EXTENSION_YEARS} years. You can keep depositing, or you can stop and let the balance earn interest on its own.`,
					'The table uses a ₹1,50,000 yearly deposit at 7.1%. As the second row shows, the balance keeps growing even without new deposits.'
				],
				table: {
					caption: '₹1,50,000 a year at 7.1%',
					columns: ['Account term', 'Total deposited', 'Balance'],
					rows: [
						['15 years', '₹22,50,000', '₹40,68,209'],
						['20 years, deposits stop after year 15', '₹22,50,000', '₹57,32,587'],
						['20 years, deposits continue', '₹30,00,000', '₹66,58,288'],
						['25 years, deposits continue', '₹37,50,000', '₹1,03,08,015']
					]
				}
			},
			{
				heading: 'PPF and tax',
				paragraphs: [
					`In the old tax regime, your yearly deposit counts toward the section 80C limit of ${inr(CAP_80C)}. The interest you earn and the money you get at maturity are tax-free. The new regime does not allow the 80C deduction.`,
					'To see how this changes your tax, use the [India income tax calculator](/india-income-tax-calculator). Your employee [EPF](/epf-calculator) contributions also count toward the same limit.'
				]
			},
			{
				heading: 'Tips for using PPF',
				paragraphs: ['A few habits help you get the most from a PPF account:'],
				list: [
					'**Deposit before the 5th of April.** A single deposit early in the year earns all 12 months of interest.',
					'**Know the limit.** Deposits above the yearly maximum earn no interest, so paying more gains nothing.',
					'**Plan for the lock-in.** PPF is not for money you may need soon. Check the withdrawal and loan rules with India Post or your bank.',
					'**Compare other schemes.** For a girl child, see the [Sukanya Samriddhi calculator](/sukanya-samriddhi-calculator). For a 5-year option, see the [NSC calculator](/nsc-calculator).',
					'**Mix safe and market-linked savings.** Compare PPF with a [SIP](/sip-calculator) to see the trade-off in risk and return.'
				]
			}
		],
		formulas: [
			{
				title: 'Yearly balance',
				expression: 'Balanceᵧ = (Balanceᵧ₋₁ + D) × (1 + r)',
				variables: [
					{ symbol: 'D', meaning: 'deposit for the year, made before the 5th of April' },
					{ symbol: 'r', meaning: 'annual PPF rate as a decimal' },
					{ symbol: 'Balanceᵧ', meaning: 'balance after interest is credited on 31 March of year y' }
				]
			},
			{
				title: 'Rule behind it',
				expression: 'Monthly interest = lowest balance between the 5th and month-end × r ÷ 12',
				variables: [
					{ symbol: 'Assumption', meaning: 'a deposit in place before 5 April earns all 12 months, so the year adds up to (opening + deposit) × r' },
					{ symbol: 'Credit', meaning: 'interest is paid once a year, on 31 March, and then earns interest itself' }
				]
			}
		],
		example: {
			title: '₹1,50,000 a year for 15 years at 7.1%',
			steps: [
				'Each year: (balance + ₹1,50,000) × 1.071.',
				'After year 1: ₹1,50,000 × 1.071 = ₹1,60,650.',
				'Repeat for 15 years to reach ₹40,68,209.',
				'Deposited: 15 × ₹1,50,000 = ₹22,50,000, so interest = ₹18,18,209.'
			],
			result: 'About ₹40.68 lakh after 15 years, the same figure the India Post PPF page shows for this deposit and rate.'
		},
		faq: [
			{
				q: 'What is the PPF interest rate now?',
				a: `It is ${PPF_RATE}% a year for ${PPF_RATE_PERIOD}. The government resets it every quarter, and the new rate applies to your whole balance.`
			},
			{
				q: 'What if I deposit after the 5th of April?',
				a: 'A deposit made after the 5th of a month earns no interest for that month. This calculator assumes the whole year’s deposit goes in before 5 April, which gives the highest result. Later deposits or monthly deposits give a little less.'
			},
			{
				q: 'Is the PPF rate fixed for 15 years?',
				a: 'No. The government resets it every quarter and the new rate applies to your whole balance. The calculator holds the rate you enter constant, so treat long-term results as an estimate.'
			},
			{
				q: 'What are the deposit limits and extension rules?',
				a: `You can deposit ${inr(PPF_MIN_DEPOSIT)} to ${inr(PPF_MAX_DEPOSIT)} in a financial year; anything above that earns no interest. After ${PPF_TERM_YEARS} years you can extend in blocks of ${PPF_EXTENSION_YEARS} years, with or without further deposits.`
			},
			{
				q: 'Is PPF interest taxable?',
				a: 'No. PPF interest and the maturity amount are tax-free. In the old tax regime, your deposits also count toward the section 80C limit.'
			}
		],
		sources: [PPF_SOURCE, SMALL_SAVINGS_SOURCE, IN_SEC123_SOURCE],
		disclaimer:
			'Estimates only. The PPF rate is reset quarterly, the model rounds nothing to the nearest rupee, and it assumes one deposit before 5 April each year. Check your passbook for exact figures.'
	}
});
