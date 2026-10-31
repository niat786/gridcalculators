import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './repayment-calculator.meta';

/** Safety cap on the month-by-month loop (100 years). */
const MAX_MONTHS = 1200;

/** "4 years 11 months", "2 years", "9 months". */
function termText(months: number): string {
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(' ');
}

/** Level payment: P·r(1 + r)^n / ((1 + r)^n − 1); r = 0 → P / n. */
function levelPayment(principal: number, annualPct: number, n: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / n;
	const f = Math.pow(1 + r, n);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount borrowed', type: 'number', default: 25000, min: 1, max: 100_000_000, step: 100, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.5, min: 0, max: 100, step: 0.01, suffix: '%', help: 'Annual rate' },
		{
			id: 'mode',
			label: 'Calculate',
			type: 'select',
			display: 'segmented',
			default: 'term',
			options: [
				{ label: 'Payment for a term', value: 'term' },
				{ label: 'Time for a payment', value: 'payment' }
			]
		},
		{
			id: 'years',
			label: 'Term (years)',
			type: 'number',
			default: 5,
			min: 1,
			max: 50,
			step: 1,
			suffix: 'years',
			decimal: false,
			visibleWhen: (v) => v.mode !== 'payment'
		},
		{
			id: 'payment',
			label: 'Monthly payment',
			type: 'number',
			default: 500,
			min: 0,
			max: 100_000_000,
			step: 10,
			prefix: '$',
			visibleWhen: (v) => v.mode === 'payment'
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.amount);
		const rate = Number(v.rate);
		const byTerm = String(v.mode) !== 'payment';
		const years = Number(v.years);
		const given = Number(v.payment);
		const r = rate / 1200;

		const inputsOk =
			principal > 0 &&
			Number.isFinite(principal) &&
			rate >= 0 &&
			rate <= 100 &&
			(byTerm ? Number.isInteger(years) && years >= 1 && years <= 50 : given > 0 && Number.isFinite(given));
		if (!inputsOk) {
			return {
				primaryResult: DASH,
				primaryLabel: byTerm ? 'Monthly payment' : 'Time to repay',
				summary: byTerm
					? 'Enter an amount above zero, a rate from 0% to 100%, and a term of 1 to 50 years.'
					: 'Enter an amount above zero, a rate from 0% to 100%, and a monthly payment above zero.'
			};
		}

		let payment: number;
		let months: number;
		if (byTerm) {
			months = years * 12;
			payment = levelPayment(principal, rate, months);
		} else {
			payment = given;
			const firstInterest = principal * r;
			if (payment <= firstInterest) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Time to repay',
					summary: `The first month’s interest is ${money(firstInterest)}, so a payment of ${money(payment)} never repays the loan. Increase the payment.`
				};
			}
			// Solve for n: n = −ln(1 − P·r ÷ M) ÷ ln(1 + r), rounded up to a whole payment.
			const exact = r === 0 ? principal / payment : -Math.log(1 - (principal * r) / payment) / Math.log(1 + r);
			months = Math.ceil(exact - 1e-9);
			if (months > MAX_MONTHS) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Time to repay',
					summary: 'That payment would take more than 100 years to repay the loan. Increase the payment.'
				};
			}
		}

		// Walk the schedule month by month so the table and totals match exactly.
		let bal = principal;
		let totalInterest = 0;
		let lastPayment = 0;
		let yearPaid = 0;
		let yearInterest = 0;
		let yearPrincipal = 0;
		let count = 0;
		const rows: Record<string, string>[] = [];
		while (bal > 0.005 && count < MAX_MONTHS) {
			count++;
			const interest = bal * r;
			const pay = Math.min(payment, bal + interest);
			bal = bal + interest - pay;
			totalInterest += interest;
			lastPayment = pay;
			yearPaid += pay;
			yearInterest += interest;
			yearPrincipal += pay - interest;
			if (count % 12 === 0 || bal <= 0.005) {
				if (bal <= 0.005) bal = 0;
				rows.push({
					year: num(rows.length + 1, 0),
					paid: money(yearPaid),
					principal: money(yearPrincipal),
					interest: money(yearInterest),
					balance: money(bal)
				});
				yearPaid = 0;
				yearInterest = 0;
				yearPrincipal = 0;
			}
		}

		const totalPaid = principal + totalInterest;
		const term = byTerm ? months : count;

		return byTerm
			? {
					primaryResult: money(payment),
					primaryLabel: 'Monthly payment',
					summary: `${money(principal, true)} at ${num(rate, 2)}% repaid over ${plural(years, 'year')} at ${money(payment)} a month.`,
					secondaryMetrics: [
						{ label: 'Total interest', value: money(totalInterest) },
						{ label: 'Total paid', value: money(totalPaid) },
						{ label: 'Number of payments', value: plural(term, 'payment') },
						{ label: 'Final payment', value: money(lastPayment) }
					],
					table: yearlyTable(rows)
				}
			: {
					primaryResult: plural(term, 'month'),
					primaryLabel: 'Time to repay',
					summary: `Paying ${money(payment)} a month repays ${money(principal, true)} at ${num(rate, 2)}% in ${termText(term)}.`,
					secondaryMetrics: [
						{ label: 'Total interest', value: money(totalInterest) },
						{ label: 'Total paid', value: money(totalPaid) },
						{ label: 'Number of payments', value: plural(term, 'payment') },
						{ label: 'Final payment', value: money(lastPayment) }
					],
					table: yearlyTable(rows)
				};
	},
	content: {
		intro:
			'Use this repayment calculator to find your monthly loan repayment for a fixed term, or the time a fixed repayment takes to clear the loan. You also get the total interest and a yearly schedule.',
		howTo: [
			'Enter the amount you are repaying and the annual interest rate.',
			'Pick Payment for a term to find the monthly repayment, then enter the term in years.',
			'Or pick Time for a payment to find how long your monthly repayment takes, then enter the amount.',
			'Read the result, then open the yearly schedule to see principal and interest for each year.',
		],
		about: [
			{
				heading: 'What is a loan repayment?',
				paragraphs: [
					'A repayment is the money you pay back each month on a loan. On a standard repayment loan, each payment covers the interest first and then part of the debt. By the end, the balance is zero.',
					'In the UK and some other countries, “repayment” is also the name for this kind of mortgage. An interest-only loan is different. You pay only the interest and still owe the full amount at the end. This tool is for repayment loans. For a UK home loan, see the [UK mortgage calculator](/uk-mortgage-calculator).',
					'A repayment loan costs more each month than an interest-only loan. However, it is the only kind that clears the debt by itself.',
				]
			},
			{
				heading: 'Payment for a term, or time for a payment',
				paragraphs: [
					'Say you borrow $25,000 at 6.5% for 5 years. The repayment is $489.15 a month, and you pay $4,349.22 in interest.',
					'Now say you can pay a round $500 a month instead. The loan then clears in 59 months, which is 4 years and 11 months. The final payment is only $234.89, and the interest is $4,234.89.',
				]
			},
			{
				heading: 'What changes your total interest',
				paragraphs: [
					'Three things matter most:',
				],
				list: [
					'**The rate.** A higher rate means more interest in every month.',
					'**The term.** A longer loan has smaller payments but costs more in total.',
					'**Extra repayments.** Anything above the required payment cuts the balance sooner, so you pay less interest.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'In Payment for a term mode, the headline is your monthly repayment. Below it you see the total interest, the total paid and the final payment.',
					'In Time for a payment mode, the headline is the number of months. The yearly table shows how the balance falls each year, so you can see when the loan is nearly done.',
					'Both modes use the same schedule, so the totals always match the table.',
				]
			},
			{
				heading: 'Tips for repaying faster',
				paragraphs: [
					'Small steps add up over a few years:',
				],
				list: [
					'Round your payment up to the next convenient number, like the $500 above.',
					'Pay any bonus or windfall straight onto the loan.',
					'See the full picture with the [amortization calculator](/amortization-calculator).',
					'Compare terms with the [loan calculator](/loan-calculator).',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'The result covers principal and interest on a fixed-rate loan. It does not add arrangement fees, insurance or early repayment charges. It also assumes you pay on time every month.',
					'Check your loan agreement for these extras. If your rate can change, your repayment can change with it.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment for a term',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'amount borrowed' },
					{ symbol: 'r', meaning: 'annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payments (years × 12)' }
				]
			},
			{
				title: 'Time to repay a fixed payment',
				expression: 'n = −ln(1 − P × r ÷ M) ÷ ln(1 + r), rounded up',
				variables: [{ symbol: 'ln', meaning: 'natural logarithm' }]
			}
		],
		example: {
			title: 'A $25,000 loan at 6.5% repaid over 5 years',
			steps: [
				'Monthly rate: r = 6.5 ÷ 12 ÷ 100 = 0.0054167',
				'Number of payments: n = 5 × 12 = 60',
				'M = 25,000 × 0.0054167 × 1.3828 ÷ (1.3828 − 1) ≈ $489.15',
				'Total paid: 489.15 × 60 = $29,349.22, so interest = $4,349.22'
			],
			result: 'Monthly payment of $489.15, with $4,349.22 of interest over 5 years.'
		},
		faq: [
			{
				q: 'How do I calculate loan repayments?',
				a: 'Use the amount borrowed, the monthly interest rate and the number of payments in the formula above. The calculator does this for you when you choose Payment for a term.'
			},
			{
				q: 'What is the difference between a fixed term and a fixed payment?',
				a: 'A fixed term sets the length of the loan and works out the payment. A fixed payment sets the amount you can afford and works out how long the repayment takes.'
			},
			{
				q: 'Why does the last payment differ?',
				a: 'The final payment is the balance left plus that month’s interest. With a fixed payment, it is usually smaller than the rest, because it clears whatever remains.'
			},
			{
				q: 'What if my repayment is too low?',
				a: 'If the payment does not cover the first month’s interest, the balance grows and the loan is never repaid. The calculator then shows a dash. Increase the payment to continue.'
			},
			{
				q: 'Is a repayment the same as an EMI?',
				a: 'Yes, for a standard fixed-rate loan. EMI (equated monthly instalment) is the usual term in India and South Asia. Try the [EMI calculator](/emi-calculator) for that format.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'MoneyHelper (UK Government-backed service)', url: 'https://www.moneyhelper.org.uk/' },
		],
		disclaimer:
			'Estimates only. Your lender’s schedule, fees and rounding rules set the actual payments. Check your loan agreement before you borrow.'
	}
});

/** Yearly schedule shown under both modes. */
function yearlyTable(rows: Record<string, string>[]) {
	return {
		title: 'Yearly schedule',
		collapsed: true,
		columns: [
			{ key: 'year', label: 'Year', align: 'start' as const },
			{ key: 'paid', label: 'Paid', align: 'end' as const },
			{ key: 'principal', label: 'Principal', align: 'end' as const },
			{ key: 'interest', label: 'Interest', align: 'end' as const },
			{ key: 'balance', label: 'Balance', align: 'end' as const }
		],
		rows
	};
}
