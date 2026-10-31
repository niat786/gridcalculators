import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct } from '../format';
import meta from './mutual-fund-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'initial', label: 'Initial investment', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'monthly', label: 'Monthly contribution', type: 'number', default: 300, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo' },
		{ id: 'years', label: 'Years invested', type: 'number', default: 20, min: 1, max: 60, step: 1, suffix: 'years', decimal: false },
		{ id: 'gross', label: 'Expected gross return', type: 'number', default: 7, min: -20, max: 30, step: 0.01, suffix: '%', help: 'Yearly return before fund costs.' },
		{ id: 'expense', label: 'Expense ratio', type: 'number', default: 0.75, min: 0, max: 10, step: 0.01, suffix: '%', help: 'Yearly running cost, taken from the fund’s assets.' },
		{ id: 'front', label: 'Front-end load', type: 'number', default: 5.75, min: 0, max: 10, step: 0.01, suffix: '%', help: 'Sales charge taken from each purchase.' },
		{ id: 'back', label: 'Back-end load', type: 'number', default: 0, min: 0, max: 10, step: 0.01, suffix: '%', help: 'Sales charge on the final value when you sell. Often zero.' }
	],
	calculate(v): CalculationResult {
		const initial = Number(v.initial);
		const monthly = Number(v.monthly);
		const years = Number(v.years);
		const gross = Number(v.gross);
		const expense = Number(v.expense);
		const front = Number(v.front);
		const back = Number(v.back);
		const primaryLabel = 'Final value after costs';

		if (
			!(initial >= 0) || !Number.isFinite(initial) ||
			!(monthly >= 0) || !Number.isFinite(monthly) ||
			!Number.isInteger(years) || years < 1 || years > 60 ||
			!(gross > -100 && gross <= 100) ||
			!(expense >= 0 && expense <= 10) ||
			!(front >= 0 && front <= 100) ||
			!(back >= 0 && back <= 100)
		) {
			return { primaryResult: DASH, primaryLabel, summary: 'Check each field. Years must be a whole number from 1 to 60.' };
		}

		const months = years * 12;
		const g = gross / 1200;
		const e = expense / 1200;
		const f = front / 100;

		// Costs: front-end load on every purchase, expense ratio on the balance each month.
		let balance = initial * (1 - f);
		let noFee = initial;
		let frontCharges = initial * f;
		let expenseCharges = 0;
		for (let m = 0; m < months; m++) {
			expenseCharges += balance * e;
			balance = balance * (1 + g - e) + monthly * (1 - f);
			noFee = noFee * (1 + g) + monthly;
			frontCharges += monthly * f;
		}

		const backCharge = (balance * back) / 100;
		const finalValue = balance - backCharge;
		const totalPaid = initial + monthly * months;
		const totalFees = frontCharges + expenseCharges + backCharge;
		const lost = Math.max(0, noFee - finalValue);
		const netReturn = gross - expense;

		return {
			primaryResult: money(finalValue),
			primaryLabel,
			summary: `After fees your investment is worth ${money(finalValue)}, ${money(lost)} less than a fund with no costs.`,
			secondaryMetrics: [
				{ label: 'Total you pay in', value: money(totalPaid) },
				{ label: 'Final value with no fees', value: money(noFee) },
				{ label: 'Total fees paid', value: money(totalFees) },
				{ label: 'Value lost to costs', value: money(lost) },
				{ label: 'Net return after expense ratio', value: pct(netReturn, 2) }
			]
		};
	},
	content: {
		intro:
			'Use this mutual fund calculator to see how fees change the growth of a fund. Enter your investment, the expected return, the expense ratio and any sales charges, and compare the result with a fund that has no costs.',
		howTo: [
			'Enter your initial investment, your monthly contribution and the number of years.',
			'Enter the expected gross return, which is the yearly return before fund costs.',
			'Enter the expense ratio, plus any front-end or back-end sales charge (load). Use 0 if the fund has none.',
			'Read the final value after costs, then compare it with the value with no fees.'
		],
		about: [
			{
				heading: 'What is a mutual fund?',
				paragraphs: [
					'A mutual fund pools money from many investors and invests it in a mix of assets, such as shares or bonds. A professional manager or a set of rules decides what the fund holds. You own a share of the whole pool.',
					'Funds charge for this service. The costs are small in percentage terms, but they come out of your money every year, so they add up. Funds vary a lot in what they charge, so it pays to compare.'
				]
			},
			{
				heading: 'The three costs this calculator includes',
				paragraphs: ['Fund costs come in a few forms. This tool handles the main ones:'],
				list: [
					'**Expense ratio.** A yearly running cost, as a share of the fund’s assets. It is taken from the fund, so you see it as a lower return rather than a bill.',
					'**Front-end load.** A sales charge taken from every purchase. A 5.75% load means $100 buys $94.25 of the fund.',
					'**Back-end load.** A sales charge taken from the final value when you sell. Many funds charge none.'
				]
			},
			{
				heading: 'How the calculator works',
				paragraphs: [
					'Each month, the calculator removes the front-end load from your contribution and invests the rest. It then grows the balance at the gross return and takes off one-twelfth of the expense ratio. At the end, it takes off any back-end load.',
					'It also grows the same contributions with no costs at all. The difference between the two is the value lost to fees. To grow money without fund costs, you can use the [investment calculator](/investment-calculator).'
				]
			},
			{
				heading: 'How much do fees matter?',
				paragraphs: [
					'A small yearly cost can take a large share of the growth. The table below uses $10,000 to start, $300 a month and 20 years at a 7% gross return. It has no sales charges, so only the expense ratio changes.'
				],
				table: {
					caption: '$10,000 start, $300 a month, 20 years, 7% gross return',
					columns: ['Expense ratio', 'Final value', 'Lost to costs'],
					rows: [
						['0%', '$196,665', '$0'],
						['0.1%', '$193,986', '$2,679'],
						['0.75%', '$177,583', '$19,082'],
						['1.5%', '$160,654', '$36,011']
					]
				}
			},
			{
				heading: 'Sales charges',
				paragraphs: [
					'A front-end load hits the money you put in, so it also removes the growth that money would have earned. With the default 5.75% load and a 0.75% expense ratio, the same investment ends at $167,372. That is $29,293 less than the no-fee value.',
					'Not every fund has a load. Rules and fee names vary by country, so check the fund’s documents for its charges.'
				]
			},
			{
				heading: 'Tips for comparing funds',
				paragraphs: ['Costs are one of the few things you can see before you invest. A few ideas:'],
				list: [
					'**Compare the total cost.** Add the expense ratio to any sales charges, and look at the long-term effect.',
					'**Read the fund documents.** They list every fee. Do not rely on a summary.',
					'**Remember fees are only part of the picture.** Returns are not guaranteed, and past returns do not predict future ones.',
					'**Check the return you actually earned.** Use the [average return calculator](/average-return-calculator) on your past results.',
					'**See the effect of regular saving.** The [compound interest calculator](/compound-interest-calculator) and the [SIP calculator](/sip-calculator) show growth without fees.'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly balance with costs',
				expression: 'Bₘ = Bₘ₋₁ × (1 + g − e) + C × (1 − f)',
				variables: [
					{ symbol: 'Bₘ', meaning: 'balance after month m' },
					{ symbol: 'g', meaning: 'monthly gross return (annual return ÷ 12 ÷ 100)' },
					{ symbol: 'e', meaning: 'monthly expense ratio (annual ratio ÷ 12 ÷ 100)' },
					{ symbol: 'C', meaning: 'monthly contribution' },
					{ symbol: 'f', meaning: 'front-end load as a decimal' }
				]
			},
			{
				title: 'Final value',
				expression: 'Final value = B × (1 − back-end load)',
				variables: [
					{ symbol: 'B', meaning: 'balance after the last month. The starting amount is also reduced by the front-end load.' }
				]
			}
		],
		example: {
			title: 'Starting with 10,000 and adding 300 a month for 20 years',
			steps: [
				'Gross return 7% and expense ratio 0.75%, so the net return is about 6.25% a year',
				'Front-end load 5.75%: the 10,000 start invests 9,425, and each 300 payment invests 282.75',
				'Final value after costs: $167,372.00',
				'Final value with no fees: $196,665.39, so costs take $29,293.39',
				'Total fees paid: sales charges of $4,715.00 plus expense ratio charges of $10,810.44 = $15,525.44'
			],
			result:
				'The fund ends at $167,372.00 after costs, against $196,665.39 with no fees. Fees paid directly total $15,525.44, and $29,293.39 of growth is lost.'
		},
		faq: [
			{
				q: 'How do mutual fund fees affect my returns?',
				a: 'Fees reduce your balance every year, and the lost money cannot grow later. A 0.75% yearly cost can take about 10% of the final value over 20 years in the example above.'
			},
			{
				q: 'What is an expense ratio?',
				a: 'It is the yearly cost of running a fund, shown as a percentage of the fund’s assets. A 0.75% ratio means $75 a year for every $10,000 invested.'
			},
			{
				q: 'What is a front-end load?',
				a: 'It is a sales charge taken when you buy. If the load is 5.75%, only $94.25 of every $100 you pay is invested.'
			},
			{
				q: 'What is a back-end load?',
				a: 'It is a sales charge taken when you sell, often based on the value of your holding. Many funds have none. Some reduce it the longer you hold.'
			},
			{
				q: 'What return should I enter?',
				a: 'Nobody knows future returns. Use a cautious figure and try a few. Enter the return before fund costs, because the calculator takes the expense ratio off for you.'
			},
			{
				q: 'Does this include tax or other charges?',
				a: 'No. Tax, account fees, trading costs and inflation are not included. Your real result can be lower.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Mutual fund expense ratio', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/mutual-fund-expense-ratio' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. You can lose money. This tool is not financial advice.'
	}
});
