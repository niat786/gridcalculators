import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import { CAP_80C, IN_SEC123_SOURCE } from '../data/in-tax-fy2026-27';
import meta from './nsc-calculator.meta';
import {
	NSC_MIN,
	NSC_MULTIPLE,
	NSC_RATE,
	NSC_TERM_YEARS,
	NSI_SOURCE,
	SMALL_SAVINGS_PERIOD,
	SMALL_SAVINGS_PERIOD_SHORT,
	SMALL_SAVINGS_RATE_SOURCE,
	SMALL_SAVINGS_RATE_SOURCE_2
} from '../data/in-savings-2026';

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Maturity value', summary });

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount invested', type: 'number', default: 100000, min: NSC_MIN, max: 100_000_000_000, step: NSC_MULTIPLE, prefix: '$', help: `At least ₹1,000, in multiples of ₹${NSC_MULTIPLE}. There is no upper limit.` },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: NSC_RATE, min: 0, max: 20, step: 0.1, suffix: '%', help: `${SMALL_SAVINGS_PERIOD_SHORT} rate for a new certificate. The rate on the day you buy stays fixed for the 5 years.` }
	],
	calculate(v: InputValues): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		if (!Number.isFinite(amount) || amount < NSC_MIN) return fail('Enter at least ₹1,000.');
		if (amount % NSC_MULTIPLE !== 0) return fail(`NSC amounts are in multiples of ₹${NSC_MULTIPLE}.`);
		if (!Number.isFinite(rate) || rate < 0 || rate > 20) return fail('Enter an interest rate from 0% to 20%.');

		const r = rate / 100;
		const rows = [];
		let prev = amount;
		for (let y = 1; y <= NSC_TERM_YEARS; y++) {
			const value = amount * Math.pow(1 + r, y);
			rows.push({ year: String(y), interest: money(value - prev), value: money(value) });
			prev = value;
		}
		const maturity = amount * Math.pow(1 + r, NSC_TERM_YEARS);

		return {
			primaryResult: money(maturity),
			primaryLabel: `Value after ${NSC_TERM_YEARS} years`,
			summary: `${money(amount, true)} at ${pct(rate)} compounded yearly for ${NSC_TERM_YEARS} years. All the interest is paid when the certificate matures.`,
			secondaryMetrics: [
				{ label: 'Amount invested', value: money(amount) },
				{ label: 'Interest earned', value: money(maturity - amount) },
				{ label: 'Interest rate', value: pct(rate) },
				{ label: 'Total growth', value: pct(((maturity - amount) / amount) * 100) }
			],
			table: {
				title: 'Year by year (interest compounds but is paid only at maturity)',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'interest', label: 'Interest for the year', align: 'end' },
					{ key: 'value', label: 'Value at year end', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Use this NSC calculator to see what a National Savings Certificate (NSC VIII issue) from the post office will be worth after ${NSC_TERM_YEARS} years. It uses the ${SMALL_SAVINGS_PERIOD} rate of ${NSC_RATE}%, compounded every year and paid at maturity.`,
		howTo: [
			`Enter the amount you will invest (${inr(NSC_MIN)} or more, in multiples of ${inr(NSC_MULTIPLE)}).`,
			`Check the interest rate for the quarter in which you buy. It stays fixed for the whole ${NSC_TERM_YEARS} years.`,
			'Read the maturity value and the interest, and open the table for each year.'
		],
		about: [
			{
				heading: 'What is a National Savings Certificate?',
				paragraphs: [
					`The National Savings Certificate (NSC) is a savings scheme of the Government of India. You buy it at a post office, and it runs for ${NSC_TERM_YEARS} years. The minimum is ${inr(NSC_MIN)}, in multiples of ${inr(NSC_MULTIPLE)}, and there is no upper limit.`,
					'Because the government backs it, the risk is low. The return is fixed on the day you buy, so you know in advance what you will get. This makes it a simple choice for people who want certainty.'
				]
			},
			{
				heading: 'How NSC interest is calculated',
				paragraphs: [
					`The government sets a new NSC rate every quarter. For ${SMALL_SAVINGS_PERIOD}, it is ${NSC_RATE}% a year. The rate that applies on the day you buy stays the same for all ${NSC_TERM_YEARS} years, even when later rates change.`,
					'Interest is compounded once a year. That means each year’s interest is added to the balance, and the next year’s interest is worked on the bigger amount. You don’t receive the interest each year. Instead, you get it all with your money at maturity.'
				]
			},
			{
				heading: 'How an NSC grows year by year',
				paragraphs: [
					'The table follows a ₹1,00,000 certificate at 7.7%. The interest for each year is a little bigger than the year before, because of compounding.'
				],
				table: {
					caption: '₹1,00,000 at 7.7% a year',
					columns: ['Year', 'Interest for the year', 'Value at year end'],
					rows: [
						['1', '₹7,700.00', '₹1,07,700.00'],
						['2', '₹8,292.90', '₹1,15,992.90'],
						['3', '₹8,931.45', '₹1,24,924.35'],
						['4', '₹9,619.18', '₹1,34,543.53'],
						['5', '₹10,359.85', '₹1,44,903.38']
					]
				}
			},
			{
				heading: 'What different amounts grow to',
				paragraphs: [
					'The growth rate is the same for every amount, so a bigger certificate simply grows in proportion. After 5 years at 7.7%, your money grows by about 44.9%.'
				],
				table: {
					caption: `After ${NSC_TERM_YEARS} years at ${NSC_RATE}%`,
					columns: ['Amount invested', 'Value at maturity', 'Interest earned'],
					rows: [
						['₹10,000', '₹14,490.34', '₹4,490.34'],
						['₹1,00,000', '₹1,44,903.38', '₹44,903.38'],
						['₹5,00,000', '₹7,24,516.90', '₹2,24,516.90'],
						['₹10,00,000', '₹14,49,033.80', '₹4,49,033.80']
					]
				}
			},
			{
				heading: 'NSC and tax',
				paragraphs: [
					`In the old tax regime, the amount you invest in an NSC counts toward the section 80C limit of ${inr(CAP_80C)}. The new regime does not allow that deduction. The interest you earn is taxable, so it is part of your income.`,
					'This calculator shows interest before tax. To see the effect of tax, use the [India income tax calculator](/india-income-tax-calculator).'
				]
			},
			{
				heading: 'Tips for choosing an NSC',
				paragraphs: ['Before you buy, compare it with other options:'],
				list: [
					'**Compare with a bank FD.** A [fixed deposit](/fd-calculator) lets you pick the tenure, and the interest may be added more often.',
					'**Look at the tax-free options.** The [PPF calculator](/ppf-calculator) shows a tax-free scheme with a longer lock-in.',
					'**Match the term to your goal.** An NSC locks your money for 5 years, so don’t use money you may need sooner.',
					'**Think about doubling.** If you want to know when your money doubles, see the [KVP calculator](/kvp-calculator).',
					'**Check the rate for the quarter.** Rates change every quarter, so the day you buy matters.'
				]
			}
		],
		formulas: [
			{
				expression: 'Maturity value = P × (1 + r)⁵',
				variables: [
					{ symbol: 'P', meaning: 'amount invested' },
					{ symbol: 'r', meaning: 'annual interest rate ÷ 100, compounded once a year' }
				]
			}
		],
		example: {
			title: '₹1,00,000 at 7.7% for 5 years',
			steps: [
				'Growth factor: (1 + 0.077)⁵ = 1.449034.',
				'Maturity value: ₹1,00,000 × 1.449034 = ₹1,44,903.38. The certificate pays ₹1,44,903 (published reports round down).',
				'Interest: ₹1,44,903.38 − ₹1,00,000 = ₹44,903.38.'
			],
			result: '₹1,44,903.38 after 5 years'
		},
		faq: [
			{
				q: 'What is the NSC interest rate now?',
				a: `It is ${NSC_RATE}% a year for ${SMALL_SAVINGS_PERIOD}. The government revises it every quarter, but a certificate keeps the rate it was bought at.`
			},
			{
				q: 'How is NSC interest calculated?',
				a: 'Interest is compounded once a year at the rate on the day you buy. The balance after 5 years is the amount invested times (1 + rate) raised to the power of 5.'
			},
			{
				q: 'Is the interest paid every year?',
				a: 'No. NSC interest is compounded yearly and paid together with the money at the end of 5 years.'
			},
			{
				q: 'Does NSC save tax?',
				a: 'In the old tax regime, the amount you invest counts toward the section 80C limit. The interest is taxable. The new regime does not allow the 80C deduction.'
			},
			{
				q: 'Why does the result differ by a few paise?',
				a: 'This tool shows the exact compound amount. A certificate is paid in whole rupees, so the post office figure can differ by under a rupee. Tax rules (such as 80C and tax on the interest) are not included.'
			}
		],
		sources: [NSI_SOURCE, SMALL_SAVINGS_RATE_SOURCE, SMALL_SAVINGS_RATE_SOURCE_2, IN_SEC123_SOURCE],
		disclaimer: 'This is an estimate for general information, not financial advice. Rates are set by the Government of India each quarter; check India Post for the current rate.'
	}
});
