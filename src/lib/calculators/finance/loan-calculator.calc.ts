import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './loan-calculator.meta';

/** Fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

/** "5 years 3 months", "2 years", "9 months". */
function termText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ');
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 20000, min: 1, max: 100_000_000, step: 100, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 7, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'years', label: 'Term (years)', type: 'number', default: 5, min: 0, max: 50, step: 1, suffix: 'years', decimal: false, width: 'half' },
		{ id: 'months', label: 'Term (months)', type: 'number', default: 0, min: 0, max: 11, step: 1, suffix: 'months', decimal: false, width: 'half' }
	],
	calculate(v): CalculationResult {
		const principal = Number(v.amount);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const extraMonths = Number(v.months);
		const n = years * 12 + extraMonths;

		if (
			!(principal > 0) ||
			!Number.isFinite(principal) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(years) ||
			!Number.isInteger(extraMonths) ||
			!(n >= 1 && n <= 600)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter a loan amount and a term of at least one month (up to 50 years).'
			};
		}

		const monthly = payment(principal, rate, n);
		const totalPaid = monthly * n;
		const totalInterest = Math.max(0, totalPaid - principal);

		// Yearly repayment table. Each row covers 12 payments; the last row may be shorter.
		const r = rate / 1200;
		let balance = principal;
		let yPrincipal = 0;
		let yInterest = 0;
		const rows: Record<string, string>[] = [];
		for (let m = 1; m <= n; m++) {
			const interest = balance * r;
			const part = m === n ? balance : Math.min(monthly - interest, balance);
			balance -= part;
			yPrincipal += part;
			yInterest += interest;
			if (m % 12 === 0 || m === n) {
				if (Math.abs(balance) < 0.005) balance = 0;
				rows.push({
					year: String(rows.length + 1),
					principal: money(yPrincipal, true),
					interest: money(yInterest, true),
					balance: money(balance, true)
				});
				yPrincipal = 0;
				yInterest = 0;
			}
		}

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Monthly payment',
			summary: `${money(principal, true)} at ${num(rate, 3)}% over ${termText(n)}.`,
			secondaryMetrics: [
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total paid', value: money(totalPaid) },
				{ label: 'Number of payments', value: plural(n, 'payment') },
				{ label: 'Loan term', value: termText(n) }
			],
			table: {
				title: 'Repayment schedule (yearly)',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'principal', label: 'Principal', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this loan calculator to find the monthly payment on any fixed-rate loan, plus the total interest and the full cost of borrowing. It works in any currency, for terms from one month to 50 years.',
		howTo: [
			'Enter the amount you want to borrow and the annual interest rate.',
			'Set the term in years and months. For a loan of 3 years and 6 months, enter 3 and 6.',
			'Read your monthly payment, the total interest and the total you will pay back.',
			'Open the yearly schedule to see how much of each year goes to principal and to interest.',
		],
		about: [
			{
				heading: 'What is a loan payment made of?',
				paragraphs: [
					'When you borrow money, you agree to pay it back in regular instalments. Each instalment has two parts. The **principal** is the amount you borrowed. The **interest** is the fee the lender charges for letting you use the money.',
					'With a fixed-rate loan, the payment stays the same every month. However, the mix inside it changes. Early payments are mostly interest, and later ones are mostly principal. This is called amortization, which means paying a loan off in steps.',
					'To see every payment one by one, try the [amortization calculator](/amortization-calculator).',
				]
			},
			{
				heading: 'How the term and the rate change your cost',
				paragraphs: [
					'Two choices drive the cost of a loan: how long you borrow and the rate you pay. The table below uses a $20,000 loan so you can compare them side by side.',
					'A longer term gives a smaller payment, but you pay interest for more months. A higher rate pushes the cost up in the same way. So compare a few options before you sign.',
				],
				table: {
					caption: 'A $20,000 loan, interest only on the balance',
					columns: ['Rate and term', 'Monthly payment', 'Total interest'],
					rows: [
						['7%, 3 years', '$617.54', '$2,231.51'],
						['7%, 5 years', '$396.02', '$3,761.44'],
						['7%, 7 years', '$301.85', '$5,355.70'],
						['5%, 5 years', '$377.42', '$2,645.48'],
						['9%, 5 years', '$415.17', '$4,910.03'],
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'Start with the monthly payment and check it against your budget. A payment that looks small can hide a high total cost, so look at the total interest too.',
					'Total interest is the price of borrowing. In the example above, a $20,000 loan at 7% for 5 years costs $3,761.44 in interest. That is about 19% on top of what you borrowed.',
					'Then compare the total paid across offers. The cheapest monthly payment is not always the cheapest loan.',
				]
			},
			{
				heading: 'Ways to pay less interest',
				paragraphs: [
					'You can’t change the market, but you can change how you borrow. Here are a few simple ideas:',
				],
				list: [
					'**Pay a little extra.** On the $20,000 loan at 7% for 5 years, an extra $50 a month clears it in 53 months instead of 60. That saves about $508 in interest.',
					'**Choose the shortest term you can afford.** The payment is higher, but the total cost is lower.',
					'**Look at the full cost.** Fees raise the true price of a loan, so check the [APR calculator](/apr-calculator) before you compare offers.',
					'**Ask about early repayment.** Some lenders charge a penalty if you pay a loan off early. Read the agreement first.',
				]
			},
			{
				heading: 'Loans in different countries',
				paragraphs: [
					'The maths works anywhere, so pick your currency at the top of the calculator. However, names and rules differ. In India and across South Asia, the monthly loan payment is usually called an EMI (equated monthly instalment). The [EMI calculator](/emi-calculator) uses the same formula.',
					'This tool is for loans with equal payments and a fixed rate. Credit cards and interest-only loans work differently. For cards, use the [credit card payoff calculator](/credit-card-payoff-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'This tool uses the rate you enter and nothing else. It does not add fees, insurance or late charges. Many loans have extras, such as an origination fee or credit insurance, and these raise the real cost.',
					'It also assumes the rate never changes. If your loan has a variable rate, your payment can rise or fall over time. In that case, treat the result as a guide and ask your lender for the full terms.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments (years × 12 + months)' }
				]
			},
			{
				title: 'Totals',
				expression: 'Total paid = M × n        Total interest = Total paid − P',
				variables: []
			},
			{
				title: 'Zero interest',
				expression: 'If the rate is 0%, M = P ÷ n',
				variables: []
			}
		],
		example: {
			title: 'A $20,000 loan at 7% for 5 years',
			steps: [
				'Monthly rate: r = 7 ÷ 12 ÷ 100 = 0.0058333',
				'Number of payments: n = 5 × 12 + 0 = 60',
				'Growth factor: (1 + r)ⁿ = 1.0058333⁶⁰ ≈ 1.4176',
				'M = 20,000 × 0.0058333 × 1.4176 ÷ (1.4176 − 1) ≈ $396.02',
				'Total paid = 396.024 × 60 = $23,761.44, so interest = $23,761.44 − $20,000 = $3,761.44'
			],
			result: 'Monthly payment of $396.02. Total interest of $3,761.44 over 5 years.'
		},
		faq: [
			{
				q: 'How do I calculate a loan payment?',
				a: 'Use the loan amount, the monthly interest rate and the number of payments in the formula above. Or enter them here and the calculator does the work. The payment is the same every month.'
			},
			{
				q: 'What is the difference between the interest rate and APR?',
				a: 'The interest rate is the yearly cost of the money you borrow. APR also includes most upfront fees, so it is usually higher. This calculator uses the rate you enter and adds no fees.'
			},
			{
				q: 'Why does a longer term lower the payment but raise the total interest?',
				a: 'You spread the same debt over more months, so each payment is smaller. But interest builds up for longer, so the total you pay goes up.'
			},
			{
				q: 'Can I enter the term in months only?',
				a: 'Yes. Enter 0 years and the number of months. The calculator adds years and months together, up to 600 payments in total.'
			},
			{
				q: 'Does the yearly schedule show the exact payoff?',
				a: 'It shows each year as a total. Each payment is split into interest on the balance and principal. The last row closes the balance at zero.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Consumer Financial Protection Bureau: Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
		],
		disclaimer:
			'Estimates only. Your actual rate, fees and payment schedule depend on your lender and your loan agreement.'
	}
});
