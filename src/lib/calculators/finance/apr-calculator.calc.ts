import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num } from '../format';
import meta from './apr-calculator.meta';

const MAX_MONTHS = 600;

/** Fixed-rate payment on the stated rate: M = P·r(1 + r)^n / ((1 + r)^n − 1); r = 0 → P / n. */
function payment(principal: number, annualPct: number, n: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / n;
	const f = Math.pow(1 + r, n);
	return (principal * r * f) / (f - 1);
}

/** Present value of n equal payments discounted at the periodic rate j. */
function presentValue(pay: number, j: number, n: number): number {
	return j === 0 ? pay * n : (pay * (1 - Math.pow(1 + j, -n))) / j;
}

/**
 * The annual rate (as a decimal) at which the payments are worth `received` today.
 * Bisection on 0 to 1000% a year until the bracket is narrower than 1e-10.
 * Returns null when the answer would be above 1000%.
 */
function realRate(pay: number, n: number, received: number): number | null {
	const pvAt = (a: number) => presentValue(pay, a / 12, n);
	let lo = 0;
	let hi = 10;
	if (pvAt(hi) > received) return null;
	while (hi - lo > 1e-10) {
		const mid = (lo + hi) / 2;
		if (pvAt(mid) > received) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Loan amount', type: 'number', default: 20000, min: 1, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'rate',
			label: 'Stated interest rate',
			type: 'number',
			default: 7,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'The rate written in the loan agreement'
		},
		{ id: 'months', label: 'Term (months)', type: 'number', default: 60, min: 1, max: MAX_MONTHS, step: 1, suffix: 'months', decimal: false },
		{
			id: 'fees',
			label: 'Upfront fees',
			type: 'number',
			default: 500,
			min: 0,
			max: 100_000_000,
			step: 10,
			prefix: '$',
			help: 'Origination, processing and similar fees'
		},
		{
			id: 'feeMode',
			label: 'How fees are paid',
			type: 'select',
			display: 'segmented',
			default: 'deducted',
			options: [
				{ label: 'Deducted from loan', value: 'deducted' },
				{ label: 'Paid upfront', value: 'upfront' }
			]
		}
	],
	calculate(v): CalculationResult {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const months = Number(v.months);
		const fees = Number(v.fees);
		const upfront = String(v.feeMode) === 'upfront';

		if (
			!(amount > 0) ||
			!Number.isFinite(amount) ||
			!(rate >= 0 && rate <= 100) ||
			!Number.isInteger(months) ||
			months < 1 ||
			months > MAX_MONTHS ||
			!(fees >= 0) ||
			fees >= amount
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Real APR',
				summary: 'Enter a loan amount, a rate from 0% to 100%, a term of 1 to 600 months, and fees below the loan amount.'
			};
		}

		// The payment follows the stated rate. The APR is the rate that makes the payments worth
		// what you actually keep on day one: the loan amount less the fees, in either fee mode.
		const pay = payment(amount, rate, months);
		const totalPaid = pay * months;
		const received = amount - fees;
		const annual = realRate(pay, months, received);
		if (annual === null) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Real APR',
				summary: 'The real rate would be above 1,000% a year. Check the fees and the term.'
			};
		}

		const apr = annual * 100;
		const totalCost = totalPaid - amount + fees;

		return {
			primaryResult: `${num(apr, 2, 2)}%`,
			primaryLabel: 'Real APR',
			summary:
				fees > 0
					? `A ${num(rate, 2)}% stated rate becomes ${num(apr, 2, 2)}% once ${money(fees)} in fees is counted.`
					: `With no fees, the real APR matches the ${num(rate, 2)}% stated rate.`,
			secondaryMetrics: [
				{ label: 'Monthly payment', value: money(pay) },
				{ label: 'Total fees', value: money(fees) },
				{ label: 'Cash you receive', value: money(upfront ? amount : received) },
				{ label: 'Paid at closing', value: money(upfront ? fees : 0) },
				{ label: 'Total of payments', value: money(totalPaid) },
				{ label: 'Total cost', value: money(totalCost) }
			]
		};
	},
	content: {
		intro:
			'Use this APR calculator to find the real yearly cost of a loan once fees are counted. Enter the stated rate, the term and the upfront fees, and see the APR you actually pay.',
		howTo: [
			'Enter the loan amount and the stated interest rate from your loan agreement.',
			'Enter the term in months and the total upfront fees.',
			'Choose whether the fees come out of the loan or you pay them upfront. The APR is the same either way.',
			'Read the real APR, then compare it with the stated rate and with other offers.',
		],
		about: [
			{
				heading: 'What is APR?',
				paragraphs: [
					'APR stands for annual percentage rate. It is the yearly cost of a loan, shown as a percentage. Unlike the plain interest rate, APR also counts most upfront fees.',
					'That makes APR a better way to compare loans. Two lenders can quote the same interest rate and still charge very different fees.',
				]
			},
			{
				heading: 'How fees raise the real rate',
				paragraphs: [
					'Fees mean you receive less money than you repay. For example, on a $20,000 loan with a $500 fee, you keep $19,500 but still pay back the payments on $20,000. So you borrow $19,500 at a higher rate than the one on paper.',
					'This calculator finds the rate that makes your monthly payments worth exactly the cash you keep. It reports that rate as a yearly figure, 12 times the monthly rate. In the default example, a 7% stated rate becomes an APR of 8.07%.',
				]
			},
			{
				heading: 'Why the term matters',
				paragraphs: [
					'A fixed fee hurts more on a short loan. You pay the same $500 fee, but you have fewer months to spread it over. The table uses a $20,000 loan at 7% with a $500 fee.',
				],
				table: {
					caption: 'A $20,000 loan at a 7% stated rate with $500 in fees',
					columns: ['Loan term', 'Real APR'],
					rows: [
						['24 months', '9.51%'],
						['60 months', '8.07%'],
						['120 months', '7.57%'],
					]
				}
			},
			{
				heading: 'Tips for comparing loan offers',
				paragraphs: [
					'Use APR as one tool, not the only one:',
				],
				list: [
					'**Compare APR to APR.** Use the same loan amount and term for each offer.',
					'**Look at the total cost too.** A low APR on a long loan can still cost more in total than a higher APR on a short one.',
					'**Ask for every fee in writing.** Origination, processing and documentation fees all matter.',
					'**Check the payment.** See the monthly amount with the [loan calculator](/loan-calculator), and the cost of a personal loan with the [personal loan calculator](/personal-loan-calculator).',
				]
			},
			{
				heading: 'APR in different countries',
				paragraphs: [
					'Many countries make lenders show a yearly total-cost rate. It may be called APR, effective rate or comparison rate. The rules about which fees count are not the same everywhere.',
					'Some places also quote an effective annual rate (EAR), which compounds the monthly rate. That figure is a little higher than the yearly total of 12 monthly rates used here. If you only want the rate hidden in a loan, the [interest rate calculator](/interest-rate-calculator) can help.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes a fixed rate and equal monthly payments. It also treats all the fees you enter as part of the cost. Lenders may exclude some charges from their official APR, so your lender’s figure can differ.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The big number is the real APR. Compare it with the stated rate. The gap between them is the effect of your fees.',
					'Below it you see the monthly payment, the cash you receive and the total cost. Total cost is all interest plus the fees. In the default case, that is $4,261.44.',
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payment, from the stated rate',
				expression: 'M = P × r(1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [
					{ symbol: 'M', meaning: 'monthly payment' },
					{ symbol: 'P', meaning: 'loan amount' },
					{ symbol: 'r', meaning: 'stated annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payments' }
				]
			},
			{
				title: 'Cash you keep on day one',
				expression: 'Net = P − F',
				variables: [{ symbol: 'F', meaning: 'total upfront fees' }]
			},
			{
				title: 'Real APR',
				expression: 'Net = M × (1 − (1 + i)⁻ⁿ) ÷ i, solved for i by bisection.   APR = 12 × i × 100%',
				variables: [{ symbol: 'i', meaning: 'monthly rate that makes the payments worth the net amount' }]
			}
		],
		example: {
			title: 'A $20,000 loan at 7% for 60 months with a $500 fee',
			steps: [
				'Monthly payment on the stated rate: M = $396.02',
				'Cash you keep: 20,000 − 500 = $19,500',
				'Solve 396.024 × (1 − (1 + i)⁻⁶⁰) ÷ i = 19,500, which gives i ≈ 0.67233% a month',
				'Real APR = 12 × 0.67233% = 8.07%',
				'Total of payments: 396.024 × 60 = $23,761.44. Total cost: 23,761.44 − 20,000 + 500 = $4,261.44'
			],
			result: 'Real APR of 8.07% against a stated 7%. Total cost of $4,261.44, including the $500 fee.'
		},
		faq: [
			{
				q: 'What is the difference between the interest rate and APR?',
				a: 'The interest rate is the yearly cost of the money you borrow. APR adds most upfront fees, so it is usually higher. If there are no fees, the two are the same.'
			},
			{
				q: 'How do I calculate APR with fees?',
				a: 'Find the rate at which your monthly payments are worth the amount you keep, which is the loan minus the fees. This calculator solves that for you.'
			},
			{
				q: 'Does it matter if fees are deducted or paid upfront?',
				a: 'No. In both cases you end up with the loan amount less the fees in hand, so the real APR is the same.'
			},
			{
				q: 'Why is the APR higher on a shorter loan?',
				a: 'The fee is spread over fewer months, so it adds more to the yearly rate. A $500 fee adds about 1.07 points on a 5-year loan but about 2.51 points on a 2-year loan.'
			},
			{
				q: 'Is a lower APR always better?',
				a: 'For the same amount and term, yes. But a longer term can lower the APR and still raise the total interest. Compare the total cost as well.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: Regulation Z, section 1026.22 (annual percentage rate)', url: 'https://www.consumerfinance.gov/rules-policy/regulations/1026/22/' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. Your lender’s official APR may count fees differently. Check your loan agreement for the figure that applies.'
	}
});
