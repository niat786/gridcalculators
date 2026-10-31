import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct, plural } from '../format';
import { CAP_HOME_LOAN_INTEREST } from '../data/in-tax-fy2026-27';

const inr = (n: number) => moneyIn('INR', n, true);
import meta from './emi-calculator.meta';

/**
 * Equated monthly instalment on a reducing-balance loan:
 * EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where r = annual rate ÷ 12 ÷ 100 and n = months.
 * A 0% rate gives P ÷ n. Checked against Bajaj Finserv's documented formula and the example
 * ₹10,00,000 at 10% for 20 years = ₹9,650.22 a month.
 */
export function emiFor(principal: number, annualPct: number, months: number): number {
	const r = annualPct / 100 / 12;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'loan', label: 'Loan amount', type: 'number', default: 1000000, min: 1, max: 1_000_000_000_000, step: 10000, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 10, min: 0, max: 60, step: 0.05, suffix: '%', help: 'Annual rate. It is converted to a monthly rate.' },
		{ id: 'tenure', label: 'Loan tenure', type: 'number', default: 20, min: 1, max: 600, step: 1, decimal: false, help: 'Enter the length, then pick years or months' },
		{
			id: 'unit',
			label: 'Tenure unit',
			type: 'select',
			display: 'segmented',
			default: 'years',
			options: [
				{ label: 'Years', value: 'years' },
				{ label: 'Months', value: 'months' }
			]
		}
	],
	calculate(v: InputValues) {
		const principal = Number(v.loan);
		const rate = Number(v.rate);
		const tenure = Number(v.tenure);
		const inYears = v.unit !== 'months';
		const months = inYears ? tenure * 12 : tenure;
		if (
			!(principal > 0) ||
			!Number.isFinite(principal) ||
			!(rate >= 0 && rate <= 60) ||
			!Number.isInteger(tenure) ||
			!(months >= 1 && months <= 600)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly EMI',
				summary: 'Enter a loan amount above zero, a rate from 0% to 60%, and a tenure of 1 to 50 years (600 months).'
			};
		}

		const emi = emiFor(principal, rate, months);
		const r = rate / 1200;
		const tenureText = inYears ? plural(tenure, 'year') : plural(tenure, 'month');

		// Month-by-month schedule, summarised per year.
		let balance = principal;
		let totalInterest = 0;
		let yearPrincipal = 0;
		let yearInterest = 0;
		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [{ year: 0, balance: principal, interest: 0 }];
		for (let m = 1; m <= months; m++) {
			const interest = balance * r;
			const principalPart = m === months ? balance : emi - interest;
			balance -= principalPart;
			totalInterest += interest;
			yearInterest += interest;
			yearPrincipal += principalPart;
			if (m % 12 === 0 || m === months) {
				const yearNo = Math.ceil(m / 12);
				const bal = Math.max(balance, 0);
				chartData.push({ year: yearNo, balance: bal, interest: totalInterest });
				rows.push({
					year: String(yearNo),
					principal: money(yearPrincipal, true),
					interest: money(yearInterest, true),
					balance: money(bal, true)
				});
				yearPrincipal = 0;
				yearInterest = 0;
			}
		}

		const interestRounded = Math.round(totalInterest);
		const totalPaid = Math.round(principal + totalInterest);

		return {
			primaryResult: money(emi),
			primaryLabel: 'Monthly EMI',
			summary: `${money(principal, true)} at ${num(rate, 2)}% a year over ${tenureText}. Calculated before the bank rounds the EMI to the paisa.`,
			secondaryMetrics: [
				{ label: 'Loan amount', value: money(principal, true) },
				{ label: 'Total interest', value: money(interestRounded, true) },
				{ label: 'Total payment', value: money(totalPaid, true) },
				{ label: 'Number of payments', value: plural(months, 'monthly payment') },
				{ label: 'Interest share of payments', value: pct((totalInterest / (principal + totalInterest)) * 100, 1) }
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
					{ key: 'principal', label: 'Principal paid', align: 'end' },
					{ key: 'interest', label: 'Interest paid', align: 'end' },
					{ key: 'balance', label: 'Balance', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this EMI calculator to find the fixed monthly instalment on a home, car or personal loan, and the total interest you will pay. Enter the loan amount, the yearly interest rate and the tenure. The maths works in any currency.',
		howTo: [
			'Enter the loan amount you plan to borrow.',
			'Enter the yearly interest rate the lender quotes.',
			'Enter the tenure and choose whether it is in years or months.',
			'Read the monthly EMI, then open the yearly schedule to see how the balance falls.'
		],
		about: [
			{
				heading: 'What is an EMI?',
				paragraphs: [
					'EMI stands for equated monthly instalment. It is the fixed amount you pay your lender every month until the loan is cleared. Each EMI has two parts: some principal (the money you borrowed) and some interest (the lender’s charge).',
					'The EMI stays the same, but the split changes. At the start, your balance is high, so most of the EMI is interest. Over time, the interest part shrinks and the principal part grows.',
					'This calculator uses the reducing-balance method. Interest is charged only on the amount you still owe, which is how most bank loans in India work.'
				]
			},
			{
				heading: 'How EMI is calculated',
				paragraphs: [
					'The calculator turns the yearly rate into a monthly rate by dividing it by 12. Then it uses the standard EMI formula shown below, with the loan amount and the number of monthly payments.',
					`For example, take a loan of ${inr(1_000_000)} at 10% for 20 years. The EMI is ₹9,650.22. In the first month, the interest is ₹8,333.33 and only ₹1,316.89 reduces the loan.`,
					'Total interest is simply the EMI times the number of payments, minus the amount you borrowed.'
				]
			},
			{
				heading: 'How the interest rate changes your EMI',
				paragraphs: [
					'A small change in the rate has a large effect on a long loan. The table below uses a ₹10,00,000 loan over 20 years, so you can compare the rates side by side.'
				],
				table: {
					caption: '₹10,00,000 loan for 20 years',
					columns: ['Interest rate', 'Monthly EMI', 'Total interest'],
					rows: [
						['8%', '₹8,364.40', '₹10,07,456'],
						['9%', '₹8,997.26', '₹11,59,342'],
						['10%', '₹9,650.22', '₹13,16,052'],
						['12%', '₹11,010.86', '₹16,42,607']
					]
				}
			},
			{
				heading: 'How the tenure changes what you pay',
				paragraphs: [
					'A longer tenure gives you a lower EMI, but you pay far more interest. A shorter tenure does the opposite. Pick the shortest tenure that your monthly budget can carry comfortably.',
					'The table uses the same ₹10,00,000 loan at 10%. Going from 10 to 25 years cuts the EMI by about ₹4,100, but it adds more than ₹11 lakh of interest.'
				],
				table: {
					caption: '₹10,00,000 loan at 10%',
					columns: ['Tenure', 'Monthly EMI', 'Total interest'],
					rows: [
						['10 years', '₹13,215.07', '₹5,85,809'],
						['15 years', '₹10,746.05', '₹9,34,289'],
						['20 years', '₹9,650.22', '₹13,16,052'],
						['25 years', '₹9,087.01', '₹17,26,102']
					]
				}
			},
			{
				heading: 'Tips to keep your loan cost down',
				paragraphs: ['You can’t set the market rate, but you can control a lot of the cost:'],
				list: [
					'**Check the full cost.** Processing fees and insurance raise the real cost. Compare loans with the [APR calculator](/apr-calculator).',
					'**Pay extra when you can.** Prepaying reduces the balance, so you pay less interest. Check your lender’s prepayment rules first.',
					'**Keep the EMI affordable.** Check all your EMIs against your monthly take-home pay, and leave room for other costs. Work out your take-home with the [in-hand salary calculator](/in-hand-salary-calculator).',
					`**Use the home loan tax benefit.** In the old regime, you can deduct up to ${inr(CAP_HOME_LOAN_INTEREST)} of interest a year on a home you live in. See the effect in the [India income tax calculator](/india-income-tax-calculator).`,
					'**Compare with investing.** Before you prepay a cheap loan, see what the same money could earn in a [SIP](/sip-calculator).',
					'**Watch floating rates.** If your rate floats, the lender may change your EMI or tenure when the rate moves.'
				]
			}
		],
		formulas: [
			{
				title: 'Equated monthly instalment (EMI)',
				expression: 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'monthly interest rate (annual rate ÷ 12 ÷ 100)' },
					{ symbol: 'n', meaning: 'number of monthly instalments (tenure in months)' }
				]
			},
			{
				title: 'Totals',
				expression: 'Total payment = EMI × n     Total interest = Total payment − P',
				variables: []
			},
			{
				title: 'Zero interest',
				expression: 'If the rate is 0%, EMI = P ÷ n',
				variables: []
			}
		],
		example: {
			title: '₹10,00,000 at 10% a year for 20 years',
			steps: [
				'Monthly rate: r = 10 ÷ 12 ÷ 100 ≈ 0.0083333',
				'Number of payments: n = 20 × 12 = 240',
				'Growth factor: (1 + r)²⁴⁰ ≈ 7.328074',
				'EMI = ₹10,00,000 × 0.0083333 × 7.328074 ÷ (7.328074 − 1) ≈ ₹9,650.22',
				'Total payment = 240 × ₹9,650.22 ≈ ₹23,16,052',
				'Total interest = ₹23,16,052 − ₹10,00,000 = ₹13,16,052'
			],
			result: 'Monthly EMI ₹9,650.22. Total interest ₹13,16,052 over 240 payments.'
		},
		faq: [
			{
				q: 'How is EMI calculated?',
				a: 'The calculator uses the loan amount, the monthly interest rate and the number of monthly payments in the EMI formula above. The result is one fixed amount that clears the loan exactly at the end of the tenure.'
			},
			{
				q: 'Why does the interest part fall each month?',
				a: 'Interest is charged on the balance still owed. As you repay principal, the balance shrinks, so each EMI contains a little more principal and a little less interest.'
			},
			{
				q: 'Why might my lender’s EMI differ slightly?',
				a: 'Lenders round the EMI to the rupee or paisa and adjust the final instalment. This calculator uses the exact figure, so the difference is usually a few paise.'
			},
			{
				q: 'Does this include processing fees, insurance or prepayment?',
				a: 'No. Processing fees, insurance, taxes and prepayment charges are not included. A prepayment would reduce the total interest and the tenure.'
			},
			{
				q: 'Is a flat rate the same as a reducing-balance rate?',
				a: 'No. A flat rate charges interest on the full original loan for the whole term, so the true cost is higher. This calculator assumes a reducing-balance rate. Ask your lender which kind they quote.'
			},
			{
				q: 'Can I use this EMI calculator outside India?',
				a: 'Yes. The formula is the same for any loan with equal monthly payments. Switch the currency at the top of the calculator. Fees and tax rules will differ by country.'
			}
		],
		sources: [
			{
				title: 'Bajaj Finserv — EMI calculation in the reducing balance method',
				url: 'https://www.bajajfinserv.in/emi-calculation-in-reducing-balance-method'
			},
			{ title: 'Reserve Bank of India', url: 'https://www.rbi.org.in/' }
		],
		disclaimer:
			'This is an estimate for illustration only. Your lender’s EMI, fees and interest rate depend on your loan agreement.'
	}
});
