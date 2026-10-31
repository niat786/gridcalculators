import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, pct, plural } from '../format';
import meta from './uk-mortgage-calculator.meta';

const isNum = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Pounds with two decimals, e.g. £240,000.00. */
const gbp = (n: number) => (Number.isFinite(n) ? `£${num(n, 2, 2)}` : DASH);

/** Repayment payment: M = L × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = 0 → L ÷ n. */
function repaymentPayment(loan: number, monthlyRate: number, months: number): number {
	if (monthlyRate === 0) return loan / months;
	const f = Math.pow(1 + monthlyRate, months);
	return (loan * monthlyRate * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Property price', type: 'number', default: 300000, min: 1, max: 100_000_000, step: 1000, prefix: '£' },
		{
			id: 'deposit',
			label: 'Deposit',
			type: 'number',
			default: 60000,
			min: 0,
			max: 100_000_000,
			step: 1000,
			prefix: '£',
			help: 'Cash you pay upfront. You borrow the rest.'
		},
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 4.5, min: 0, max: 30, step: 0.01, suffix: '%', help: 'Annual rate' },
		{ id: 'term', label: 'Mortgage term', type: 'number', default: 25, min: 1, max: 40, step: 1, suffix: 'years', decimal: false },
		{
			id: 'type',
			label: 'Repayment type',
			type: 'select',
			display: 'segmented',
			default: 'repayment',
			options: [
				{ label: 'Repayment', value: 'repayment' },
				{ label: 'Interest-only', value: 'interest-only' }
			]
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const deposit = Number(v.deposit);
		const rate = Number(v.rate);
		const years = Number(v.term);
		const interestOnly = v.type === 'interest-only';

		if (
			!isNum(price, 1, 1e9) ||
			!isNum(deposit, 0, 1e9) ||
			deposit >= price ||
			!isNum(rate, 0, 30) ||
			!isNum(years, 1, 40) ||
			!Number.isInteger(years)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Monthly payment',
				summary: 'Enter a price above your deposit, an interest rate, and a term of 1 to 40 years.'
			};
		}

		const loan = price - deposit;
		const monthlyRate = rate / 1200;
		const months = years * 12;
		const monthly = interestOnly ? loan * monthlyRate : repaymentPayment(loan, monthlyRate, months);
		const totalInterest = interestOnly ? loan * monthlyRate * months : monthly * months - loan;
		const totalRepaid = totalInterest + loan;
		const owedAtEnd = interestOnly ? loan : 0;

		return {
			primaryResult: gbp(monthly),
			primaryLabel: 'Monthly payment',
			summary: `${gbp(loan)} loan over ${plural(years, 'year')} at ${pct(rate, 2)}, ${
				interestOnly ? 'interest only' : 'capital and interest'
			}.`,
			secondaryMetrics: [
				{ label: 'Loan amount', value: gbp(loan) },
				{ label: 'Loan to value', value: pct((loan / price) * 100, 1) },
				{ label: 'Total interest', value: gbp(totalInterest) },
				{ label: 'Total repaid', value: gbp(totalRepaid) },
				{ label: 'Still owed at end of term', value: gbp(owedAtEnd) }
			]
		};
	},
	content: {
		intro:
			'Estimate your monthly UK mortgage payment in pounds. Choose a repayment mortgage, where the loan is cleared by the end of the term, or an interest-only mortgage, and see the total interest you will pay.',
		howTo: [
			'Enter the property price and the deposit you will pay upfront.',
			'Enter the interest rate and the length of the mortgage in years.',
			'Choose repayment or interest-only, depending on how you plan to repay the loan.',
			'Read the monthly payment, then compare the total interest and total repaid.'
		],
		about: [
			{
				heading: 'How a UK mortgage payment works',
				paragraphs: [
					'A mortgage is a loan secured on your home. You borrow the property price minus your deposit, and you pay interest on what you owe. The share of the price you borrow is called the loan to value (LTV).',
					'On a repayment mortgage, each monthly payment covers that month’s interest and some of the loan. By the end of the term you owe nothing. On an interest-only mortgage, you pay only the interest, so the whole loan is still owed at the end.',
					'Lenders usually expect a clear plan for repaying an interest-only loan, such as savings or an investment. They check that plan before they lend. If you are not sure which type suits you, a mortgage broker or MoneyHelper can explain the options. Treat the figures here as a starting point for that conversation.'
				]
			},
			{
				heading: 'How rate and term change your payment',
				paragraphs: [
					'The table uses a £300,000 home with a £60,000 deposit, so the loan is £240,000. It shows how the monthly payment moves when you change the interest rate or the term.',
					'A longer term lowers the monthly payment, but you pay much more interest overall. For example, 30 years instead of 25 at 4.5% cuts the payment from £1,334.00 to £1,216.04. However, total interest rises from £160,199.38 to £197,776.11.'
				],
				table: {
					caption: '£240,000 repayment mortgage',
					columns: ['Rate', 'Term', 'Monthly payment', 'Total interest'],
					rows: [
						['3.5%', '25 years', '£1,201.50', '£120,448.97'],
						['4.5%', '25 years', '£1,334.00', '£160,199.38'],
						['5.5%', '25 years', '£1,473.81', '£202,142.99'],
						['4.5%', '30 years', '£1,216.04', '£197,776.11']
					]
				}
			},
			{
				heading: 'Repayment or interest-only?',
				paragraphs: [
					'On the same £240,000 loan at 4.5% over 25 years, an interest-only mortgage costs £900.00 a month. A repayment mortgage costs £1,334.00. The cheaper payment has a catch, because the £240,000 is still owed at the end.',
					'So the right choice depends on how you will repay the capital. Try both options above to compare the total repaid. Also compare a few rates, because even a small change adds up over 25 years. For a non-UK comparison, see the [mortgage calculator](/mortgage-calculator).'
				]
			},
			{
				heading: 'What the calculator leaves out',
				paragraphs: [
					'The tool uses one interest rate for the whole term. In the UK, many deals are fixed for a set period, then move to a different rate. Your payment can change when that happens, so test a higher rate too. That way you know what you could afford if the rate rises.',
					'It also leaves out fees, insurance and overpayments. Buying costs are separate, and the [stamp duty calculator](/stamp-duty-calculator) shows the tax you may owe. To check whether the payment fits your pay, use the [UK take-home pay calculator](/uk-take-home-pay-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Repayment mortgage',
				expression: 'M = L × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'L', meaning: 'loan: property price minus deposit' },
					{ symbol: 'r', meaning: 'monthly rate: annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payments: years × 12' }
				]
			},
			{
				title: 'Interest-only mortgage',
				expression: 'M = L × r        Total interest = L × r × n',
				variables: [{ symbol: 'M', meaning: 'monthly payment, covering interest only' }]
			},
			{
				title: 'Total repaid',
				expression: 'Total repaid = total interest + L',
				variables: [{ symbol: 'L', meaning: 'the capital you borrowed' }]
			}
		],
		example: {
			title: 'A £300,000 home with a £60,000 deposit, 4.5% over 25 years, on repayment',
			steps: [
				'Loan = £300,000 − £60,000 = £240,000',
				'Monthly rate: r = 0.045 ÷ 12 = 0.00375, and n = 25 × 12 = 300',
				'Payment: M = £240,000 × 0.00375 × (1.00375)³⁰⁰ ÷ ((1.00375)³⁰⁰ − 1) ≈ £1,334.00',
				'Total repaid = £1,334.00 × 300 ≈ £400,199.38, so interest ≈ £160,199.38'
			],
			result: 'A monthly payment of £1,334.00, with total interest of £160,199.38 and a total repaid of £400,199.38.'
		},
		faq: [
			{
				q: 'How much is my monthly mortgage payment?',
				a: 'Enter the price, deposit, rate and term above. For example, a £240,000 repayment loan at 4.5% over 25 years costs £1,334.00 a month.'
			},
			{
				q: 'What is the difference between repayment and interest-only?',
				a: 'A repayment mortgage pays off the loan and the interest by the end of the term. An interest-only mortgage covers just the interest, so the full loan is still owed at the end and must be repaid another way.'
			},
			{
				q: 'Why does the size of my deposit matter?',
				a: 'Lenders price loans by loan to value, the share of the property price you borrow. A larger deposit lowers that share, and lenders often offer better rates at lower loan to value levels.'
			},
			{
				q: 'Does this include stamp duty or fees?',
				a: 'No. Stamp duty, arrangement fees, valuation and legal costs are not included. Budget for them separately, starting with the [stamp duty calculator](/stamp-duty-calculator).'
			},
			{
				q: 'Why might my lender’s figure differ?',
				a: 'Lenders may calculate interest daily or on a different schedule, and your rate may change during the term. Use the result as a guide and ask your lender or broker for an illustration.'
			}
		],
		sources: [
			{ title: 'GOV.UK', url: 'https://www.gov.uk/' },
			{ title: 'MoneyHelper', url: 'https://www.moneyhelper.org.uk/' }
		],
		disclaimer:
			'Estimates only. Lenders set the final rate and terms, and taxes, fees and insurance are not included. This is not financial advice.'
	}
});
