import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural, num } from '../format';
import meta from './down-payment-calculator.meta';

const isNum = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Whole months and years, e.g. "31 months (2 years 7 months)". */
function describeMonths(months: number): string {
	const years = Math.floor(months / 12);
	const rest = months % 12;
	if (years === 0) return plural(months, 'month');
	const detail = [plural(years, 'year'), rest > 0 ? plural(rest, 'month') : ''].filter(Boolean).join(' ');
	return `${plural(months, 'month')} (${detail})`;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Home price', type: 'number', default: 400000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 20, min: 0, max: 100, step: 0.5, suffix: '%', help: 'Share of the home price' },
		{
			id: 'closing',
			label: 'Closing costs',
			type: 'number',
			default: 3,
			min: 0,
			max: 20,
			step: 0.5,
			suffix: '%',
			help: 'Share of the home price, paid at purchase'
		},
		{ id: 'savings', label: 'Savings you have now', type: 'number', default: 30000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{
			id: 'monthly',
			label: 'Savings added each month',
			type: 'number',
			default: 2000,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			suffix: '/mo'
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const downPct = Number(v.down);
		const closingPct = Number(v.closing);
		const savings = Number(v.savings);
		const monthly = Number(v.monthly);

		if (
			!isNum(price, 1, 1e9) ||
			!isNum(downPct, 0, 100) ||
			!isNum(closingPct, 0, 20) ||
			!isNum(savings, 0, 1e9) ||
			!isNum(monthly, 0, 1e9)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Total cash needed',
				summary: 'Enter a home price, a down payment and closing costs as percentages, and your savings.'
			};
		}

		const downPayment = price * (downPct / 100);
		const closingCosts = price * (closingPct / 100);
		const cashNeeded = downPayment + closingCosts;
		const loan = price - downPayment;
		const gap = Math.max(0, cashNeeded - savings);

		let months: number | null = 0;
		if (gap > 0) months = monthly > 0 ? Math.ceil(gap / monthly) : null;

		let timeText: string;
		let summary: string;
		if (gap === 0) {
			timeText = 'Already saved';
			summary = 'Your savings already cover the down payment and closing costs. Interest on savings is ignored.';
		} else if (months === null) {
			timeText = 'Not reached without monthly savings';
			summary = `You still need ${money(gap)}. Add monthly savings to see a timeline. Interest on savings is ignored.`;
		} else {
			timeText = describeMonths(months);
			summary = `At ${money(monthly)} a month, you reach ${money(cashNeeded)} in ${plural(months, 'month')}. Interest on savings is ignored.`;
		}

		return {
			primaryResult: money(cashNeeded),
			primaryLabel: 'Total cash needed',
			summary,
			secondaryMetrics: [
				{ label: 'Down payment', value: money(downPayment) },
				{ label: `Closing costs (${num(closingPct, 2)}%)`, value: money(closingCosts) },
				{ label: 'Loan amount', value: money(loan) },
				{ label: 'Still to save', value: money(gap) },
				{ label: 'Time to save', value: timeText }
			]
		};
	},
	content: {
		intro:
			'Use this down payment calculator to see how much cash you need to buy a home and how long it takes to save it. It adds closing costs, shows your loan amount and counts the months to your goal.',
		howTo: [
			'Enter the home price and the down payment as a percentage.',
			'Enter the closing costs as a percentage of the price.',
			'Enter the savings you have now and what you add each month.',
			'Read the total cash you need and the time to save it.',
		],
		about: [
			{
				heading: 'What is a down payment?',
				paragraphs: [
					'A down payment is the part of the home price you pay in cash at the start. The lender finances the rest. In the UK and several other countries, the same thing is called a deposit.',
					'A bigger down payment means a smaller loan. As a result, your monthly payment and total interest are lower.',
				]
			},
			{
				heading: 'Down payment and closing costs',
				paragraphs: [
					'Closing costs are the fees you pay when the sale completes. They can include lender fees, legal fees, taxes and valuation costs. The names and amounts differ a lot by country, so the 3% default here is only a starting guess.',
					'This calculator adds closing costs to the down payment. That total is the cash you need on the day. For example, a $400,000 home with 20% down and 3% closing costs needs $92,000.',
					'Also, ask your lender or agent for an estimate of closing costs early, because they can change your goal by thousands.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline figure is the total cash you need at purchase. The detail underneath splits it into the down payment and closing costs. It also shows your loan amount and how much more you still need to save.',
					'The time to save is a simple estimate. It does not add interest on your savings, so you may get there a little sooner.',
				]
			},
			{
				heading: 'How the percentage changes your cash and loan',
				paragraphs: [
					'A smaller down payment is easier to reach, but you borrow more. The table shows a $400,000 home with 3% closing costs. The payments assume 6.5% over 30 years, for principal and interest only.',
					'Saving at $2,000 a month with $30,000 already saved, the 20% plan takes 31 months. The 10% plan takes 11 months.',
				],
				table: {
					caption: 'A $400,000 home with 3% closing costs',
					columns: ['Down payment', 'Cash needed', 'Loan amount', 'Monthly payment', 'Time to save'],
					rows: [
						['20%', '$92,000', '$320,000', '$2,022.62', '31 months'],
						['10%', '$52,000', '$360,000', '$2,275.44', '11 months'],
						['5%', '$32,000', '$380,000', '$2,401.86', '1 month'],
					]
				}
			},
			{
				heading: 'Tips for building your down payment',
				paragraphs: [
					'Here are a few steps that work:',
				],
				list: [
					'**Set a monthly amount and automate it.** A fixed transfer on payday is easier to keep.',
					'**Keep it in a safe place.** Money for a purchase in a few years should not carry big risk.',
					'**Check what you can borrow.** The [house affordability calculator](/house-affordability-calculator) shows a price range.',
					'**Plan the payment.** The [mortgage calculator](/mortgage-calculator) shows the monthly cost at each down payment.',
					'**Add local taxes.** In the UK, check the [stamp duty calculator](/stamp-duty-calculator).',
				]
			},
			{
				heading: 'Rules in different countries',
				paragraphs: [
					'Minimum down payments depend on the country and the lender. In the US, a conventional loan with less than 20% down usually needs private mortgage insurance (PMI). In Canada, mortgage default insurance is required when you put down less than 20%.',
					'Check the rules where you live. This tool does not add mortgage insurance, and it ignores interest on your savings.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It does not include mortgage insurance, moving costs, repairs or a cash cushion for after the move. Also, taxes on the purchase vary by place and can be large. Plan for those on top.',
				]
			}
		],
		formulas: [
			{
				title: 'Cash needed',
				expression: 'Down payment = price × down % ÷ 100        Closing costs = price × closing % ÷ 100',
				variables: [{ symbol: 'Cash needed', meaning: 'down payment plus closing costs' }]
			},
			{
				title: 'Loan amount',
				expression: 'Loan = price − down payment',
				variables: [{ symbol: 'Loan', meaning: 'the amount you will borrow' }]
			},
			{
				title: 'Months to save',
				expression: 'Months = ⌈(cash needed − savings) ÷ monthly savings⌉',
				variables: [
					{ symbol: '⌈ ⌉', meaning: 'round up to the next whole month' },
					{ symbol: 'savings', meaning: 'money you already have set aside' }
				]
			}
		],
		example: {
			title: 'A $400,000 home with 20% down, 3% closing costs, $30,000 saved and $2,000 added each month',
			steps: [
				'Down payment = $400,000 × 20% = $80,000',
				'Closing costs = $400,000 × 3% = $12,000',
				'Cash needed = $80,000 + $12,000 = $92,000, and the loan is $320,000',
				'Still to save = $92,000 − $30,000 = $62,000',
				'Months = $62,000 ÷ $2,000 = 31, which is 2 years and 7 months'
			],
			result: 'Total cash needed of $92,000.00, with 31 months (2 years 7 months) of saving at $2,000 a month.'
		},
		faq: [
			{
				q: 'How much should I put down on a house?',
				a: 'There is no single right amount. A larger down payment lowers your loan and your interest. But a smaller one gets you in sooner. Weigh the monthly payment against how much cash you keep as a safety fund.'
			},
			{
				q: 'Do I need 20% down?',
				a: 'Not always. In the US, 20% on a conventional loan usually avoids PMI, but many buyers put down less. Other countries have their own minimums, so ask a local lender.'
			},
			{
				q: 'What are closing costs?',
				a: 'They are fees paid when the sale completes, such as lender, legal and valuation fees and some taxes. They are often a few percent of the price, but the amount varies by country.'
			},
			{
				q: 'How is the time to save worked out?',
				a: 'The calculator takes the cash you need, subtracts your savings, and divides by your monthly savings. It rounds up to a whole month. It ignores interest on savings.'
			},
			{
				q: 'Does the loan amount include closing costs?',
				a: 'No. The loan is the price minus the down payment. Closing costs are paid in cash on top.'
			},
			{
				q: 'Should I put down more or keep cash in reserve?',
				a: 'Keep some cash. A larger down payment lowers your loan, but you also need money for repairs and emergencies after you move. So balance the two instead of spending every spare dollar on the deposit.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Owning a home', url: 'https://www.consumerfinance.gov/owning-a-home/' },
			{ title: 'U.S. Department of Housing and Urban Development', url: 'https://www.hud.gov/' },
		],
		disclaimer:
			'Estimates only. Closing costs, minimum down payments and mortgage insurance vary by lender and country.'
	}
});
