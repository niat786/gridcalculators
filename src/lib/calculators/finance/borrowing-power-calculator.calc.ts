import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './borrowing-power-calculator.meta';
import {
	APRA_BUFFER_SOURCE,
	AU_TAX_YEAR,
	ATO_CUTS_SOURCE,
	ATO_RATES_SOURCE,
	SERVICEABILITY_BUFFER,
	helpRepayment,
	medicareLevy,
	residentTax
} from '../data/au-tax-2026-27';

/** Assumption (common lender practice, not a legal rule): 3.8% of each credit card limit counts as a monthly commitment. */
export const CARD_COMMITMENT_RATE = 0.038;

/** Yearly take-home pay for a resident: income tax after LITO, Medicare levy, and HELP if selected. */
export function netIncome(gross: number, hasHelp: boolean): number {
	return gross - residentTax(gross) - medicareLevy(gross) - (hasHelp ? helpRepayment(gross) : 0);
}

/** Present value of `payment` a month over `months` at an annual rate (percent). */
export function loanFromPayment(payment: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 100 / 12;
	if (r === 0) return payment * months;
	return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

export function paymentFor(loan: number, annualRatePct: number, months: number): number {
	const r = annualRatePct / 100 / 12;
	if (r === 0) return loan / months;
	return (loan * r) / (1 - Math.pow(1 + r, -months));
}

/** Content is written once at build time, so format dollars explicitly (A$100,000). */
const aud = (n: number) => moneyIn('AUD', n, true);
/** Maximum loan for a single borrower, no dependants or debts, 30 years, as in the default case in the text. */
function sampleLoan(opts: { income?: number; income2?: number; rate?: number; cards?: number } = {}): number {
	const income = opts.income ?? 100_000;
	const net = netIncome(income, false) + (opts.income2 ? netIncome(opts.income2, false) : 0);
	const spare = net / 12 - 3_000 - (opts.cards ?? 0) * CARD_COMMITMENT_RATE;
	return spare > 0 ? loanFromPayment(spare, (opts.rate ?? 6) + SERVICEABILITY_BUFFER, 360) : 0;
}
function caseRows(): string[][] {
	return [
		['Default case, 6% rate', aud(sampleLoan())],
		['Rate of 5%', aud(sampleLoan({ rate: 5 }))],
		['Rate of 7%', aud(sampleLoan({ rate: 7 }))],
		['A$10,000 of credit card limits', aud(sampleLoan({ cards: 10_000 }))],
		['Partner earning A$80,000', aud(sampleLoan({ income2: 80_000 }))]
	];
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income1', label: 'Your income (before tax)', type: 'number', default: 100000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr' },
		{ id: 'help1', label: 'You have a HELP / HECS debt', type: 'toggle', default: false },
		{ id: 'income2', label: 'Partner or co-borrower income', type: 'number', default: 0, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr' },
		{ id: 'help2', label: 'They have a HELP / HECS debt', type: 'toggle', default: false, visibleWhen: (v) => Number(v.income2) > 0 },
		{ id: 'dependants', label: 'Dependants', type: 'number', default: 0, min: 0, max: 10, step: 1, decimal: false },
		{ id: 'expenses', label: 'Living expenses', type: 'number', default: 3000, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/mo', help: 'Everyday costs: food, utilities, transport, insurance, entertainment. Not debts.' },
		{ id: 'perDependant', label: 'Extra cost per dependant', type: 'number', default: 400, min: 0, max: 100_000, step: 50, prefix: '$', suffix: '/mo', visibleWhen: (v) => Number(v.dependants) > 0, help: 'An assumption. Lenders use their own benchmarks.' },
		{ id: 'debts', label: 'Existing loan repayments', type: 'number', default: 0, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo', help: 'Car loans, personal loans, buy-now-pay-later and other debts.' },
		{ id: 'cards', label: 'Credit card limits (total)', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', help: 'Counted at 3.8% of the limit a month, used or not.' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6, min: 0, max: 25, step: 0.05, suffix: '%', help: 'The loan\'s advertised rate. The buffer is added for you.' },
		{ id: 'term', label: 'Loan term', type: 'number', default: 30, min: 1, max: 40, step: 1, decimal: false, suffix: 'years' }
	],
	calculate(v): CalculationResult {
		const income1 = Number(v.income1);
		const income2 = Number(v.income2) || 0;
		const deps = Number(v.dependants) || 0;
		const exp = Number(v.expenses);
		const perDep = Number(v.perDependant) || 0;
		const debts = Number(v.debts) || 0;
		const cards = Number(v.cards) || 0;
		const rate = Number(v.rate);
		const term = Number(v.term);
		if (
			![income1, income2, exp, rate, term, deps, perDep, debts, cards].every(Number.isFinite) ||
			!(income1 > 0) || income2 < 0 || exp < 0 || deps < 0 || debts < 0 || cards < 0 || perDep < 0 ||
			!(rate >= 0 && rate <= 50) || !(term >= 1 && term <= 50)
		) {
			return { primaryResult: DASH, primaryLabel: 'Estimated maximum loan', summary: 'Enter your income, expenses, interest rate and loan term.' };
		}
		const netAnnual = netIncome(income1, v.help1 === true) + (income2 > 0 ? netIncome(income2, v.help2 === true) : 0);
		const netMonthly = netAnnual / 12;
		const living = exp + deps * perDep;
		const cardCommit = cards * CARD_COMMITMENT_RATE;
		const commitments = debts + cardCommit;
		const surplus = netMonthly - living - commitments;
		const assessed = rate + SERVICEABILITY_BUFFER;
		const months = term * 12;
		const maxLoan = surplus > 0 ? loanFromPayment(surplus, assessed, months) : 0;
		const actualPayment = maxLoan > 0 ? paymentFor(maxLoan, rate, months) : 0;
		return {
			primaryResult: money(maxLoan, true),
			primaryLabel: 'Estimated maximum loan',
			summary:
				surplus > 0
					? `Assessed at ${pct(assessed, 2)} (your ${pct(rate, 2)} plus a ${SERVICEABILITY_BUFFER}% buffer), you could service about ${money(surplus)} a month. Lenders differ, so treat this as a rough guide.`
					: 'Your expenses and commitments use up your take-home pay at the assessed rate, so this method gives no borrowing capacity.',
			secondaryMetrics: [
				{ label: 'Take-home income', value: `${money(netMonthly)}/mo` },
				{ label: 'Living expenses', value: `${money(living)}/mo` },
				{ label: 'Debt and card commitments', value: `${money(commitments)}/mo` },
				{ label: 'Spare for repayments', value: `${money(Math.max(0, surplus))}/mo` },
				{ label: 'Assessment rate', value: pct(assessed, 2) },
				{ label: `Repayment at ${num(rate, 2)}%`, value: `${money(actualPayment)}/mo` }
			]
		};
	},
	content: {
		intro: `Estimate how much you could borrow for a home in Australia with this borrowing power calculator. It takes your take-home pay, subtracts your expenses and debts, and sizes a loan at your rate plus the ${SERVICEABILITY_BUFFER}% serviceability buffer APRA expects lenders to use.`,
		howTo: [
			'Enter your income, and a partner\'s if you are borrowing together. Tick HELP if either of you has a study debt.',
			'Add monthly living expenses, dependants, existing loan repayments and your total credit card limits.',
			`Enter the interest rate and term. The result is the loan your spare cash could repay at the rate plus ${SERVICEABILITY_BUFFER}%.`,
			'Read the estimated maximum loan and the repayment at your actual rate.'
		],
		about: [
			{
				heading: 'What is borrowing power?',
				paragraphs: [
					'Borrowing power, or borrowing capacity, is the most a lender may be willing to lend you. It is not a single number. Each lender uses its own rules, and the result also depends on your income, spending and debts.',
					'Lenders mainly ask one question: could you still make the repayments if rates rose? That is called serviceability. This calculator answers it in a simple way, so you get a rough idea before you talk to a lender.',
					'A bigger loan is not always a better one. Use the result as a ceiling, then choose a repayment that suits your budget.'
				]
			},
			{
				heading: 'How this estimate works',
				paragraphs: [
					`First, the calculator works out your take-home pay for ${AU_TAX_YEAR}. It uses resident income tax rates, the low income tax offset, the Medicare levy and any HELP repayment. For a closer look at that step, see the [Australia pay calculator](/australia-pay-calculator).`,
					`Next, it subtracts your living expenses, an allowance for each dependant, your loan repayments and ${pct(CARD_COMMITMENT_RATE * 100, 1)} of every credit card limit each month. The card figure counts even if you do not use the card. What is left is the spare cash for a mortgage.`,
					`Finally, it asks what loan that spare cash could repay at your rate plus ${SERVICEABILITY_BUFFER} percentage points, over your loan term. That loan is your estimated maximum.`
				]
			},
			{
				heading: `The ${SERVICEABILITY_BUFFER}% serviceability buffer`,
				paragraphs: [
					`APRA, the banking regulator, tells lenders to test loans with a buffer of at least ${SERVICEABILITY_BUFFER}.0 percentage points over the loan interest rate. So a 6% loan is assessed at 9%.`,
					'The buffer makes the loan you qualify for smaller. It also protects you if rates rise. Your real repayment uses your actual rate, which is lower, and the tool shows both.'
				]
			},
			{
				heading: 'What changes your borrowing power?',
				paragraphs: [
					'Small changes in rates, debts and income move the result a lot. The table starts from the default case (A$100,000 income, A$3,000 monthly expenses, a 30-year loan) and changes one thing at a time.',
					'Notice how much a credit card limit costs you, even when you never use it. Closing a card you do not need can help.'
				],
				table: { caption: 'Estimated maximum loan', columns: ['Case', 'Maximum loan'], rows: caseRows() }
			},
			{
				heading: 'Tips, and what this tool does not cover',
				paragraphs: ['A few steps can improve your position before you apply:'],
				list: [
					'**Pay down debts and cut card limits.** Both lift your spare cash.',
					'**Track your spending.** Lenders look at real expenses, not guesses.',
					'**Plan the extra costs.** Stamp duty is a big one. Try the [Australia stamp duty calculator](/australia-stamp-duty-calculator).',
					'**Think about a HELP debt.** Repayments lower your take-home pay. See the [HECS-HELP calculator](/hecs-help-calculator).'
				]
			},
			{
				heading: 'Why your bank may give a different figure',
				paragraphs: [
					'Lenders use their own expense benchmarks, rate floors, income shading, debt-to-income limits and credit card rules. The 3.8% card rate and the dependant cost here are common assumptions, not rules.',
					'Credit history, job type and the size of your deposit matter too. Talk to a lender or broker for a real assessment.'
				]
			}
		],
		formulas: [
			{
				title: 'Method',
				expression: `Spare = take-home − expenses − dependants − debts − ${pct(CARD_COMMITMENT_RATE * 100, 1)} × card limits;  Loan = Spare × (1 − (1 + i)⁻ⁿ) ÷ i`,
				variables: [
					{ symbol: 'i', meaning: `(interest rate + ${SERVICEABILITY_BUFFER}%) ÷ 12, the assessment rate per month` },
					{ symbol: 'n', meaning: 'number of monthly repayments (term × 12)' },
					{ symbol: 'take-home', meaning: `${AU_TAX_YEAR} resident income tax after the low income offset, Medicare levy and HELP repayment` }
				]
			}
		],
		example: {
			title: 'Income $100,000, expenses $3,000 a month, 6% for 30 years',
			steps: [
				'Take-home: $100,000 − $20,520 tax − $2,000 Medicare = $77,480 a year, or $6,456.67 a month',
				'Spare after $3,000 of expenses: $3,456.67 a month',
				'Assessed at 6% + 3% = 9% over 360 months, that repayment supports a loan of about $429,601'
			],
			result: '$429,601'
		},
		faq: [
			{
				q: 'How much can I borrow on a $100,000 salary in Australia?',
				a: `With ${aud(3_000)} a month of expenses, no debts and a 6% rate over 30 years, this estimate is about ${aud(429_601)}. Lenders may differ, so use it as a guide only.`
			},
			{
				q: `What is the ${SERVICEABILITY_BUFFER}% buffer?`,
				a: `APRA tells lenders to check that you could still afford the loan if the interest rate were at least ${SERVICEABILITY_BUFFER}.0 percentage points higher than the actual rate. This calculator applies that buffer to the rate you enter.`
			},
			{
				q: 'Why will my bank give a different figure?',
				a: `Lenders use their own expense benchmarks, rate floors, income shading, debt-to-income limits and credit card treatment. Treating ${pct(CARD_COMMITMENT_RATE * 100, 1)} of each card limit as a monthly cost is a common but not universal assumption.`
			},
			{
				q: 'Do credit cards reduce my borrowing power if I do not use them?',
				a: 'Yes, in most cases. Lenders usually count a share of the limit, not the balance. Here that share is 3.8% a month, so an A$10,000 limit counts as A$380 of commitments.'
			},
			{
				q: 'Is this the amount I should borrow?',
				a: 'No. It is the most this method says you could service. Borrowing less leaves room for rate rises and life changes.'
			}
		],
		sources: [APRA_BUFFER_SOURCE, ATO_RATES_SOURCE, ATO_CUTS_SOURCE],
		disclaimer: 'An estimate only, not a loan approval or financial advice. Lenders assess applications on their own criteria, and assumptions here (dependant cost, 3.8% card rate) are editable guesses.'
	}
});
