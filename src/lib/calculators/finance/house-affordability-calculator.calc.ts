import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './house-affordability-calculator.meta';

/** Monthly principal and interest per $1 borrowed: r(1+r)^n ÷ ((1+r)^n − 1); r = 0 → 1 ÷ n. */
function paymentPerDollar(annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return 1 / months;
	const f = Math.pow(1 + r, months);
	return (r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income', label: 'Annual gross income', type: 'number', default: 90000, min: 1, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Before taxes, combined for everyone on the loan' },
		{ id: 'debts', label: 'Monthly debt payments', type: 'number', default: 500, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo', help: 'Car loans, student loans, cards. Not current rent.' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 60000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'term', label: 'Loan term', type: 'number', default: 30, min: 1, max: 50, step: 1, suffix: 'years', decimal: false },
		{ id: 'tax', label: 'Property tax', type: 'number', default: 1.1, min: 0, max: 20, step: 0.01, suffix: '%/yr', help: 'Percent of the home price each year' },
		{ id: 'insurance', label: 'Home insurance', type: 'number', default: 1500, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' }
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const debts = Number(v.debts) || 0;
		const down = Number(v.down) || 0;
		const rate = Number(v.rate);
		const years = Number(v.term);
		const taxPct = Number(v.tax) || 0;
		const insurance = Number(v.insurance) || 0;

		if (
			!(income > 0) ||
			!Number.isFinite(income) ||
			!(debts >= 0 && down >= 0 && insurance >= 0 && taxPct >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(years) ||
			!(years >= 1 && years <= 50)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Affordable home price',
				summary: 'Enter your annual income, a loan term from 1 to 50 years and valid amounts.'
			};
		}

		// Monthly housing budget: the smaller of 28% of gross income (front-end)
		// and 36% of gross income minus monthly debts (back-end).
		const monthlyIncome = income / 12;
		const frontEnd = 0.28 * monthlyIncome;
		const backEnd = 0.36 * monthlyIncome - debts;
		const housing = Math.min(frontEnd, backEnd);
		const limit = frontEnd <= backEnd ? '28% housing' : '36% total debt';

		if (!(housing > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Affordable home price',
				summary: 'Your monthly debts use up the 36% limit, so no housing budget is left.'
			};
		}

		// Housing = L·k + t·(L + D) + I, where L is the loan, D the down payment,
		// k the principal and interest per $1, t the monthly tax per $1 of price, I monthly insurance.
		const k = paymentPerDollar(rate, years * 12);
		const t = taxPct / 1200;
		const i = insurance / 12;
		const loan = (housing - t * down - i) / (k + t);

		if (!(loan > 0) || !Number.isFinite(loan)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Affordable home price',
				summary: 'Your budget does not cover property tax and insurance with this down payment. Try a smaller down payment.'
			};
		}

		const price = loan + down;
		const principalInterest = loan * k;
		const monthlyTax = t * price;

		return {
			primaryResult: money(price, true),
			primaryLabel: 'Affordable home price',
			summary: `Limited by the ${limit} rule: up to ${money(housing)} a month for housing.`,
			secondaryMetrics: [
				{ label: 'Loan amount', value: money(loan, true) },
				{ label: 'Max monthly housing', value: money(housing) },
				{ label: 'Principal & interest', value: money(principalInterest) },
				{ label: 'Property tax (monthly)', value: money(monthlyTax) },
				{ label: 'Home insurance (monthly)', value: money(i) },
				{ label: 'Loan term', value: plural(years, 'year') }
			]
		};
	},
	content: {
		intro:
			'Use this house affordability calculator to estimate the home price you can afford from your income, debts and savings. It also shows the loan amount and the monthly cost behind the price.',
		howTo: [
			'Enter your yearly gross income and your monthly debt payments, such as car loans or cards.',
			'Enter your down payment, the interest rate and the loan term.',
			'Add the yearly property tax as a percentage of the home price, and the yearly insurance.',
			'Read the affordable price and check which rule limits it.',
		],
		about: [
			{
				heading: 'How lenders decide what you can afford',
				paragraphs: [
					'Many lenders use two simple limits. The first is the **front-end ratio**: housing costs should be no more than 28% of your gross monthly income. The second is the **back-end ratio**: all debts, including housing, should be no more than 36%.',
					'This calculator uses both and takes the smaller budget. These are common guidelines, mainly in the US. Your lender may allow more or less.',
				]
			},
			{
				heading: 'What the monthly housing budget covers',
				paragraphs: [
					'The budget has to pay for the loan, property tax and home insurance. The calculator works backwards from that budget to the loan you can carry. Then it adds your down payment to get the price.',
					'For example, an income of $90,000 gives a monthly income of $7,500. The 28% limit is $2,100. That budget buys a home of about $325,291 with a $60,000 down payment, a 6.5% rate and a 30-year term.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The main result is the highest home price that fits your budget. Below it, you see the loan amount and the monthly parts of the budget: principal and interest, property tax and insurance.',
					'The line under the result tells you which rule set the limit. If it says “28% housing”, your income is the limit. If it says “36% total debt”, your other debts are the limit, so paying them down will raise the price.',
				]
			},
			{
				heading: 'How income and debts change the answer',
				paragraphs: [
					'The table shows three cases with the same down payment, rate and term. When debts are high, the 36% rule becomes the limit and the price falls a lot.',
				],
				table: {
					caption: 'A 30-year loan at 6.5% with $60,000 down',
					columns: ['Case', 'Limit used', 'Affordable price'],
					rows: [
						['$90,000 income, $500 debts', '28% housing', '$325,291'],
						['$90,000 income, $1,500 debts', '36% total debt', '$200,936'],
						['$120,000 income, $500 debts', '28% housing', '$422,011'],
					]
				}
			},
			{
				heading: 'Tips to afford more',
				paragraphs: [
					'You can raise your budget in a few ways:',
				],
				list: [
					'**Pay down debts.** Lower monthly debts free up room under the 36% limit.',
					'**Save a larger down payment.** Plan it with the [down payment calculator](/down-payment-calculator).',
					'**Shop for a lower rate.** A lower rate means a smaller payment, so a higher price fits the same budget.',
					'**Check your ratios.** The [debt-to-income ratio calculator](/debt-to-income-ratio-calculator) shows where you stand.',
					'**Test the payment.** Once you pick a price, use the [mortgage calculator](/mortgage-calculator) to see the full monthly cost.',
				]
			},
			{
				heading: 'Home buying outside the US',
				paragraphs: [
					'Rules differ by country. In Canada, lenders also test whether you could pay at a higher rate, which the [Canada mortgage stress test calculator](/canada-mortgage-stress-test-calculator) shows. In Australia, try the [borrowing power calculator](/borrowing-power-calculator).',
					'Property tax and insurance work differently too. If the tax in your country is not a yearly percentage of the price, enter 0 and put other costs into the insurance field.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not include mortgage insurance, HOA fees, closing costs, repairs or utilities. All of these can matter in your real budget. It also assumes a fixed rate and that you can get a loan at the rate you enter.',
					'In the US, a government-backed loan may suit a smaller down payment. The [FHA loan calculator](/fha-loan-calculator) shows the payment with mortgage insurance.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly housing budget',
				expression: 'Housing = smaller of (28% × income ÷ 12) and (36% × income ÷ 12 − monthly debts)',
				variables: [
					{ symbol: '28%', meaning: 'front-end limit: housing costs as a share of gross income' },
					{ symbol: '36%', meaning: 'back-end limit: all debts, housing included, as a share of gross income' }
				]
			},
			{
				title: 'Affordable loan and price',
				expression: 'Loan = (Housing − t × D − I) ÷ (k + t)        Price = Loan + D',
				variables: [
					{ symbol: 'k', meaning: 'principal and interest per $1 borrowed (the payment factor for your rate and term)' },
					{ symbol: 't', meaning: 'monthly property tax per $1 of home price (tax % ÷ 12 ÷ 100)' },
					{ symbol: 'I', meaning: 'monthly home insurance (yearly cost ÷ 12)' },
					{ symbol: 'D', meaning: 'down payment' }
				]
			}
		],
		example: {
			title: 'Income of $90,000 a year, $500 of monthly debts, and $60,000 down',
			steps: [
				'Front-end: 28% × $90,000 ÷ 12 = $2,100 a month',
				'Back-end: 36% × $90,000 ÷ 12 − $500 = $2,200 a month',
				'The smaller limit is $2,100, so the front-end rule applies',
				'With 6.5% over 30 years, k ≈ 0.00632068. Tax is 1.1% a year and insurance is $1,500 a year, so t = 0.00091667 and I = $125',
				'Loan = ($2,100 − 0.00091667 × $60,000 − $125) ÷ (0.00632068 + 0.00091667) ≈ $265,291, so price ≈ $325,291'
			],
			result: 'Affordable home price of about $325,291 with a loan of about $265,291 and a monthly housing cost of $2,100.'
		},
		faq: [
			{
				q: 'How much house can I afford?',
				a: 'It depends on your income, debts, down payment, rate and term. This calculator uses the 28% and 36% guidelines to set a monthly budget, then works out the price. The example above gives about $325,291.'
			},
			{
				q: 'What is the 28/36 rule?',
				a: 'Housing should take no more than 28% of your gross monthly income. All debts together, including housing, should take no more than 36%. Lenders may use other limits.'
			},
			{
				q: 'Should I buy the most expensive home I can afford?',
				a: 'Not necessarily. The result is a ceiling, not a target. Repairs, utilities and savings goals need room in your budget too.'
			},
			{
				q: 'Do monthly debts include rent?',
				a: 'No. Enter only debts you will keep after you buy, such as car loans, student loans and card payments. Your current rent stops when you move.'
			},
			{
				q: 'Why is the result lower with a higher rate?',
				a: 'A higher rate raises the payment per dollar borrowed. The same budget then supports a smaller loan, so the price falls.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Owning a home', url: 'https://www.consumerfinance.gov/owning-a-home/' },
			{ title: 'Consumer Financial Protection Bureau: Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
		],
		disclaimer:
			'Estimates only. Lenders set their own limits, and taxes, insurance and fees vary by place. This is not a loan approval or financial advice.'
	}
});
