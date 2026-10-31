import { defineCalculator, type CalculationResult, type RowValue } from '../types';
import { DASH, money, num } from '../format';
import meta from './debt-to-income-ratio-calculator.meta';

/** Plain reading of the back-end ratio. Lenders set their own limits, so these are guides. */
function band(ratio: number): { label: string; reading: string } {
	if (ratio <= 36) {
		return { label: 'Good', reading: 'At or under 36%. Most lenders see this as a comfortable level of debt.' };
	}
	if (ratio <= 43) {
		return {
			label: 'Manageable',
			reading: 'Between 36% and 43%. Many lenders still approve loans at this level, but they may look more closely at your application.'
		};
	}
	return {
		label: 'High',
		reading: 'Above 43%. Lenders often see this as a high level of debt, and loan options may be limited.'
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'income',
			label: 'Gross monthly income',
			type: 'number',
			default: 6000,
			min: 0,
			max: 1_000_000_000,
			step: 100,
			prefix: '$',
			help: 'Income before tax and deductions.'
		},
		{
			id: 'housing',
			label: 'Monthly housing payment',
			type: 'number',
			default: 1800,
			min: 0,
			max: 1_000_000_000,
			step: 50,
			prefix: '$',
			suffix: '/mo',
			help: 'Rent, or your mortgage with taxes and insurance if you pay them.'
		},
		{
			id: 'debts',
			label: 'Other monthly debts',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Debt', type: 'text', default: '', placeholder: 'Debt name' },
				{ id: 'amount', label: 'Monthly payment', type: 'number', default: 0, min: 0, max: 1_000_000_000, prefix: '$' }
			],
			default: [
				{ name: 'Car loan', amount: 350 },
				{ name: 'Student loan', amount: 200 },
				{ name: 'Credit card minimum', amount: 120 }
			],
			maxRows: 20,
			addLabel: 'Add debt'
		}
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const housing = Number(v.housing);
		const rows = (v.debts as RowValue[]) ?? [];

		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Back-end ratio',
			summary: 'Enter your gross monthly income, housing payment and each debt payment.'
		});

		if (!(income > 0) || !(housing >= 0)) return invalid();

		let otherDebts = 0;
		for (const row of rows) {
			const amount = Number(row.amount);
			if (!Number.isFinite(amount) || amount < 0) return invalid();
			otherDebts += amount;
		}

		const totalDebt = housing + otherDebts;
		const back = (totalDebt / income) * 100;
		const front = (housing / income) * 100;
		// Round to the one decimal shown, so the band always matches the number on screen.
		const reading = band(Math.round(back * 10) / 10);

		return {
			primaryResult: `${num(back, 1, 1)}%`,
			primaryLabel: 'Back-end ratio',
			summary: `${reading.label}. ${reading.reading}`,
			secondaryMetrics: [
				{ label: 'Front-end ratio (housing)', value: `${num(front, 1, 1)}%` },
				{ label: 'Total monthly debt payments', value: money(totalDebt) },
				{ label: 'Other monthly debts', value: money(otherDebts) },
				{ label: 'Reading', value: reading.label }
			]
		};
	},
	content: {
		intro:
			'Use this debt-to-income ratio calculator to see how much of your monthly income goes to debt. Enter your income, housing payment and other debts, and see where you stand.',
		howTo: [
			'Enter your gross monthly income, which is your pay before tax.',
			'Enter your monthly housing payment: rent, or your mortgage with tax and insurance.',
			'List your other monthly debt payments, such as car loans, student loans and card minimums.',
			'Read your back-end ratio, the front-end ratio and the reading beside them.',
		],
		about: [
			{
				heading: 'What is a debt-to-income ratio?',
				paragraphs: [
					'Your debt-to-income ratio (DTI) compares your monthly debt payments with your gross monthly income. Lenders use it to judge whether you can take on a new loan.',
					'There are two versions. The **front-end ratio** looks at housing costs only. The **back-end ratio** adds all other debts. Most lenders focus on the back-end figure.',
					'A lower ratio gives you more room for a new loan. It also leaves more of each paycheck free for savings and daily costs.',
				]
			},
			{
				heading: 'How to read your ratio',
				paragraphs: [
					'Lenders set their own limits, so these bands are a guide. They are not a promise of approval or refusal.',
				],
				table: {
					caption: 'Back-end ratio bands used by this calculator',
					columns: ['Back-end ratio', 'Reading', 'What it usually means'],
					rows: [
						['36% or less', 'Good', 'A comfortable level of debt for most lenders'],
						['Over 36% up to 43%', 'Manageable', 'Often approved, but lenders may look closer'],
						['Over 43%', 'High', 'Loan options may be limited'],
					]
				}
			},
			{
				heading: 'A worked example and how to lower the ratio',
				paragraphs: [
					'Say you earn $6,000 a month and pay $1,800 for housing. Your other debts are a $350 car loan, a $200 student loan and a $120 card minimum. Total debt is $2,470, so your back-end ratio is 41.2%. Your front-end ratio is 30.0%.',
					'To lower the ratio, you can pay off a debt or raise your income. For example, clearing the $120 card payment lowers the back-end ratio to 39.2%. A lower housing cost helps too.',
				]
			},
			{
				heading: 'Things to keep in mind',
				paragraphs: [
					'The ratio is a useful check, but it has limits, so keep these points in mind:',
				],
				list: [
					'**It uses gross income.** Your take-home pay is lower, so a ratio that looks fine may feel tight.',
					'**It counts minimum payments only.** Food, utilities and savings are not in the ratio.',
					'**Lenders differ.** Some accept a higher ratio when you have a large down payment or savings.',
					'**It is only one test.** Lenders also look at your credit record and income stability.',
					'**Plan the next step.** See what price fits with the [house affordability calculator](/house-affordability-calculator), or work down debts with the [debt payoff calculator](/debt-payoff-calculator).',
				]
			},
			{
				heading: 'Debt ratios in different countries',
				paragraphs: [
					'The idea is used worldwide, but names and limits differ. Canadian lenders use two similar ratios called GDS and TDS. Some countries rely more on affordability checks of your income and spending than on a fixed ratio. Ask a local lender which test applies.',
				]
			},
			{
				heading: 'What to do if your ratio is high',
				paragraphs: [
					'First, don’t panic. A high ratio only means a large share of your income goes to debt. You can change that.',
					'Next, list your debts from highest rate to lowest. The [debt payoff calculator](/debt-payoff-calculator) shows how long it takes to clear them. If you pay several debts, the [debt consolidation calculator](/debt-consolidation-calculator) shows if one loan would cost less.',
					'Also review your spending with the [budget calculator](/budget-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Back-end ratio (debt-to-income)',
				expression: 'Back-end ratio = (housing payment + other debt payments) ÷ gross income × 100',
				variables: [{ symbol: '%', meaning: 'shown as a percentage of gross monthly income' }]
			},
			{
				title: 'Front-end ratio (housing)',
				expression: 'Front-end ratio = housing payment ÷ gross income × 100',
				variables: [{ symbol: 'gross income', meaning: 'monthly income before tax and deductions' }]
			}
		],
		example: {
			title: '$6,000 gross income, $1,800 housing and $670 in other debts',
			steps: [
				'Other debts: $350 + $200 + $120 = $670',
				'Total debt payments: $1,800 + $670 = $2,470',
				'Back-end ratio: $2,470 ÷ $6,000 × 100 ≈ 41.2%',
				'Front-end ratio: $1,800 ÷ $6,000 × 100 = 30.0%'
			],
			result: 'Back-end ratio 41.2%, which is in the manageable band, and front-end ratio 30.0%.'
		},
		faq: [
			{
				q: 'How do I calculate my debt-to-income ratio?',
				a: 'Add up your monthly debt payments, including housing. Divide the total by your gross monthly income, then multiply by 100. In the example above, $2,470 ÷ $6,000 gives 41.2%.'
			},
			{
				q: 'What is a good debt-to-income ratio?',
				a: 'A back-end ratio of 36% or less is usually seen as good. Between 36% and 43% is manageable. Above 43% is high. Lenders set their own limits.'
			},
			{
				q: 'What is the difference between front-end and back-end DTI?',
				a: 'Front-end DTI counts only housing costs. Back-end DTI counts housing plus all other monthly debts. The back-end figure is the one most lenders watch.'
			},
			{
				q: 'Do I use gross or net income?',
				a: 'Use gross income, which is before tax and deductions. That is how lenders usually measure it.'
			},
			{
				q: 'Do rent and utilities count as debt?',
				a: 'Rent counts as your housing payment if you rent. Utilities, food and similar bills are not debts, so they are not in the ratio.'
			},
			{
				q: 'Does my debt-to-income ratio affect my credit score?',
				a: 'No. A credit score does not use your income, so DTI is not part of it. But lenders look at both your score and your DTI when they decide.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is a debt-to-income ratio?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-why-is-the-43-debt-to-income-ratio-important-en-1791/' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. Lenders set their own ratio limits and check other factors. This is not a loan decision or financial advice.'
	}
});
