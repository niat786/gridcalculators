import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';

import { VA_SOURCE, vaFundingFee } from '../data/us-loans';
import meta from './va-mortgage-calculator.meta';

function payment(p: number, annualPct: number, n: number): number {
	const r = annualPct / 100 / 12;
	if (r === 0) return p / n;
	const f = Math.pow(1 + r, n);
	return (p * r * f) / (f - 1);
}

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const usd2 = (n: number) => moneyIn('USD', n);
const pc = (r: number) => `${Math.round(r * 10000) / 100}%`;
const EX_PRICE = 400_000;
const EX_RATE = 6;
const EX_TAX = 4_800;
const EX_INS = 1_500;
/** Same steps as calculate(): fee financed into the loan, no monthly mortgage insurance. */
function scenario(downFraction: number, firstUse: boolean) {
	const base = EX_PRICE * (1 - downFraction);
	const fee = base * vaFundingFee(downFraction, firstUse);
	const loan = base + fee;
	const pi = payment(loan, EX_RATE, 360);
	return { base, fee, loan, pi, total: pi + EX_TAX / 12 + EX_INS / 12 };
}
const EX = scenario(0, true);
const feeRows: string[][] = [
	['Less than 5%', pc(vaFundingFee(0, true)), pc(vaFundingFee(0, false))],
	['5% to less than 10%', pc(vaFundingFee(0.05, true)), pc(vaFundingFee(0.05, false))],
	['10% or more', pc(vaFundingFee(0.1, true)), pc(vaFundingFee(0.1, false))]
];
const payRows: string[][] = [
	['0%, first use', scenario(0, true)],
	['5%, first use', scenario(0.05, true)],
	['10%, first use', scenario(0.1, true)],
	['0%, used before', scenario(0, false)]
].map(([label, sc]) => {
	const s = sc as ReturnType<typeof scenario>;
	return [label as string, usd(s.fee), usd(s.loan), usd2(s.total)];
});

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Home price', type: 'number', default: 400000, min: 1000, max: 10_000_000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 0, min: 0, max: 99, step: 0.5, suffix: '%', help: 'VA loans allow 0% down' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6, min: 0, max: 20, step: 0.01, suffix: '%' },
		{
			id: 'term',
			label: 'Loan term',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: '30 yr', value: '30' },
				{ label: '20 yr', value: '20' },
				{ label: '15 yr', value: '15' }
			]
		},
		{
			id: 'use',
			label: 'VA loan use',
			type: 'select',
			display: 'segmented',
			default: 'first',
			options: [
				{ label: 'First use', value: 'first' },
				{ label: 'Used before', value: 'subsequent' },
				{ label: 'Exempt', value: 'exempt' }
			],
			help: 'Exempt: e.g. receiving VA disability compensation, Purple Heart recipients'
		},
		{ id: 'tax', label: 'Property tax', type: 'number', default: 4800, min: 0, max: 200_000, prefix: '$', suffix: '/yr', width: 'half' },
		{ id: 'ins', label: 'Home insurance', type: 'number', default: 1500, min: 0, max: 100_000, prefix: '$', suffix: '/yr', width: 'half' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const down = Number(v.down) / 100;
		const rate = Number(v.rate);
		const years = Number(v.term);
		const tax = Number(v.tax) || 0;
		const ins = Number(v.ins) || 0;
		if (!(price > 0) || !(down >= 0 && down < 1) || !(rate >= 0 && rate <= 30) || ![15, 20, 30].includes(years)) {
			return { primaryResult: DASH, primaryLabel: 'Monthly payment', summary: 'Check the price, down payment and rate.' };
		}
		const base = price * (1 - down);
		const feeRate = v.use === 'exempt' ? 0 : vaFundingFee(down, v.use !== 'subsequent');
		const fee = base * feeRate;
		const loan = base + fee; // funding fee is usually financed
		const pi = payment(loan, rate, years * 12);
		const total = pi + tax / 12 + ins / 12;

		return {
			primaryResult: money(total),
			primaryLabel: 'Estimated monthly payment',
			summary: feeRate === 0 ? 'No funding fee: exempt borrower. VA loans have no monthly mortgage insurance.' : `Funding fee ${pct(feeRate * 100, 2)} financed into the loan. VA loans have no monthly mortgage insurance.`,
			secondaryMetrics: [
				{ label: 'Principal & interest', value: money(pi) },
				{ label: 'Property tax', value: money(tax / 12) },
				{ label: 'Home insurance', value: money(ins / 12) },
				{ label: 'Down payment', value: money(price * down, true) },
				{ label: `VA funding fee (${pct(feeRate * 100, 2)})`, value: money(fee, true) },
				{ label: 'Total loan amount', value: money(loan, true) }
			]
		};
	},
	content: {
		intro: `Use this VA mortgage calculator to estimate the monthly payment on a VA home loan. It includes the one-time VA funding fee, which depends on your down payment and on whether you have used your VA loan benefit before.`,
		howTo: [
			'Enter the home price and your down payment (0% is allowed).',
			'Enter the interest rate and pick a term.',
			'Choose first use, later use, or exempt from the funding fee.',
			'Add property tax and insurance, then read your payment.'
		],
		about: [
			{
				heading: 'What is a VA loan?',
				paragraphs: [
					'A VA loan is a home loan backed by the US Department of Veterans Affairs. Private lenders make the loans, and the VA guarantees part of each one. This lets lenders offer terms that are hard to find elsewhere.',
					'The main benefits are no required down payment and no monthly mortgage insurance. You need a Certificate of Eligibility, which depends on your service. Eligible people include veterans, active-duty service members and some surviving spouses.'
				]
			},
			{
				heading: 'The VA funding fee',
				paragraphs: [
					'Instead of monthly mortgage insurance, most VA borrowers pay a one-time funding fee. It is a percentage of the loan, and it is lower when you put more down. It is also higher if you have used the benefit before.',
					'Many borrowers add the fee to the loan rather than paying cash at closing. The calculator does the same. Some people pay no fee at all, such as veterans who receive VA disability compensation.'
				],
				table: {
					caption: 'VA funding fee for purchase loans',
					columns: ['Down payment', 'First use', 'Used before'],
					rows: feeRows
				}
			},
			{
				heading: 'How the monthly payment is worked out',
				paragraphs: [
					'First, the calculator subtracts your down payment from the price. Then it adds the funding fee to get the total loan. It finds principal and interest on that amount with the standard loan formula.',
					'Last, it adds one twelfth of your yearly property tax and home insurance. There is no mortgage insurance line, because VA loans don’t charge it each month.'
				]
			},
			{
				heading: 'How the down payment and fee change your payment',
				paragraphs: [
					`The table uses a ${usd(EX_PRICE)} home at ${EX_RATE}% for 30 years. Property tax is ${usd(EX_TAX)} a year and insurance is ${usd(EX_INS)}. A down payment of 5% or 10% lowers both the loan and the fee rate, so the payment drops.`
				],
				table: {
					caption: 'Fee and payment by down payment',
					columns: ['Down payment', 'Funding fee', 'Total loan', 'Monthly payment'],
					rows: payRows
				}
			},
			{
				heading: 'Tips for VA borrowers',
				paragraphs: ['A few habits can lower your cost or help you plan:'],
				list: [
					'**Check if you are exempt.** If you get VA disability compensation, the fee may be zero. Choose “Exempt” in the calculator to see the difference.',
					'**Weigh a small down payment.** Even 5% down lowers the fee rate and the loan. Compare the rows in the table above.',
					'**Shop several lenders.** Rates and closing costs vary, even though the VA guarantee is the same.',
					'**Budget for the whole payment.** Taxes and insurance can add hundreds of dollars a month, as the example shows.'
				]
			},
			{
				heading: 'Other costs and next steps',
				paragraphs: [
					'The funding fee is not your only cost. You still pay closing costs, an appraisal, and taxes and insurance. The home must also meet VA property standards.',
					'To see how much house fits your budget, try the [house affordability calculator](/house-affordability-calculator). For a side-by-side with a low-down-payment alternative, use the [FHA loan calculator](/fha-loan-calculator). A [standard mortgage calculator](/mortgage-calculator) helps with other loan types, and the [debt-to-income ratio calculator](/debt-to-income-ratio-calculator) shows how lenders view your debts.'
				]
			}
		],
		formulas: [
			{
				title: 'VA funding fee (purchase loans)',
				expression: `Down under 5%: ${pc(vaFundingFee(0, true))} first use, ${pc(vaFundingFee(0, false))} after first use\nDown 5% to under 10%: ${pc(vaFundingFee(0.05, true))}\nDown 10% or more: ${pc(vaFundingFee(0.1, true))}`,
				variables: []
			},
			{
				title: 'Payment',
				expression: 'P&I on (price − down + funding fee) + tax ÷ 12 + insurance ÷ 12',
				variables: []
			}
		],
		example: {
			title: `${usd(EX_PRICE)} home, 0% down, first use, ${EX_RATE}%, 30 years`,
			steps: [
				`Funding fee: ${usd(EX_PRICE)} × ${pc(vaFundingFee(0, true))} = ${usd(EX.fee)}`,
				`Loan: ${usd(EX_PRICE)} + ${usd(EX.fee)} = ${usd(EX.loan)}`,
				`Principal & interest at ${EX_RATE}% for 30 years: ${usd2(EX.pi)}`,
				`Plus ${usd(EX_TAX)} ÷ 12 tax and ${usd(EX_INS)} ÷ 12 insurance = ${usd(EX_TAX / 12 + EX_INS / 12)}`
			],
			result: `About ${usd2(EX.total)} a month.`
		},
		faq: [
			{
				q: 'How is a VA mortgage payment calculated?',
				a: 'Add the funding fee to the amount you borrow, then use the standard loan formula for principal and interest. Add property tax and insurance. A VA loan has no monthly mortgage insurance.'
			},
			{
				q: 'Who is exempt from the VA funding fee?',
				a: 'Veterans receiving (or eligible for) VA disability compensation, Purple Heart recipients on active duty, and eligible surviving spouses, among others. Your Certificate of Eligibility shows your status.'
			},
			{
				q: 'Do VA loans have mortgage insurance?',
				a: 'No. VA loans don’t charge monthly mortgage insurance. The one-time funding fee helps fund the program instead.'
			},
			{
				q: 'Can I pay the funding fee upfront?',
				a: 'Yes. You can pay it at closing or add it to the loan. This calculator assumes it is added to the loan.'
			},
			{
				q: 'Can I use a VA loan more than once?',
				a: 'Often yes. The benefit can be used again, for example after you sell a home and repay the loan. The funding fee is higher with no down payment on later use.'
			}
		],
		sources: [VA_SOURCE, { title: 'U.S. Department of Veterans Affairs — VA home loans', url: 'https://www.va.gov/housing-assistance/home-loans/' }],
		disclaimer: 'Estimates only. Your lender and the VA confirm eligibility, the funding fee and the final terms.'
	}
});
