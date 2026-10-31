import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyCompact, num, plural } from '../format';
import meta from './mortgage-calculator.meta';

/** Standard fixed-rate payment: M = P·r(1+r)^n / ((1+r)^n − 1); r = 0 → P / n. */
export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 100 / 12;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Home price', type: 'number', default: 400000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 20, min: 0, max: 100, step: 0.5, suffix: '%' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Annual rate (APR without fees)' },
		{
			id: 'term',
			label: 'Loan term',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: '30 yr', value: '30' },
				{ label: '20 yr', value: '20' },
				{ label: '15 yr', value: '15' },
				{ label: '10 yr', value: '10' }
			]
		},
		{ id: 'tax', label: 'Property tax', type: 'number', default: 4800, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{ id: 'insurance', label: 'Home insurance', type: 'number', default: 1500, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{ id: 'hoa', label: 'HOA fees', type: 'number', default: 0, min: 0, max: 100_000, step: 10, prefix: '$', suffix: '/mo' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const downPct = Number(v.down);
		const rate = Number(v.rate);
		const years = Number(v.term);
		const tax = Number(v.tax) || 0;
		const insurance = Number(v.insurance) || 0;
		const hoa = Number(v.hoa) || 0;

		const loan = price * (1 - downPct / 100);
		const n = years * 12;
		if (!(loan > 0) || !Number.isFinite(loan) || !(years >= 1 && years <= 50) || !(rate >= 0 && rate <= 100)) {
			return { primaryResult: DASH, primaryLabel: 'Monthly payment', summary: 'Enter a home price and a down payment below 100%.' };
		}

		const pi = monthlyPayment(loan, rate, n);
		const monthly = pi + tax / 12 + insurance / 12 + hoa;
		const totalPI = pi * n;
		const totalInterest = totalPI - loan;

		// Yearly amortization
		const r = rate / 100 / 12;
		let balance = loan;
		let cumInterest = 0;
		const chartData: Record<string, number>[] = [{ year: 0, balance: loan, interest: 0 }];
		const rows: Record<string, string>[] = [];
		for (let y = 1; y <= years; y++) {
			let yPrincipal = 0;
			let yInterest = 0;
			for (let m = 0; m < 12; m++) {
				const interest = balance * r;
				const principal = Math.min(pi - interest, balance);
				balance -= principal;
				yPrincipal += principal;
				yInterest += interest;
			}
			if (balance < 0.005) balance = 0;
			cumInterest += yInterest;
			chartData.push({ year: y, balance, interest: cumInterest });
			rows.push({
				year: String(y),
				principal: money(yPrincipal, true),
				interest: money(yInterest, true),
				balance: money(balance, true)
			});
		}

		return {
			primaryResult: money(monthly),
			primaryLabel: 'Estimated monthly payment',
			summary: `${money(loan, true)} loan over ${plural(years, 'year')} at ${num(rate, 3)}%.`,
			secondaryMetrics: [
				{ label: 'Principal & interest', value: money(pi) },
				{ label: 'Property tax', value: money(tax / 12) },
				{ label: 'Home insurance', value: money(insurance / 12) },
				...(hoa > 0 ? [{ label: 'HOA fees', value: money(hoa) }] : []),
				{ label: 'Loan amount', value: money(loan, true) },
				{ label: 'Total interest', value: money(totalInterest, true) },
				{ label: 'Total of payments', value: money(totalPI, true) }
			],
			chart: {
				type: 'line',
				title: 'Loan balance and interest paid over time',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Remaining balance' },
					{ key: 'interest', label: 'Total interest paid' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'Amortization schedule (yearly)',
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
			'Estimate your monthly mortgage payment, including property tax, home insurance and HOA fees. You’ll also see the total interest and a year-by-year schedule, in any currency.',
		howTo: [
			'Enter the home price and your down payment as a percentage.',
			'Enter the interest rate your lender quoted, then pick a loan term.',
			'Add your yearly property tax and home insurance, plus any monthly HOA or service fees.',
			'Read your monthly payment. Then open the schedule to see how the balance falls each year.'
		],
		about: [
			{
				heading: 'What makes up a mortgage payment?',
				paragraphs: [
					'A mortgage is a loan to buy a home, paid back in monthly instalments. Each payment has two main parts. First, the **principal** pays down the amount you borrowed. Second, the **interest** is what the lender charges you for the loan.',
					'In many countries, the monthly cost also includes other items. For example, US lenders often collect property tax and home insurance with the payment. Flats and gated communities may add HOA or service charges as well.',
					'This calculator adds all of these together, so you see the full amount that leaves your account each month.'
				]
			},
			{
				heading: 'Why most of your early payments go to interest',
				paragraphs: [
					'Mortgages use a method called amortization. Your payment stays the same, but the split between interest and principal changes over time.',
					'At the start, your balance is at its highest, so interest takes most of each payment. For example, on a $320,000 loan at 6.5% for 30 years, the first payment of $2,022.62 includes $1,733.33 of interest. Only $289.28 reduces the loan.',
					'As the balance falls, the interest part shrinks and the principal part grows. That is why extra payments early in the loan save the most money.'
				]
			},
			{
				heading: 'How the rate and term change what you pay',
				paragraphs: [
					'Small changes in the rate or term make a big difference over many years. The table below uses the same $320,000 loan, so you can compare the options side by side.'
				],
				table: {
					caption: 'A $320,000 loan, principal and interest only',
					columns: ['Rate and term', 'Monthly payment', 'Total interest'],
					rows: [
						['5.5%, 30 years', '$1,816.92', '$334,093'],
						['6.5%, 30 years', '$2,022.62', '$408,142'],
						['7.5%, 30 years', '$2,237.49', '$485,495'],
						['6.5%, 15 years', '$2,787.54', '$181,758']
					]
				}
			},
			{
				heading: 'Ways to pay less interest',
				paragraphs: ['You can’t control market rates, but you can control a lot of the cost. Here are a few proven ways to save:'],
				list: [
					'**Pay a little extra each month.** On the loan above, an extra $200 a month clears it about 6.5 years early and saves over $105,000 in interest. Try it in the [mortgage payoff calculator](/mortgage-payoff-calculator).',
					'**Put more down.** A bigger down payment means a smaller loan. Plan yours with the [down payment calculator](/down-payment-calculator).',
					'**Compare the full cost, not just the rate.** Fees change the true cost, so check the [APR calculator](/apr-calculator).',
					'**Refinance when rates drop.** The [refinance calculator](/refinance-calculator) shows if the savings beat the costs.',
					'**Borrow what you can afford.** Before you look at homes, check your budget with the [house affordability calculator](/house-affordability-calculator).'
				]
			},
			{
				heading: 'Mortgages in different countries',
				paragraphs: [
					'The maths on this page works anywhere, so you can pick your currency at the top of the calculator. However, local rules can change the details.',
					'For example, Canadian fixed-rate mortgages compound twice a year, so use the [Canadian mortgage calculator](/canadian-mortgage-calculator). In the UK, try the [UK mortgage calculator](/uk-mortgage-calculator). In India, home loans are usually quoted as an EMI, so the [EMI calculator](/emi-calculator) fits best.',
					'If you want home finance that follows Islamic rules, without interest, the [Islamic home finance calculator](/islamic-home-finance-calculator) compares Murabaha and Ijara plans.'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly principal and interest',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly principal and interest payment' },
					{ symbol: 'P', meaning: 'loan amount (home price minus down payment)' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly payments (years × 12)' }
				]
			},
			{
				title: 'Total monthly payment',
				expression: 'Monthly payment = M + property tax ÷ 12 + insurance ÷ 12 + HOA',
				variables: [{ symbol: 'HOA', meaning: 'monthly homeowners’ association or service charge, if any' }]
			}
		],
		example: {
			title: 'A $400,000 home with 20% down at 6.5% for 30 years',
			steps: [
				'Loan amount: P = $400,000 × (1 − 0.20) = $320,000',
				'Monthly rate: r = 6.5 ÷ 12 ÷ 100 = 0.00541667',
				'Number of payments: n = 30 × 12 = 360',
				'Growth factor: (1 + r)ⁿ = 1.00541667³⁶⁰ ≈ 6.991798',
				'M = 320,000 × 0.00541667 × 6.991798 ÷ (6.991798 − 1) ≈ $2,022.62',
				'Add $4,800 ÷ 12 tax ($400) and $1,500 ÷ 12 insurance ($125)'
			],
			result: 'Monthly payment ≈ $2,547.62. Over 30 years you pay about $408,142 in interest.'
		},
		faq: [
			{
				q: 'How is a mortgage payment calculated?',
				a: 'The lender uses the loan amount, the monthly interest rate and the number of payments in the amortization formula above. Then property tax, insurance and any HOA fees are added on top.'
			},
			{
				q: 'What is included in a mortgage payment?',
				a: 'Principal and interest, plus, in many cases, property tax and home insurance collected by the lender. Some homes also have HOA fees or mortgage insurance, such as PMI in the US.'
			},
			{
				q: 'How does a bigger down payment change my payment?',
				a: 'It lowers the loan amount, so both the monthly payment and the total interest go down. In the US, putting at least 20% down on a conventional loan also usually avoids PMI.'
			},
			{
				q: 'Is a 15-year or 30-year mortgage better?',
				a: 'A 15-year loan costs more each month but far less in total interest. On a $320,000 loan at 6.5%, it saves about $226,000. A 30-year loan keeps payments lower, so it depends on your budget.'
			},
			{
				q: 'Does this calculator include PMI or mortgage insurance?',
				a: 'Not directly. If your lender charges mortgage insurance, add the monthly amount to the HOA field. Then it will be included in your total payment.'
			},
			{
				q: 'Can I use this mortgage calculator outside the US?',
				a: 'Yes. Choose your currency at the top. The formula is the same in most countries. However, Canada compounds fixed rates twice a year, so use the Canadian calculator there.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — Explore interest rates', url: 'https://www.consumerfinance.gov/owning-a-home/explore-rates/' },
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' }
		],
		disclaimer: 'Estimates only. Your actual rate, taxes, insurance and fees depend on your lender and location.'
	}
});
