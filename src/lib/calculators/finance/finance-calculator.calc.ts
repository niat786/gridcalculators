import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './finance-calculator.meta';

const SOLVE_OPTIONS = [
	{ label: 'Future value (FV)', value: 'fv' },
	{ label: 'Present value (PV)', value: 'pv' },
	{ label: 'Payment (PMT)', value: 'pmt' },
	{ label: 'Number of periods (N)', value: 'n' },
	{ label: 'Interest rate (I/Y)', value: 'iy' }
];

const PER_YEAR = [
	{ label: 'Annually (1)', value: '1' },
	{ label: 'Semiannually (2)', value: '2' },
	{ label: 'Quarterly (4)', value: '4' },
	{ label: 'Monthly (12)', value: '12' },
	{ label: 'Biweekly (26)', value: '26' },
	{ label: 'Weekly (52)', value: '52' },
	{ label: 'Daily (365)', value: '365' }
];

const SOLVES = ['fv', 'pv', 'pmt', 'n', 'iy'];

const TIMING = [
	{ label: 'End', value: 'end' },
	{ label: 'Beginning', value: 'beginning' }
];

const LABEL: Record<string, string> = {
	fv: 'Future value (FV)',
	pv: 'Present value (PV)',
	pmt: 'Payment (PMT)',
	n: 'Periods (N)',
	iy: 'Interest rate (I/Y)'
};

/** (1 + i)ⁿ, computed in a way that stays accurate for very small rates. */
const growth = (i: number, n: number) => Math.exp(n * Math.log1p(i));

/** The annuity factor: ((1 + i)ⁿ − 1) ÷ i, times (1 + i) for payments at the beginning. */
function annuityFactor(i: number, n: number, beginning: boolean): number {
	if (i === 0) return n;
	const gm1 = Math.expm1(n * Math.log1p(i));
	return (gm1 / i) * (beginning ? 1 + i : 1);
}

/** Left side of the TVM equation. It equals zero when the five values agree. */
function residual(i: number, n: number, beginning: boolean, pv: number, pmt: number, fv: number): number {
	return pv * growth(i, n) + pmt * annuityFactor(i, n, beginning) + fv;
}

/** Solve for the per-period rate by bisection. Returns NaN when no sign change is found. */
function solveRate(n: number, beginning: boolean, pv: number, pmt: number, fv: number): number {
	let lo = -0.99;
	// Keep (1 + hi)ⁿ finite so large N never overflows.
	let hi = Math.min(1, Math.pow(10, 300 / n) - 1);
	let flo = residual(lo, n, beginning, pv, pmt, fv);
	const fhi = residual(hi, n, beginning, pv, pmt, fv);
	if (!Number.isFinite(flo) || !Number.isFinite(fhi) || Math.sign(flo) === Math.sign(fhi)) return NaN;
	for (let k = 0; k < 300; k++) {
		const mid = (lo + hi) / 2;
		const fm = residual(mid, n, beginning, pv, pmt, fv);
		if (fm === 0) return mid;
		if (Math.sign(fm) === Math.sign(flo)) {
			lo = mid;
			flo = fm;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

/**
 * Time-value-of-money solver. Cash-flow signs: money you receive is positive, money you pay
 * out is negative. Every solved value satisfies
 *   PV × (1 + i)ⁿ + PMT × A + FV = 0,   where A = ((1 + i)ⁿ − 1) ÷ i × (1 + i × t)
 * with i = I/Y ÷ P/Y, n = N, and t = 1 for beginning-of-period payments, otherwise 0.
 */
export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			display: 'menu',
			default: 'fv',
			options: SOLVE_OPTIONS,
			help: 'The one value to calculate. The others are the inputs.'
		},
		{
			id: 'n',
			label: 'Number of periods (N)',
			type: 'number',
			default: 120,
			min: 0.01,
			max: 10_000,
			step: 1,
			help: 'Total payment periods, not years.',
			visibleWhen: (v) => v.solve !== 'n'
		},
		{
			id: 'iy',
			label: 'Interest rate per year (I/Y)',
			type: 'number',
			default: 6,
			min: 0,
			max: 1000,
			step: 0.01,
			suffix: '%',
			visibleWhen: (v) => v.solve !== 'iy'
		},
		{
			id: 'pv',
			label: 'Present value (PV)',
			type: 'number',
			default: -1000,
			min: -1_000_000_000,
			max: 1_000_000_000,
			step: 100,
			prefix: '$',
			help: 'Money now. Use a minus sign if you pay it out.',
			visibleWhen: (v) => v.solve !== 'pv'
		},
		{
			id: 'pmt',
			label: 'Payment per period (PMT)',
			type: 'number',
			default: -100,
			min: -1_000_000_000,
			max: 1_000_000_000,
			step: 10,
			prefix: '$',
			help: 'Regular payment. Minus if you pay it, plus if you receive it.',
			visibleWhen: (v) => v.solve !== 'pmt'
		},
		{
			id: 'fv',
			label: 'Future value (FV)',
			type: 'number',
			default: 20000,
			min: -1_000_000_000,
			max: 1_000_000_000,
			step: 100,
			prefix: '$',
			help: 'Money at the end. Plus if you receive it, minus if you pay it.',
			visibleWhen: (v) => v.solve !== 'fv'
		},
		{ id: 'py', label: 'Payments per year (P/Y)', type: 'select', display: 'menu', default: '12', options: PER_YEAR, help: 'Compounding is set equal to payments per year (C/Y).' },
		{ id: 'timing', label: 'Payment timing', type: 'select', display: 'segmented', default: 'end', options: TIMING }
	],
	calculate(v: InputValues): CalculationResult {
		const solve = String(v.solve);
		const beginning = v.timing === 'beginning';
		const periodsPerYear = Number(v.py);
		const invalid = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: LABEL[solve] ?? 'Result',
			summary
		});

		if (!SOLVES.includes(solve) || !PER_YEAR.some((o) => o.value === String(v.py)) || (v.timing !== 'end' && !beginning)) {
			return invalid('Check the solve-for choice, payments per year and timing.');
		}

		const nIn = Number(v.n);
		const iyIn = Number(v.iy);
		const pvIn = Number(v.pv);
		const pmtIn = Number(v.pmt);
		const fvIn = Number(v.fv);

		if (
			(solve !== 'n' && !(nIn > 0 && nIn <= 10_000)) ||
			(solve !== 'iy' && !(iyIn >= 0 && iyIn <= 1000)) ||
			(solve !== 'pv' && !Number.isFinite(pvIn)) ||
			(solve !== 'pmt' && !Number.isFinite(pmtIn)) ||
			(solve !== 'fv' && !Number.isFinite(fvIn))
		) {
			return invalid('Fill in the other values. N must be above zero, and the rate must be from 0 to 1,000%.');
		}

		const i = iyIn / 100 / periodsPerYear;
		const n = nIn;
		let answer = NaN;
		let periods = n;
		let rate = i;

		switch (solve) {
			case 'fv':
				answer = -(pvIn * growth(i, n) + pmtIn * annuityFactor(i, n, beginning));
				break;
			case 'pv':
				answer = -(pmtIn * annuityFactor(i, n, beginning) + fvIn) / growth(i, n);
				break;
			case 'pmt':
				answer = -(pvIn * growth(i, n) + fvIn) / annuityFactor(i, n, beginning);
				break;
			case 'n': {
				const t = beginning ? 1 : 0;
				if (i === 0) {
					periods = pmtIn === 0 ? NaN : -(pvIn + fvIn) / pmtIn;
				} else {
					const c = (pmtIn * (1 + i * t)) / i;
					const denom = pvIn + c;
					const S = denom === 0 ? NaN : (c - fvIn) / denom;
					periods = S > 0 ? Math.log(S) / Math.log1p(i) : NaN;
				}
				answer = periods;
				break;
			}
			case 'iy': {
				rate = solveRate(n, beginning, pvIn, pmtIn, fvIn);
				answer = rate * periodsPerYear * 100;
				break;
			}
		}

		if (!Number.isFinite(answer) || (solve === 'n' && !(periods > 0))) {
			return invalid('No answer for these values. Check the signs: money in and money out must point in opposite directions.');
		}

		const finalN = solve === 'n' ? periods : n;
		const finalRate = solve === 'iy' ? rate : i;
		const shown =
			solve === 'n' ? `${num(periods, 2, 2)} periods` : solve === 'iy' ? `${num(answer, 4)}%` : money(answer);

		return {
			primaryResult: shown,
			primaryLabel: LABEL[solve],
			summary: `Solved with ${plural(periodsPerYear, 'payment')} a year, ${beginning ? 'at the beginning' : 'at the end'} of each period.`,
			secondaryMetrics: [
				{ label: 'Rate per period', value: `${num(finalRate * 100, 4, 4)}%` },
				{ label: 'Periods (N)', value: num(finalN, 2, 2) },
				{ label: 'Years (N ÷ P/Y)', value: num(finalN / periodsPerYear, 2, 2) }
			]
		};
	},
	content: {
		intro:
			'Use this finance calculator to solve the time value of money. Pick one value to find: future value, present value, payment, number of periods or interest rate. Then fill in the other four.',
		howTo: [
			'Choose what to solve for from the “Solve for” menu.',
			'Fill in the other fields. Use a minus sign for money you pay out and a plus sign for money you receive.',
			'Set the payments per year and whether payments are made at the end or the beginning of each period.',
			'Read the answer, along with the rate per period and the number of years.'
		],
		about: [
			{
				heading: 'What is the time value of money?',
				paragraphs: [
					'Money today is worth more than the same amount later, because today’s money can earn interest. As a result, the time value of money links five values: the present value, the future value, regular payments, the number of periods and the interest rate.',
					'If you know any four, you can find the fifth. That is what this calculator does, and it works for loans, savings plans, leases and investments.'
				]
			},
			{
				heading: 'The five values',
				paragraphs: ['Each field has a clear meaning:'],
				list: [
					'**N, the number of periods.** The total number of payment periods, not years. A 30-year monthly loan has 360.',
					'**I/Y, the interest rate per year.** The yearly rate as a percentage. The tool divides it by the payments per year.',
					'**PV, the present value.** The amount at the start. For a loan, it is the amount you receive.',
					'**PMT, the payment.** The regular amount paid or received each period.',
					'**FV, the future value.** The amount at the end, such as a balance you want to reach, or a balloon payment on a loan.'
				]
			},
			{
				heading: 'How the signs work',
				paragraphs: [
					'Money you receive is positive, and money you pay out is negative. This is how financial calculators work. Also, the five values must balance, so if you put money in as a payment, you should get money out as a future value.',
					'If the tool says there is no answer, check the signs first. For example, for a loan of $200,000, enter +200,000 as the present value and the answer for the payment will be negative.'
				]
			},
			{
				heading: 'Examples of each mode',
				paragraphs: [
					'The table shows a worked case for every “solve for” choice. All use monthly payments at the end of each period, unless stated.'
				],
				table: {
					caption: 'One example for each choice',
					columns: ['Solve for', 'Inputs', 'Answer'],
					rows: [
						['Payment', 'PV $200,000, FV $0, 360 periods, 6%', '−$1,199.10'],
						['Future value', 'PV −$1,000, PMT −$100, 120 periods, 6%', '$18,207.33'],
						['Present value', 'PMT −$200, FV $50,000, 120 periods, 6%', '−$9,466.95'],
						['Number of periods', 'PV $0, PMT −$100, FV $20,000, 6%', '138.98 periods'],
						['Interest rate', 'PV −$5,000, FV $10,000, 10 yearly periods', '7.1773%']
					]
				}
			},
			{
				heading: 'End or beginning of the period',
				paragraphs: [
					'Loan payments and most deposits are made at the end of each period. Rent and some leases are paid at the beginning. However, a payment at the beginning earns or costs one extra period of interest.',
					'On the $200,000 loan above, paying at the beginning of each month lowers the payment from $1,199.10 to $1,193.14.'
				]
			},
			{
				heading: 'More specific tools',
				paragraphs: [
					'If you only need one type of answer, a focused tool is simpler, so try the [future value calculator](/future-value-calculator), the [present value calculator](/present-value-calculator), the [loan calculator](/loan-calculator) or the [interest rate calculator](/interest-rate-calculator). To see the growth of savings with a yearly rate, use the [compound interest calculator](/compound-interest-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'The time value of money equation',
				expression: 'PV × (1 + i)ⁿ + PMT × A + FV = 0',
				variables: [
					{ symbol: 'i', meaning: 'rate per period (I/Y ÷ 100 ÷ payments per year)' },
					{ symbol: 'n', meaning: 'number of periods (N)' },
					{ symbol: 'A', meaning: 'annuity factor: ((1 + i)ⁿ − 1) ÷ i, multiplied by (1 + i) for payments at the beginning' }
				]
			},
			{
				title: 'Solving for the payment',
				expression: 'PMT = −(PV × (1 + i)ⁿ + FV) ÷ A',
				variables: [{ symbol: 'PMT', meaning: 'the regular payment. The other values are solved from the same equation.' }]
			}
		],
		example: {
			title: 'A $200,000 loan at 6% a year, repaid monthly over 30 years',
			steps: [
				'Per-month rate: i = 6 ÷ 12 ÷ 100 = 0.005, with N = 30 × 12 = 360 payments',
				'Growth factor: 1.005³⁶⁰ ≈ 6.022575',
				'Annuity factor: (6.022575 − 1) ÷ 0.005 ≈ 1,004.515',
				'Payment: PMT = −(PV × 6.022575 + FV × 0) ÷ 1,004.515 = −($200,000 × 6.022575) ÷ 1,004.515 ≈ −$1,199.10'
			],
			result: 'The monthly payment is about $1,199.10. It is negative because you pay it out, and the loan is positive because you receive it.'
		},
		faq: [
			{
				q: 'What is a finance calculator used for?',
				a: 'It solves time value of money problems, such as the payment on a loan, the future value of savings, or the rate you earn. You enter four of the five values and it finds the fifth.'
			},
			{
				q: 'Why is my answer negative?',
				a: 'The signs show the direction of cash. A negative number is money you pay out. A positive number is money you receive. The answer is not an error.'
			},
			{
				q: 'What does “no answer for these values” mean?',
				a: 'The five values cannot balance with the signs you entered. For example, if every value is money you pay out, nothing ever comes back. Flip the sign of one value and try again.'
			},
			{
				q: 'What is the difference between N and years?',
				a: 'N is the number of payment periods. If you pay monthly for 10 years, N is 120. The tool also shows years, which is N divided by the payments per year.'
			},
			{
				q: 'Is the interest compounded?',
				a: 'Yes. The compounding matches the payments per year. A monthly payment plan compounds monthly.'
			},
			{
				q: 'Can I use this for a mortgage or car loan?',
				a: 'Yes, for loans with equal payments and a fixed rate. It does not include taxes, insurance or fees, so your lender’s figure may be higher.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' }
		],
		disclaimer:
			'Estimates only. Real loans and accounts may charge fees or use different compounding. Investment returns are not guaranteed, and this tool is not financial advice.'
	}
});
