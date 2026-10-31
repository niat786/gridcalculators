import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import {
	BANK_DEPOSIT_SOURCE,
	DEPOSIT_TDS_SOURCE,
	FD_TDS_RATE_PCT,
	FD_TDS_THRESHOLD,
	FD_TDS_THRESHOLD_SENIOR,
	RD_FORMULA_SOURCE,
	SENIOR_EXTRA_RATE_DEFAULT
} from '../data/in-deposits';
import meta from './rd-calculator.meta';

const inr = (n: number) => moneyIn('INR', n, true);

/**
 * Indian bank RD convention: each monthly instalment (paid at the start of its month) is compounded quarterly
 * for the months it stays in: value = R × (1 + r/4)^(months remaining ÷ 3). The maturity is the sum, which equals
 * the closed form M = R × ((1 + i)ⁿ − 1) ÷ (1 − (1 + i)^(−1/3)) with i = r/4 and n = quarters.
 * Reproduces the Policybazaar RD example (₹5,000 a month, 8.25%, 12 months = ₹62,730.85, 12th instalment ₹5,034.14).
 */
export function rdValueAfter(monthly: number, ratePct: number, depositedMonths: number, monthsElapsed: number): number {
	const i = ratePct / 100 / 4;
	let s = 0;
	for (let j = 1; j <= depositedMonths; j++) s += monthly * Math.pow(1 + i, (monthsElapsed - j + 1) / 3);
	return s;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'monthly', label: 'Monthly deposit', type: 'number', default: 5000, min: 1, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.05, suffix: '% a year' },
		{ id: 'months', label: 'Tenure', type: 'number', default: 60, min: 1, max: 120, step: 1, decimal: false, suffix: 'months', help: 'Banks usually offer 6 months to 10 years.' },
		{ id: 'senior', label: 'Senior citizen rate', type: 'toggle', default: false },
		{
			id: 'extra',
			label: 'Extra rate for senior citizens',
			type: 'number',
			default: SENIOR_EXTRA_RATE_DEFAULT,
			min: 0,
			max: 5,
			step: 0.05,
			suffix: '%',
			help: 'Banks usually add about 0.50%, but each bank sets its own.',
			visibleWhen: (v) => v.senior === true
		}
	],
	calculate(v: InputValues) {
		const R = Number(v.monthly);
		const rate = Number(v.rate);
		const N = Number(v.months);
		const extra = Number(v.extra);
		const senior = v.senior === true;
		const fail = (summary: string) => ({ primaryResult: DASH, primaryLabel: 'Maturity amount', summary });
		if (!(R >= 1 && R <= 100_000_000)) return fail('Enter the monthly deposit.');
		if (!(rate >= 0 && rate <= 30)) return fail('Enter an interest rate between 0% and 30%.');
		if (!(Number.isInteger(N) && N >= 1 && N <= 120)) return fail('Enter a tenure of 1 to 120 whole months.');
		if (senior && !(extra >= 0 && extra <= 5)) return fail('Enter the extra senior citizen rate (0% to 5%).');

		const applied = rate + (senior ? extra : 0);
		const maturity = rdValueAfter(R, applied, N, N);
		const deposited = R * N;
		const interest = maturity - deposited;

		const rows: Record<string, string>[] = [];
		const chartData: Record<string, number>[] = [{ year: 0, balance: 0, deposited: 0 }];
		const yearsTotal = Math.ceil(N / 12);
		for (let y = 1; y <= yearsTotal; y++) {
			const elapsed = Math.min(12 * y, N);
			const val = rdValueAfter(R, applied, elapsed, elapsed);
			rows.push({
				year: y * 12 > N ? `${num(N / 12, 2)}` : String(y),
				deposited: money(R * elapsed, true),
				interest: money(val - R * elapsed, true),
				balance: money(val, true)
			});
			chartData.push({ year: elapsed / 12, balance: val, deposited: R * elapsed });
		}

		return {
			primaryResult: money(maturity),
			primaryLabel: 'Maturity amount',
			summary: `${money(R, true)} a month for ${num(N, 0)} months at ${pct(applied, 2)}, compounded quarterly, earns ${money(interest)} in interest.`,
			secondaryMetrics: [
				{ label: 'Interest earned', value: money(interest) },
				{ label: 'Total deposited', value: money(deposited) },
				{ label: 'Rate applied', value: pct(applied, 2) },
				{ label: 'Number of instalments', value: num(N, 0) }
			],
			chart: {
				type: 'line',
				title: 'RD value and total deposited',
				x: 'year',
				xLabel: 'Year',
				series: [
					{ key: 'balance', label: 'Value with interest' },
					{ key: 'deposited', label: 'Total deposited' }
				],
				data: chartData,
				valueFormat: 'currency'
			},
			table: {
				title: 'RD value by year',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'deposited', label: 'Deposited', align: 'end' },
					{ key: 'interest', label: 'Interest', align: 'end' },
					{ key: 'balance', label: 'Value', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this RD calculator to find the maturity amount of a recurring deposit using the Indian bank method. Every monthly instalment earns quarterly-compounded interest for the months it stays in the account. The maths works in any currency.',
		howTo: [
			'Enter the monthly deposit, the rate your bank quotes and the tenure in months.',
			'Turn on the senior citizen rate if it applies, and edit the extra rate to match your bank.',
			'Read the maturity amount and interest, then open the yearly table.'
		],
		about: [
			{
				heading: 'What is a recurring deposit?',
				paragraphs: [
					'A recurring deposit (RD) is a savings plan with a bank or the post office. You deposit a fixed amount every month for a fixed time, and the bank pays interest at a rate set on the day you open it.',
					'It suits people who don’t have a large sum to start with. You build a habit of saving, and you know the rate in advance. For a single large deposit, use the [FD calculator](/fd-calculator) instead.'
				]
			},
			{
				heading: 'How RD maturity is calculated',
				paragraphs: [
					'Each monthly instalment earns interest only for the time it stays in the account. So the first instalment earns for the whole tenure, and the last one earns for just one month.',
					'Indian banks usually add interest every quarter. The calculator grows each instalment at the quarterly rate (the yearly rate divided by 4) for the months it stays in, and then adds all the instalments together. It assumes each deposit goes in at the start of its month.',
					'The closed form of this sum is shown in the formulas below. It gives the same answer as adding the instalments one by one.'
				]
			},
			{
				heading: 'How the tenure changes your result',
				paragraphs: [
					'A longer RD earns more, and the extra interest grows faster than the deposits. The table uses ₹5,000 a month at 6.5%. The 5-year RD earns about 18% on what you put in, while the 2-year RD earns about 7%.'
				],
				table: {
					caption: '₹5,000 a month at 6.5%',
					columns: ['Tenure', 'Total deposited', 'Maturity amount', 'Interest earned'],
					rows: [
						['24 months', '₹1,20,000', '₹1,28,425.30', '₹8,425.30'],
						['36 months', '₹1,80,000', '₹1,99,121.86', '₹19,121.86'],
						['60 months', '₹3,00,000', '₹3,54,954.10', '₹54,954.10']
					]
				}
			},
			{
				heading: 'Senior citizen rates and tax',
				paragraphs: [
					'Many banks pay senior citizens a higher rate. As a guide, the calculator adds 0.50% when you turn on the senior option, but each bank sets its own, so edit it to match yours. For example, ₹5,000 a month for 60 months at 7% (6.5% plus 0.50%) matures at ₹3,59,663.95.',
					`RD interest is taxed as income at your slab rate. Banks deduct TDS at ${FD_TDS_RATE_PCT}% with PAN once the interest at one bank passes ${inr(FD_TDS_THRESHOLD)} a year, or ${inr(FD_TDS_THRESHOLD_SENIOR)} for senior citizens. See your slab in the [India income tax calculator](/india-income-tax-calculator).`
				]
			},
			{
				heading: 'RD or SIP?',
				paragraphs: [
					'Both are monthly habits, but they work differently. An RD has a fixed rate and low risk, so the result is known in advance. A [SIP](/sip-calculator) is market-linked, so it can earn more or less.',
					'If you want a government-backed monthly saving with tax-free interest, look at the [PPF calculator](/ppf-calculator) too. It has a longer 15-year lock-in.'
				]
			},
			{
				heading: 'Tips for using an RD',
				paragraphs: ['A few habits make an RD work better for you:'],
				list: [
					'**Pick an amount you can keep paying.** Missed instalments can bring a penalty, and the rules differ by bank.',
					'**Match the tenure to your goal.** If you need the money in two years, choose a two-year RD.',
					'**Check the rate on opening day.** The rate is fixed for the whole RD, so compare banks before you start.',
					'**Re-invest at maturity.** Put the maturity amount into an [FD](/fd-calculator) or another plan, so the money keeps working.'
				]
			}
		],
		formulas: [
			{
				title: 'RD maturity (quarterly compounding)',
				expression: 'M = Σ R × (1 + r ÷ 4)^(4 × t)   =   R × ((1 + i)ⁿ − 1) ÷ (1 − (1 + i)^(−1/3))',
				variables: [
					{ symbol: 'R', meaning: 'monthly instalment' },
					{ symbol: 't', meaning: 'years that instalment stays in: months remaining ÷ 12' },
					{ symbol: 'i', meaning: 'rate per quarter: annual rate ÷ 4 as a decimal' },
					{ symbol: 'n', meaning: 'number of quarters: months ÷ 3' }
				]
			}
		],
		example: {
			title: '₹5,000 a month for 12 months at 8.25%',
			steps: [
				'Rate per quarter: 8.25% ÷ 4 = 2.0625%',
				'The first instalment stays 12 months: 5,000 × 1.020625⁴ = ₹5,425.44',
				'The last stays 1 month: 5,000 × 1.020625^(1/3) = ₹5,034.14',
				'Add all 12 instalments: ₹62,730.85. Deposited ₹60,000, so interest is ₹2,730.85.'
			],
			result: 'Maturity amount ₹62,730.85, matching the figure in Policybazaar’s published RD example.'
		},
		faq: [
			{
				q: 'How is RD interest calculated?',
				a: 'Each monthly instalment earns quarterly-compounded interest for the months it stays in the account. The calculator adds up all the instalments with their interest to give the maturity amount.'
			},
			{
				q: 'Which compounding does an RD use?',
				a: 'Most Indian banks, including SBI and HDFC Bank, compound RD interest quarterly. This calculator applies that to each instalment for the months it stays deposited.'
			},
			{
				q: 'Why does my bank show a slightly different amount?',
				a: 'Banks may pay simple interest inside a quarter, count actual days, or round each quarter’s interest. The difference is usually small. Your bank’s receipt is the final figure.'
			},
			{
				q: 'Is RD interest taxed?',
				a: `Yes, as income at your slab rate. Banks deduct TDS above a yearly limit at one bank (${inr(FD_TDS_THRESHOLD)}, or ${inr(FD_TDS_THRESHOLD_SENIOR)} for senior citizens). This calculator shows interest before tax.`
			},
			{
				q: 'What is the difference between an RD and an FD?',
				a: 'An RD takes a fixed amount every month, while an FD takes one lump sum at the start. Both pay a rate fixed on the day you open them.'
			}
		],
		sources: [RD_FORMULA_SOURCE, BANK_DEPOSIT_SOURCE, DEPOSIT_TDS_SOURCE],
		disclaimer:
			'Estimates only. Banks set rates, day counts and rounding, and interest is shown before tax.'
	}
});
