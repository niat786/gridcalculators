import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './kvp-calculator.meta';
import { addMonths, parseIso } from './capital-gains-tax-calculator-india.calc';
import { dueLabel } from './advance-tax-calculator.calc';
import {
	KVP_MATURITY_MONTHS,
	KVP_MIN,
	KVP_MULTIPLE,
	KVP_RATE,
	NSI_SOURCE,
	SMALL_SAVINGS_PERIOD,
	SMALL_SAVINGS_PERIOD_SHORT,
	SMALL_SAVINGS_RATE_SOURCE,
	SMALL_SAVINGS_RATE_SOURCE_2
} from '../data/in-savings-2026';

/** Months for money to double when it grows at `ratePct` a year, compounded yearly. */
export function doublingMonths(ratePct: number): number {
	return (12 * Math.log(2)) / Math.log(1 + ratePct / 100);
}

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Maturity value', summary });

function yearsMonths(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return `${y} year${y === 1 ? '' : 's'}${m ? ` ${m} month${m === 1 ? '' : 's'}` : ''}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount invested', type: 'number', default: 100000, min: KVP_MIN, max: 100_000_000_000, step: KVP_MULTIPLE, prefix: '$', help: `At least ₹1,000, in multiples of ₹${KVP_MULTIPLE}. There is no upper limit.` },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: KVP_RATE, min: 0.1, max: 20, step: 0.1, suffix: '%', help: `${SMALL_SAVINGS_PERIOD_SHORT} rate for a new certificate.` },
		{
			id: 'months',
			label: 'Months to double',
			type: 'number',
			default: KVP_MATURITY_MONTHS,
			min: 12,
			max: 240,
			step: 1,
			decimal: false,
			suffix: 'months',
			help: `The government announces this with the rate: ${KVP_MATURITY_MONTHS} months at ${KVP_RATE}%. Change it if the rate changes.`
		},
		{ id: 'start', label: 'Date of purchase', type: 'date', default: 'today' }
	],
	calculate(v: InputValues): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const months = Number(v.months);
		const start = parseIso(v.start);
		if (!Number.isFinite(amount) || amount < KVP_MIN) return fail('Enter at least ₹1,000.');
		if (amount % KVP_MULTIPLE !== 0) return fail(`KVP amounts are in multiples of ₹${KVP_MULTIPLE}.`);
		if (!Number.isFinite(rate) || rate <= 0 || rate > 20) return fail('Enter an interest rate above 0% and up to 20%.');
		if (!Number.isInteger(months) || months < 12 || months > 240) return fail('Enter the months to double as a whole number from 12 to 240.');
		if (!start) return fail('Enter a valid purchase date.');

		const maturity = amount * 2;
		const matDate = new Date(addMonths(start, months)).toISOString().slice(0, 10);
		const check = doublingMonths(rate);
		const yearly = (Math.pow(2, 12 / months) - 1) * 100;

		return {
			primaryResult: money(maturity),
			primaryLabel: 'Maturity value (double your money)',
			summary: `${money(amount, true)} doubles in ${months} months (${yearsMonths(months)}), on ${dueLabel(matDate)}.`,
			secondaryMetrics: [
				{ label: 'Amount invested', value: money(amount) },
				{ label: 'Interest earned', value: money(amount) },
				{ label: 'Maturity date', value: dueLabel(matDate) },
				{ label: 'Time to double', value: `${months} months (${yearsMonths(months)})` },
				{ label: `Months to double at ${pct(rate)}, compounded yearly`, value: num(check, 1) },
				{ label: 'Yearly growth implied by the doubling period', value: pct(yearly, 3) }
			]
		};
	},
	content: {
		intro: `Use this KVP calculator to find out when a Kisan Vikas Patra (KVP) from the post office doubles your money, and what the maturity date is. The default is the ${SMALL_SAVINGS_PERIOD} rate of ${KVP_RATE}% and its announced doubling period of ${KVP_MATURITY_MONTHS} months.`,
		howTo: [
			`Enter the amount you will invest (${inr(KVP_MIN)} or more, in multiples of ${inr(KVP_MULTIPLE)}) and your purchase date.`,
			'Check the interest rate and the months to double. They are announced together each quarter.',
			'Read the maturity value and date. The last rows check that the months match the rate.'
		],
		about: [
			{
				heading: 'What is a Kisan Vikas Patra?',
				paragraphs: [
					`The Kisan Vikas Patra (KVP) is a savings certificate of the Government of India, sold at post offices. Its main promise is simple: your money doubles by the maturity date. Also, the minimum is ${inr(KVP_MIN)}, in multiples of ${inr(KVP_MULTIPLE)}, and there is no upper limit.`,
					'Since the government backs it, the risk is low. Besides, the rate and the doubling period are fixed on the day you buy, so you know the maturity value in advance.'
				]
			},
			{
				heading: 'How the doubling period is worked out',
				paragraphs: [
					`The government announces a yearly rate and a number of months for the money to double. For ${SMALL_SAVINGS_PERIOD}, that is ${KVP_RATE}% and ${KVP_MATURITY_MONTHS} months, which is 9 years and 7 months.`,
					'The two numbers are linked. Because interest compounds once a year, the months to double equal 12 × ln 2 ÷ ln(1 + rate). At 7.5%, that comes to 115.0 months, which matches the announcement.',
					'The calculator shows this check in the result. So if you change the rate, you should change the months as well.'
				]
			},
			{
				heading: 'How the rate changes the doubling time',
				paragraphs: [
					'A higher rate doubles your money sooner. For this reason, the table below uses the same formula as the calculator. The government rounds the answer to a whole number of months.'
				],
				table: {
					caption: 'Months for money to double, compounded yearly',
					columns: ['Yearly rate', 'Months to double', 'About'],
					rows: [
						['6.5%', '132.1', '11 years'],
						['7%', '122.9', '10 years 3 months'],
						['7.5%', '115.0', '9 years 7 months'],
						['8%', '108.1', '9 years'],
						['9%', '96.5', '8 years']
					]
				}
			},
			{
				heading: 'What your KVP will pay',
				paragraphs: [
					'Because the certificate doubles, the maturity value is always twice the amount you invest. In other words, the interest equals the amount you invested. For example, ₹1,00,000 bought on 28 October 2026 matures at ₹2,00,000 on 28 May 2036.',
					'The doubling is not a yearly return of 100%. Instead, it is spread over 115 months, which works out to about 7.5% a year, compounded. The calculator shows the implied yearly growth as 7.501%, a tiny difference caused by rounding to whole months.'
				]
			},
			{
				heading: 'KVP and tax',
				paragraphs: [
					'The interest on a KVP is taxable. This calculator shows the value before tax. Then, to see how it fits in your tax, use the [India income tax calculator](/india-income-tax-calculator).',
					'Early encashment is allowed only after a lock-in and at values set in the scheme rules. So if you may need the money sooner, check those rules first.'
				]
			},
			{
				heading: 'Tips for choosing a KVP',
				paragraphs: ['Compare before you buy:'],
				list: [
					'**Check the doubling period.** A shorter period at the same amount means a higher return.',
					'**Compare with the NSC.** The [NSC calculator](/nsc-calculator) pays at the end of 5 years, which is shorter.',
					'**Compare with a bank FD.** See what a [fixed deposit](/fd-calculator) would pay over the same time.',
					'**Think about your goal date.** A KVP is a long wait of almost 10 years, so use money you won’t need.',
					'**Look at tax-free schemes.** The [PPF calculator](/ppf-calculator) shows a scheme where the interest is tax-free.'
				]
			}
		],
		formulas: [
			{
				expression: 'Months to double = 12 × ln 2 ÷ ln(1 + r)',
				variables: [
					{ symbol: 'r', meaning: 'annual rate ÷ 100, compounded once a year' },
					{ symbol: 'ln', meaning: 'natural logarithm. The government rounds the answer to a whole number of months' }
				]
			},
			{ expression: 'Maturity value = 2 × amount invested', variables: [] }
		],
		example: {
			title: '₹1,00,000 invested on 28 October 2026',
			steps: [
				'At 7.5% a year, money doubles in 12 × ln 2 ÷ ln 1.075 = 115.0 months, which is the announced 115 months (9 years 7 months).',
				'Maturity value: 2 × ₹1,00,000 = ₹2,00,000. Interest: ₹1,00,000.',
				'Maturity date: 115 months after 28 October 2026 is 28 May 2036.'
			],
			result: '₹2,00,000 on 28 May 2036'
		},
		faq: [
			{
				q: 'How long does a KVP take to double now?',
				a: `At ${KVP_RATE}% (${SMALL_SAVINGS_PERIOD}) it doubles in ${KVP_MATURITY_MONTHS} months, which is ${yearsMonths(KVP_MATURITY_MONTHS)}. The rate and months are fixed when you buy.`
			},
			{
				q: 'How is the KVP maturity value calculated?',
				a: 'It is simply twice the amount you invested. The rate decides how many months this takes, using 12 × ln 2 ÷ ln(1 + rate).'
			},
			{
				q: 'Is there a maximum investment?',
				a: `No. The minimum is ${inr(KVP_MIN)} and amounts are in multiples of ${inr(KVP_MULTIPLE)}.`
			},
			{
				q: 'Can I take the money out early?',
				a: 'Early encashment is allowed only after a lock-in and at values set in the scheme rules. This calculator shows maturity only, and does not include tax.'
			},
			{
				q: 'Is KVP interest taxable?',
				a: 'Yes, the interest is part of your income. This calculator shows the value before tax.'
			}
		],
		sources: [NSI_SOURCE, SMALL_SAVINGS_RATE_SOURCE, SMALL_SAVINGS_RATE_SOURCE_2],
		disclaimer: 'This is an estimate for general information, not financial advice. Rates and doubling periods are set by the Government of India each quarter; check India Post for the current terms.'
	}
});
