import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './annuity-calculator.meta';

const frequencyOptions = [
	{ label: 'Monthly', value: 'monthly' },
	{ label: 'Yearly', value: 'yearly' }
];

const timingOptions = [
	{ label: 'End', value: 'end' },
	{ label: 'Beginning', value: 'beginning' }
];

/**
 * Growth of a starting sum plus equal additions. Interest compounds once per addition period,
 * so monthly additions use one twelfth of the annual rate for each month.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'start', label: 'Starting principal', type: 'number', default: 10000, min: 0, max: 1_000_000_000, step: 500, prefix: '$', help: 'Money you have at the start.' },
		{ id: 'addition', label: 'Regular addition', type: 'number', default: 200, min: 0, max: 10_000_000, step: 50, prefix: '$', help: 'Amount you add each period.' },
		{ id: 'frequency', label: 'Addition frequency', type: 'select', display: 'segmented', default: 'monthly', options: frequencyOptions },
		{ id: 'rate', label: 'Annual interest rate', type: 'number', default: 6, min: 0, max: 100, step: 0.1, suffix: '%' },
		{ id: 'years', label: 'Number of years', type: 'number', default: 20, min: 1, max: 100, step: 1, decimal: false, suffix: 'years' },
		{
			id: 'timing',
			label: 'Addition timing',
			type: 'select',
			display: 'segmented',
			default: 'end',
			options: timingOptions,
			help: 'End: each addition earns interest from the next period.'
		}
	],
	calculate(v): CalculationResult {
		const start = Number(v.start);
		const addition = Number(v.addition);
		const annualRate = Number(v.rate);
		const years = Number(v.years);
		const monthly = v.frequency === 'monthly';
		const beginning = v.timing === 'beginning';

		if (
			!(start >= 0) ||
			!(addition >= 0) ||
			!(annualRate >= 0 && annualRate <= 100) ||
			!(Number.isInteger(years) && years >= 1 && years <= 100) ||
			(v.frequency !== 'monthly' && v.frequency !== 'yearly') ||
			(v.timing !== 'end' && v.timing !== 'beginning')
		) {
			return { primaryResult: DASH, primaryLabel: 'Future value', summary: 'Check the starting amount, addition, rate and years.' };
		}

		const perYear = monthly ? 12 : 1;
		const r = annualRate / 100 / perYear;
		const periods = years * perYear;

		let balance = start;
		let interestTotal = 0;
		let yearInterest = 0;
		const rows: Record<string, string>[] = [];
		for (let k = 1; k <= periods; k++) {
			if (beginning) balance += addition;
			const interest = balance * r;
			balance += interest;
			if (!beginning) balance += addition;
			interestTotal += interest;
			yearInterest += interest;
			if (k % perYear === 0) {
				rows.push({
					year: String(k / perYear),
					additions: money(addition * perYear, true),
					interest: money(yearInterest, true),
					balance: money(balance, true)
				});
				yearInterest = 0;
			}
		}

		const totalAdditions = addition * periods;
		const contributed = start + totalAdditions;
		const interest = balance - contributed;

		return {
			primaryResult: money(balance),
			primaryLabel: 'Future value',
			summary: `${money(addition)} ${monthly ? 'a month' : 'a year'} for ${plural(years, 'year')} at ${pct(annualRate, 2)} a year, compounded ${monthly ? 'monthly' : 'yearly'}.`,
			secondaryMetrics: [
				{ label: 'Total additions', value: money(totalAdditions) },
				{ label: 'Total contributed', value: money(contributed) },
				{ label: 'Interest earned', value: money(interest) }
			],
			table: {
				title: 'Growth by year',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'additions', label: 'Additions', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: 'Use this annuity calculator to estimate how a starting sum grows when you keep adding money at regular intervals. Enter your starting amount, the amount you add and the rate, and see the future value at the end.',
		howTo: [
			'Enter the amount you start with and the amount you add each period.',
			'Choose whether you add monthly or yearly, and enter the annual interest rate.',
			'Enter the number of years and whether each addition is made at the end or the beginning of a period.',
			'Read the future value, then open the yearly table to see the balance each year.'
		],
		about: [
			{
				heading: 'What is an annuity in this calculator?',
				paragraphs: [
					'In finance, an annuity is a series of equal payments made at regular intervals. Here, the payments are your deposits into a savings or investment account. The calculator finds what the account is worth after a set number of years.',
					'This is different from an insurance annuity, which is a contract that pays you income. If that is what you want, see the [annuity payout calculator](/annuity-payout-calculator).'
				]
			},
			{
				heading: 'How the future value is worked out',
				paragraphs: [
					'The calculator grows your starting sum with compound interest. Then it adds the growth of each regular deposit. Interest is added once per deposit period, so monthly deposits use one twelfth of the yearly rate each month.',
					'You also choose when each deposit is made. Deposits at the end of a period start earning interest from the next period. Deposits at the beginning earn for the whole period, so they end up slightly higher.',
					'In short, the difference is small over short periods. However, it grows with longer terms and larger deposits, so it is worth choosing the right option.'
				]
			},
			{
				heading: 'How the rate changes the result',
				paragraphs: ['Time and rate do most of the work. The table uses $10,000 to start and $200 added each month for 20 years. That puts in $58,000 in total.'],
				table: {
					caption: '$10,000 start, $200 a month, 20 years, deposits at month end',
					columns: ['Yearly rate', 'Future value', 'Interest earned'],
					rows: [
						['4%', '$95,580.75', '$37,580.75'],
						['6%', '$125,510.22', '$67,510.22'],
						['8%', '$167,072.11', '$109,072.11']
					]
				}
			},
			{
				heading: 'End or beginning of the period?',
				paragraphs: [
					'The timing choice makes a small difference. With the 6% case above, deposits at the beginning of each month give $125,972.26, instead of $125,510.22 at the end. That is a gap of $462.04.',
					'Pick the option that matches how you really save. If your deposit leaves your pay on the first of the month, beginning may fit. If it is made after the month, choose end.'
				]
			},
			{
				heading: 'Using the result well',
				paragraphs: ['Real accounts rarely earn a steady rate, so treat the answer as a guide. Fees, tax and inflation are not included. Also, a result in future money buys less than the same number does now.'],
				list: [
					'**Try a range of rates.** Use a low, middle and high case to see the spread.',
					'**Start early.** A bigger share of the result comes from interest in later years.',
					'**Compare with a lump sum.** The [compound interest calculator](/compound-interest-calculator) and the [future value calculator](/future-value-calculator) handle other setups.',
					'**Plan the goal.** The [savings calculator](/savings-calculator) and the [investment calculator](/investment-calculator) can help you work backwards from a target.',
					'**Think about income later.** The [retirement calculator](/retirement-calculator) turns a balance into monthly income.'
				]
			}
		],
		formulas: [
			{
				title: 'Future value with regular additions',
				expression: 'FV = P × (1 + r)ⁿ + A × ((1 + r)ⁿ − 1) ÷ r × (1 + r × t)',
				variables: [
					{ symbol: 'FV', meaning: 'future value at the end of the period' },
					{ symbol: 'P', meaning: 'starting principal' },
					{ symbol: 'A', meaning: 'amount added each period' },
					{ symbol: 'r', meaning: 'interest rate per period: annual rate ÷ additions per year' },
					{ symbol: 'n', meaning: 'total number of periods: years × additions per year' },
					{ symbol: 't', meaning: '1 if additions are made at the beginning of each period, otherwise 0' }
				]
			}
		],
		example: {
			title: '$10,000 to start, then $200 a month at 6% a year for 20 years',
			steps: [
				'Monthly rate: r = 6 ÷ 12 ÷ 100 = 0.005',
				'Number of months: n = 20 × 12 = 240',
				'Growth factor: 1.005²⁴⁰ ≈ 3.310204',
				'Starting sum: $10,000 × 3.310204 ≈ $33,102.04',
				'Additions factor: (3.310204 − 1) ÷ 0.005 ≈ 462.0409',
				'Additions: $200 × 462.0409 ≈ $92,408.18',
				'Future value: $33,102.04 + $92,408.18 ≈ $125,510.22'
			],
			result: 'The balance grows to about $125,510.22 after 20 years, from $58,000.00 put in.'
		},
		faq: [
			{
				q: 'What does an annuity calculator do?',
				a: 'It finds the future value of a starting sum plus equal regular deposits at a fixed interest rate. It also shows the total you put in and the interest earned.'
			},
			{
				q: 'Is this the same as an insurance annuity?',
				a: 'No. This calculator measures how savings grow with regular additions, which is the standard time-value-of-money formula for an ordinary annuity. It does not price an insurance annuity contract.'
			},
			{
				q: 'Should I enter a monthly or yearly rate?',
				a: 'Enter the annual rate in both cases. The calculator divides it by the number of additions per year, so a 6% annual rate becomes 0.5% a month with monthly additions.'
			},
			{
				q: 'What is the difference between end and beginning timing?',
				a: 'Additions made at the beginning of a period earn interest for that whole period. They end up slightly higher than the same additions made at the end.'
			},
			{
				q: 'Why is interest earned more than the additions alone?',
				a: 'Interest earns its own interest over time. The interest earned line is the future value minus the starting sum and every addition.'
			}
		],
		sources: [
			{ title: 'U.S. Securities and Exchange Commission — Investor.gov', url: 'https://www.investor.gov' }
		],
		disclaimer: 'Estimates only. Real returns vary from year to year, and fees, taxes and inflation are not included.'
	}
});
