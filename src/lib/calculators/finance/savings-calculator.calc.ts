import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './savings-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'initial', label: 'Starting balance', type: 'number', default: 1000, min: 0, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'monthly',
			label: 'Monthly deposit',
			type: 'number',
			default: 200,
			min: 0,
			max: 1_000_000,
			step: 10,
			prefix: '$',
			suffix: '/mo',
			help: 'Added at the end of each month.'
		},
		{ id: 'rate', label: 'Annual interest rate', type: 'number', default: 4.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Compounded monthly.' },
		{ id: 'years', label: 'Years', type: 'number', default: 5, min: 1, max: 100, step: 1, suffix: 'years', decimal: false }
	],
	calculate(v): CalculationResult {
		const initial = Number(v.initial);
		const monthly = Number(v.monthly);
		const rate = Number(v.rate);
		const years = Number(v.years);
		if (
			!(initial >= 0) ||
			!(monthly >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(Number.isInteger(years) && years >= 1 && years <= 100)
		) {
			return { primaryResult: DASH, primaryLabel: 'Ending balance', summary: 'Check the balance, deposit, rate and years.' };
		}

		// Interest compounds monthly; deposits are added at the end of each month.
		const monthRate = rate / 100 / 12;
		let balance = initial;
		let deposited = initial;
		const rows: Record<string, string>[] = [];
		for (let y = 1; y <= years; y++) {
			for (let m = 0; m < 12; m++) balance = balance * (1 + monthRate) + monthly;
			deposited += monthly * 12;
			const interest = balance - deposited;
			rows.push({
				year: String(y),
				deposited: money(deposited, true),
				interest: money(interest, true),
				balance: money(balance, true)
			});
		}

		const interest = balance - deposited;
		const effectiveAnnual = Math.pow(1 + monthRate, 12) - 1;

		return {
			primaryResult: money(balance),
			primaryLabel: 'Ending balance',
			summary: `You deposit ${money(deposited)} and earn ${money(interest)} in interest over ${plural(years, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Total deposited', value: money(deposited) },
				{ label: 'Interest earned', value: money(interest) },
				{ label: 'Effective annual yield', value: pct(effectiveAnnual * 100, 3) }
			],
			table: {
				title: 'Yearly breakdown',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'deposited', label: 'Deposited', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this savings calculator to see how a starting balance and regular monthly deposits could grow in a savings account. It shows your ending balance, the interest you earn and a year-by-year breakdown.',
		howTo: [
			'Enter the balance you have now and the amount you plan to deposit each month.',
			'Enter the annual interest rate your account pays.',
			'Enter how many years you plan to save.',
			'Read the ending balance, then open the yearly breakdown to see deposits and interest side by side.'
		],
		about: [
			{
				heading: 'How a savings account grows',
				paragraphs: [
					'A savings account pays you interest for keeping your money with the bank. Interest is usually added at regular intervals. After that, the new, larger balance earns interest too.',
					'This is compounding. Each month, the calculator adds one-twelfth of the yearly rate to your balance. Then it adds your deposit at the end of the month.',
					'Because of monthly compounding, a rate of 4.5% gives an effective yield of about 4.594% over a year. This is why two accounts with the same quoted rate can pay slightly different amounts.'
				]
			},
			{
				heading: 'How the ending balance is calculated',
				paragraphs: [
					'The starting balance grows by compound interest. Your monthly deposits form a series, and each one earns interest for fewer months than the one before it.',
					'The formulas below add these two parts together. The same maths sits behind the [compound interest calculator](/compound-interest-calculator), which also lets you change the compounding schedule.'
				]
			},
			{
				heading: 'How the monthly deposit changes the result',
				paragraphs: [
					'Over a short period, your deposits do most of the work and interest adds a small bonus. The table below uses no starting balance, a 4% rate and 3 years.'
				],
				table: {
					caption: 'Monthly deposits at 4% for 3 years, no starting balance',
					columns: ['Monthly deposit', 'Total deposited', 'Interest earned', 'Ending balance'],
					rows: [
						['$250', '$9,000', '$545', '$9,545'],
						['$300', '$10,800', '$654', '$11,454'],
						['$500', '$18,000', '$1,091', '$19,091']
					]
				}
			},
			{
				heading: 'Why the interest rate matters',
				paragraphs: [
					'Rates differ a lot between banks and countries, and they change over time. The table below uses the default $1,000 start and $200 a month, over 10 years.'
				],
				table: {
					caption: '$1,000 start, $200 a month, 10 years',
					columns: ['Interest rate', 'Total deposited', 'Interest earned', 'Ending balance'],
					rows: [
						['1%', '$25,000', '$1,335', '$26,335'],
						['4.5%', '$25,000', '$6,807', '$31,807'],
						['5%', '$25,000', '$7,703', '$32,703']
					]
				}
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'The tool assumes one fixed rate for the whole period. In real life, banks change their rates, and some pay a bonus rate for a short time only.',
					'It also ignores tax, account fees and any minimum balance rules. Withdrawals are not included either. If you take money out, your balance and your interest will be lower.'
				]
			},
			{
				heading: 'Tips for growing your savings',
				paragraphs: ['Small habits make a big difference over time. Even a modest deposit adds up if you keep it going for years. A few ideas:'],
				list: [
					'**Pay yourself first.** Set up an automatic transfer on payday, so you save before you spend.',
					'**Compare rates.** Banks pay different rates, and a fixed deposit can pay more if you can leave the money alone. See the [CD calculator](/cd-calculator).',
					'**Make a budget.** Knowing what is left each month helps you pick a deposit you can keep up. Try the [budget calculator](/budget-calculator).',
					'**Watch inflation.** If prices rise faster than your rate, your money buys less. Check it with the [inflation calculator](/inflation-calculator).',
					'**Plan a target.** To see what a lump sum is worth later, use the [future value calculator](/future-value-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Ending balance',
				expression: 'FV = P × (1 + i)ᴺ + D × ((1 + i)ᴺ − 1) ÷ i',
				variables: [
					{ symbol: 'FV', meaning: 'ending balance' },
					{ symbol: 'P', meaning: 'starting balance' },
					{ symbol: 'D', meaning: 'monthly deposit, added at the end of each month' },
					{ symbol: 'i', meaning: 'monthly rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'N', meaning: 'number of months (years × 12)' }
				]
			},
			{
				title: 'Effective annual yield',
				expression: 'Yield = (1 + i)¹² − 1',
				variables: [{ symbol: 'i', meaning: 'monthly rate as a decimal' }]
			}
		],
		example: {
			title: '$1,000 to start, $200 a month, 4.5% for 5 years',
			steps: [
				'Monthly rate: 0.045 ÷ 12 = 0.00375',
				'Months: 5 × 12 = 60',
				'Starting balance grows to: 1,000 × 1.00375⁶⁰ ≈ $1,251.80',
				'Deposits grow to: 200 × (1.00375⁶⁰ − 1) ÷ 0.00375 ≈ $13,429.11',
				'Ending balance: $1,251.80 + $13,429.11 ≈ $14,680.91',
				'Total deposited: $1,000 + $200 × 60 = $13,000, so interest is $1,680.91'
			],
			result: 'Ending balance ≈ $14,680.91, with $1,680.91 of interest earned.'
		},
		faq: [
			{
				q: 'How do I calculate savings growth?',
				a: 'Grow your starting balance at the monthly rate, then add the growth of each monthly deposit. The savings calculator does both and shows the total you deposited next to the interest.'
			},
			{
				q: 'How much interest will I earn on my savings?',
				a: 'It depends on the balance, the rate and the time. For example, $10,000 at 4.5% would earn about $450 in one year without extra deposits, a little more with monthly compounding.'
			},
			{
				q: 'When are deposits added in this calculator?',
				a: 'At the end of each month. A deposit starts earning interest from the following month.'
			},
			{
				q: 'What is the difference between the interest rate and the yield?',
				a: 'The rate is the yearly figure the bank quotes. The yield (often called APY or AER) includes the effect of compounding. At 4.5% compounded monthly, the yield is about 4.594%.'
			},
			{
				q: 'Does this include tax on interest?',
				a: 'No. Some countries tax savings interest and some do not. Fees and changes in the bank’s rate are not included either, so your real balance may differ.'
			},
			{
				q: 'Is my savings balance guaranteed?',
				a: 'Interest is not guaranteed, because banks can change their rates. Many countries also insure deposits up to a limit. Check the rules where you live.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
			{ title: 'Consumer Financial Protection Bureau — What is a savings account?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-savings-account-en-917/' }
		],
		disclaimer:
			'Estimates only. Interest rates can change, and this tool does not include tax or fees. It is not financial advice.'
	}
});
