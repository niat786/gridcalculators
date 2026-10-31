import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct, plural } from '../format';
import meta from './hecs-help-calculator.meta';
import {
	ATO_HELP_SOURCE,
	ATO_INDEXATION_SOURCE,
	AU_TAX_YEAR,
	HELP_BAND2_RATE,
	HELP_BAND2_TO,
	HELP_BAND3_BASE,
	HELP_BAND3_RATE,
	HELP_BAND3_TO,
	HELP_INDEXATION,
	HELP_INDEXATION_DATE,
	HELP_NIL_TO,
	HELP_TOP_RATE,
	helpRepayment
} from '../data/au-tax-2026-27';

const MAX_YEARS = 100;

/**
 * Years until a HELP balance is cleared, holding income and the 2026-27 thresholds constant.
 * Each year the balance is indexed on 1 June, then that year's compulsory repayment is credited
 * after the tax return is assessed: next = balance × (1 + i) − repayment.
 */
export function helpPayoff(balance: number, income: number, indexationPct: number) {
	let bal = balance;
	let years = 0;
	let repaid = 0;
	const repay = helpRepayment(income);
	const path: { year: number; balance: number }[] = [{ year: 0, balance }];
	while (bal > 0.005 && years < MAX_YEARS) {
		const indexed = bal * (1 + indexationPct / 100);
		const r = Math.min(repay, indexed);
		bal = indexed - r;
		repaid += r;
		years++;
		path.push({ year: years, balance: bal });
	}
	return { years, repaid, cleared: bal <= 0.005, path };
}

/** Content is written once at build time, so format dollars explicitly (A$69,528). */
const aud = (n: number) => moneyIn('AUD', n, true);
function yearsRows(): string[][] {
	return [75_000, 85_000, 100_000, 150_000, 200_000].map((income) => {
		const p = helpPayoff(30_000, income, HELP_INDEXATION);
		return [aud(income), moneyIn('AUD', Math.min(helpRepayment(income), 30_000), true), p.cleared ? `${p.years}` : 'More than 100'];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income', label: 'Repayment income', type: 'number', default: 85000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Taxable income plus reportable fringe benefits, net investment losses and reportable super contributions.' },
		{ id: 'balance', label: 'HELP balance', type: 'number', default: 30000, min: 0, max: 1_000_000, step: 500, prefix: '$' },
		{ id: 'index', label: 'Indexation rate', type: 'number', default: HELP_INDEXATION, min: 0, max: 20, step: 0.1, suffix: '%', help: `${HELP_INDEXATION_DATE} rate was ${HELP_INDEXATION}% (ATO). Change it to test future years.` }
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const balance = Number(v.balance);
		const idx = Number(v.index);
		if (!(income >= 0) || !(balance >= 0) || !(idx >= 0 && idx <= 100) || ![income, balance, idx].every(Number.isFinite)) {
			return { primaryResult: DASH, primaryLabel: `Compulsory repayment ${AU_TAX_YEAR}`, summary: 'Enter your income, your HELP balance and an indexation rate.' };
		}
		const raw = helpRepayment(income);
		const repayment = Math.min(raw, balance);
		const monthly = repayment / 12;
		const rate = income > 0 ? (repayment / income) * 100 : 0;
		let yearsText: string;
		let totalText: string;
		let chart: ReturnType<typeof buildChart> | undefined;
		if (balance === 0) {
			yearsText = 'No debt';
			totalText = money(0);
		} else if (raw === 0) {
			yearsText = 'No compulsory repayments at this income';
			totalText = DASH;
		} else {
			const p = helpPayoff(balance, income, idx);
			yearsText = p.cleared ? plural(p.years, 'year') : `More than ${MAX_YEARS} years`;
			totalText = p.cleared ? money(p.repaid, true) : DASH;
			chart = buildChart(p.path);
		}
		return {
			primaryResult: money(repayment),
			primaryLabel: `Compulsory repayment for ${AU_TAX_YEAR}`,
			summary:
				raw === 0
					? `Repayment income is at or below $${num(HELP_NIL_TO, 0)}, so no compulsory repayment is due in ${AU_TAX_YEAR}. The balance still grows with indexation.`
					: `${pct(rate, 2)} of your repayment income, about ${money(monthly)} a month. Years to repay assume your income and the ${AU_TAX_YEAR} thresholds stay the same.`,
			secondaryMetrics: [
				{ label: 'Per month', value: money(monthly) },
				{ label: 'Share of income', value: pct(rate, 2) },
				{ label: 'Estimated years to repay', value: yearsText },
				{ label: 'Total repaid (estimate)', value: totalText },
				{ label: 'Indexation on today\'s balance', value: money(balance * (idx / 100)) }
			],
			...(chart ? { chart } : {})
		};
	},
	content: {
		intro: `Estimate your compulsory HECS-HELP repayment for ${AU_TAX_YEAR} under the marginal repayment system. This HECS HELP calculator also shows how many years it could take to clear your debt once indexation is included.`,
		howTo: [
			'Enter your repayment income for the year and your current HELP balance.',
			`Check the indexation rate. The ${HELP_INDEXATION_DATE} rate is filled in, and you can change it to test other years.`,
			'Read this year\'s repayment, the monthly equivalent and the share of your income.',
			'Check the estimated years to repay and the chart of your balance over time.'
		],
		about: [
			{
				heading: 'What is a HELP debt?',
				paragraphs: [
					'HELP is a government loan that helps Australians pay for study. HECS-HELP is the part that covers tuition fees. You do not pay it back while your income is low, and you repay it through the tax system once you earn enough.',
					'The loan has no interest. However, the balance is indexed once a year, so it grows with prices or wages. That is why a debt can rise even when you owe the same amount of study fees.',
					'The ATO collects your repayment when it assesses your tax return. Your employer may also withhold extra tax during the year to cover it.'
				]
			},
			{
				heading: `Repayment thresholds for ${AU_TAX_YEAR}`,
				paragraphs: [
					`Since 2025-26, repayments use a marginal system. You pay a set share only of the income above each threshold, instead of a share of all your income. Above ${aud(HELP_BAND3_TO)}, the rate is ${pct(HELP_TOP_RATE * 100, 0)} of your whole repayment income.`,
					'Repayment income is not just your pay. It is your taxable income plus reportable fringe benefits, net investment losses and reportable super contributions.'
				],
				table: {
					caption: `Compulsory repayments, ${AU_TAX_YEAR}`,
					columns: ['Repayment income', 'Repayment'],
					rows: [
						[`Up to ${aud(HELP_NIL_TO)}`, 'Nil'],
						[`${aud(HELP_NIL_TO + 1)} to ${aud(HELP_BAND2_TO)}`, `${pct(HELP_BAND2_RATE * 100, 0)} of the amount over ${aud(HELP_NIL_TO)}`],
						[`${aud(HELP_BAND2_TO + 1)} to ${aud(HELP_BAND3_TO)}`, `${aud(HELP_BAND3_BASE)} plus ${pct(HELP_BAND3_RATE * 100, 0)} of the amount over ${aud(HELP_BAND2_TO)}`],
						[`${aud(HELP_BAND3_TO + 1)} and over`, `${pct(HELP_TOP_RATE * 100, 0)} of your total repayment income`]
					]
				}
			},
			{
				heading: 'How indexation works',
				paragraphs: [
					`Indexation is applied to your balance on 1 June each year. The ATO lists ${HELP_INDEXATION}% for ${HELP_INDEXATION_DATE}, which is the default here. It was 3.2% on 1 June 2025.`,
					'Your repayment is credited after your tax return is assessed. So the calculator first adds indexation to the balance, then takes off that year\'s repayment, and repeats the steps until the debt is gone.',
					'If your repayment is smaller than the indexation, your balance can grow. That happens at incomes just above the first threshold.'
				]
			},
			{
				heading: 'How long will it take to repay?',
				paragraphs: [
					`The table shows a ${aud(30_000)} balance at ${HELP_INDEXATION}% indexation. It assumes your income and the ${AU_TAX_YEAR} thresholds never change.`,
					'In real life, your income, the thresholds and the indexation rate all move. Treat the years as a guide, not a forecast.'
				],
				table: { caption: `${aud(30_000)} HELP balance, ${HELP_INDEXATION}% indexation`, columns: ['Repayment income', 'First-year repayment', 'Years to repay'], rows: yearsRows() }
			},
			{
				heading: 'Tips and what the tool leaves out',
				paragraphs: ['A few ideas can help you plan:'],
				list: [
					'**Check your income type.** Use repayment income, not just salary.',
					'**Consider voluntary repayments.** Paying extra before 1 June can cut the amount that gets indexed. Ask the ATO how to do it.',
					'**See your pay.** The [Australia pay calculator](/australia-pay-calculator) shows take-home pay with a HELP repayment.',
					'**Plan a loan.** HELP lowers your [borrowing power](/borrowing-power-calculator) because lenders count the repayment.',
					'**Save for later.** Try the [superannuation calculator](/superannuation-calculator) to see long-term savings.'
				]
			}
		],
		formulas: [
			{
				title: `Compulsory repayment ${AU_TAX_YEAR}`,
				expression: `Up to ${aud(HELP_NIL_TO)}: nil · ${aud(HELP_NIL_TO + 1)}–${aud(HELP_BAND2_TO)}: ${pct(HELP_BAND2_RATE * 100, 0)} × (income − ${aud(HELP_NIL_TO)}) · ${aud(HELP_BAND2_TO + 1)}–${aud(HELP_BAND3_TO)}: ${aud(HELP_BAND3_BASE)} + ${pct(HELP_BAND3_RATE * 100, 0)} × (income − ${aud(HELP_BAND2_TO)}) · ${aud(HELP_BAND3_TO + 1)} and over: ${pct(HELP_TOP_RATE * 100, 0)} × income`,
				variables: [
					{ symbol: 'income', meaning: 'repayment income for the year' },
					{ symbol: 'Indexation', meaning: 'balance × (1 + rate) applied each 1 June; the year\'s repayment is then credited after your tax return is assessed' }
				]
			}
		],
		example: {
			title: 'Repayment income $85,000 and a $30,000 balance',
			steps: ['Repayment: 15% × ($85,000 − $69,528) = $2,320.80', 'That is $193.40 a month, or 2.73% of income', 'Each year the balance is indexed by 2.8%, then $2,320.80 is repaid. That takes 17 years and about $37,768 in total'],
			result: '$2,320.80 repayment this year, 17 years to repay'
		},
		faq: [
			{
				q: 'How much HECS repayment will I make in 2026-27?',
				a: `It depends on your repayment income. At ${aud(85_000)} you repay ${moneyIn('AUD', helpRepayment(85_000))} a year. At ${aud(100_000)} you repay ${moneyIn('AUD', helpRepayment(100_000))}. Below ${aud(HELP_NIL_TO)} you repay nothing.`
			},
			{
				q: 'What is the marginal repayment system?',
				a: `From 2025-26 you pay a set percentage only on income above a threshold, instead of a percentage of all your income. For ${AU_TAX_YEAR} the first threshold is ${aud(HELP_NIL_TO)}. Above ${aud(HELP_BAND3_TO)} the rate is ${pct(HELP_TOP_RATE * 100, 0)} of your whole repayment income.`
			},
			{
				q: 'What is the current indexation rate?',
				a: `The ATO lists ${HELP_INDEXATION}% for ${HELP_INDEXATION_DATE} and 3.2% for 1 June 2025. Indexation is the lower of CPI and the Wage Price Index and applies to the part of the debt unpaid for more than 11 months.`
			},
			{
				q: 'Does a HELP debt charge interest?',
				a: 'No. A HELP debt is indexed once a year instead. That keeps its value in line with prices or wages, but it can still make the balance grow.'
			},
			{
				q: 'Why is the years-to-repay figure only an estimate?',
				a: 'It holds your income and the thresholds steady. In reality your income, the thresholds and the indexation rate change every year, and voluntary repayments would shorten it.'
			}
		],
		sources: [ATO_HELP_SOURCE, ATO_INDEXATION_SOURCE],
		disclaimer: 'An estimate for planning, not financial advice. Your actual repayment is assessed by the ATO when you lodge your tax return.'
	}
});

function buildChart(path: { year: number; balance: number }[]) {
	return {
		type: 'line' as const,
		title: 'HELP balance over time',
		x: 'year',
		xLabel: 'Years from now',
		series: [{ key: 'balance', label: 'Remaining balance' }],
		data: path.map((p) => ({ year: p.year, balance: Math.round(p.balance * 100) / 100 })),
		valueFormat: 'currency' as const
	};
}
