import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';

import { FHA_MIN_DOWN, FHA_MIP_THRESHOLD, FHA_SOURCE, FHA_UFMIP, fhaAnnualMip } from '../data/us-loans';
import meta from './fha-loan-calculator.meta';

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
const EX = (() => {
	const price = 350_000;
	const down = FHA_MIN_DOWN;
	const rate = 6.25;
	const years = 30;
	const taxYr = 4_200;
	const insYr = 1_500;
	const base = price * (1 - down);
	const ufmip = base * FHA_UFMIP;
	const loan = base + ufmip;
	const pi = payment(loan, rate, years * 12);
	const mip = fhaAnnualMip(base, base / price, years);
	const mipMonthly = (base * mip.rate) / 12;
	return { price, rate, taxYr, insYr, base, ufmip, loan, pi, mip, mipMonthly, subtotal: pi + mipMonthly, total: pi + mipMonthly + taxYr / 12 + insYr / 12 };
})();
/** Annual MIP read from the same function the calculator uses, for a sample loan at each LTV band. */
const mipCell = (base: number, ltv: number, years: number) => {
	const m = fhaAnnualMip(base, ltv, years);
	return `${pc(m.rate)}, ${m.years === 'life' ? 'for the life of the loan' : `for ${m.years} years`}`;
};
const BANDS: [string, number][] = [
	['Over 95%', 0.965],
	['Over 90% up to 95%', 0.92],
	['Over 78% up to 90%', 0.85],
	['78% or less', 0.75]
];
const SMALL = 300_000;
const BIG = FHA_MIP_THRESHOLD + 100_000;
const mipRows: string[][] = BANDS.map(([label, ltv]) => [label, mipCell(SMALL, ltv, 30), mipCell(SMALL, ltv, 15), mipCell(BIG, ltv, 30), mipCell(BIG, ltv, 15)]);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Home price', type: 'number', default: 350000, min: 1000, max: 5_000_000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 3.5, min: 3.5, max: 99, step: 0.5, suffix: '%', help: 'FHA minimum is 3.5% (credit score 580+)' },
		{ id: 'rate', label: 'Interest rate', type: 'number', default: 6.25, min: 0, max: 20, step: 0.01, suffix: '%' },
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
		{ id: 'tax', label: 'Property tax', type: 'number', default: 4200, min: 0, max: 200_000, prefix: '$', suffix: '/yr', width: 'half' },
		{ id: 'ins', label: 'Home insurance', type: 'number', default: 1500, min: 0, max: 100_000, prefix: '$', suffix: '/yr', width: 'half' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const downPct = Number(v.down) / 100;
		const rate = Number(v.rate);
		const years = Number(v.term);
		const tax = Number(v.tax) || 0;
		const ins = Number(v.ins) || 0;
		if (!(price > 0) || !(downPct >= FHA_MIN_DOWN && downPct < 1) || !(rate >= 0 && rate <= 30) || ![15, 20, 30].includes(years)) {
			return { primaryResult: DASH, primaryLabel: 'Monthly payment', summary: 'FHA loans need at least 3.5% down.' };
		}
		const base = price * (1 - downPct);
		const ltv = base / price;
		const ufmip = base * FHA_UFMIP;
		const loan = base + ufmip; // UFMIP is usually financed into the loan
		const n = years * 12;
		const pi = payment(loan, rate, n);
		const mip = fhaAnnualMip(base, ltv, years);
		// Annual MIP is charged on the average outstanding balance; the first year ≈ base loan.
		const mipMonthly = (base * mip.rate) / 12;
		const total = pi + mipMonthly + tax / 12 + ins / 12;

		return {
			primaryResult: money(total),
			primaryLabel: 'Estimated monthly payment',
			summary: `Annual MIP ${pct(mip.rate * 100, 2)} ${mip.years === 'life' ? 'for the life of the loan' : 'for 11 years'}; upfront MIP financed into the loan.`,
			secondaryMetrics: [
				{ label: 'Principal & interest', value: money(pi) },
				{ label: 'Mortgage insurance (MIP)', value: money(mipMonthly) },
				{ label: 'Property tax', value: money(tax / 12) },
				{ label: 'Home insurance', value: money(ins / 12) },
				{ label: 'Down payment', value: money(price * downPct, true) },
				{ label: 'Upfront MIP (1.75%)', value: money(ufmip, true) },
				{ label: 'Total loan amount', value: money(loan, true) }
			]
		};
	},
	content: {
		intro: `Use this FHA loan calculator to estimate a monthly FHA mortgage payment. It includes the upfront and annual mortgage insurance premiums (MIP) that every FHA loan carries, using HUD’s current premium chart.`,
		howTo: [
			`Enter the home price and your down payment (at least ${pc(FHA_MIN_DOWN)}).`,
			'Enter the interest rate and pick a term.',
			'Add yearly property tax and home insurance.',
			'Read your total payment and how long the mortgage insurance lasts.'
		],
		about: [
			{
				heading: 'What is an FHA loan?',
				paragraphs: [
					'An FHA loan is a mortgage insured by the Federal Housing Administration, part of the US government. A bank or other lender makes the loan. The insurance protects the lender if you stop paying, so lenders can accept smaller down payments and lower credit scores.',
					`That makes FHA loans popular with first-time buyers. However, the trade-off is mortgage insurance. You pay it as a one-time upfront premium and as a yearly premium split into monthly amounts.`
				]
			},
			{
				heading: 'FHA mortgage insurance premiums',
				paragraphs: [
					`The upfront premium (UFMIP) is ${pc(FHA_UFMIP)} of the base loan. Most borrowers add it to the loan instead of paying cash at closing, and the calculator does the same.`,
					'The annual premium (annual MIP) depends on your loan term, the size of the loan and your loan-to-value ratio (LTV). LTV is the loan divided by the home price. So a bigger down payment means a lower LTV and a lower premium.',
					`The table shows the annual rates in HUD's chart for loans entered after March 2023. "Larger loans" means above ${usd(FHA_MIP_THRESHOLD)}.`
				],
				table: {
					caption: 'Annual MIP by LTV',
					columns: ['LTV', `30-year, up to ${usd(FHA_MIP_THRESHOLD)}`, `15-year, up to ${usd(FHA_MIP_THRESHOLD)}`, '30-year, larger loan', '15-year, larger loan'],
					rows: mipRows
				}
			},
			{
				heading: 'How the monthly payment is worked out',
				paragraphs: [
					`First, the calculator finds the base loan: the home price minus your down payment. Then it adds the upfront premium to get your total loan amount. It uses the standard payment formula on that total to find principal and interest.`,
					'Next, it adds the monthly MIP, one twelfth of the annual premium on the base loan. Finally, it adds one twelfth of your yearly property tax and home insurance. The real MIP is charged on the average balance for each year, so it can fall a little over time. The calculator shows the first-year amount.'
				]
			},
			{
				heading: 'Down payment and credit score',
				paragraphs: [
					`FHA's minimum down payment is ${pc(FHA_MIN_DOWN)} with a credit score of 580 or higher. With a score from 500 to 579, FHA requires 10% down. Lenders can set stricter rules, so your offer may differ.`,
					`More down payment cuts your payment in two ways. First, it lowers the loan. Second, it can lower the premium. The table uses a ${usd(EX.price)} home at ${EX.rate}% for 30 years, with ${usd(EX.taxYr)} of yearly tax and ${usd(EX.insYr)} of insurance.`
				],
				table: {
					caption: `Monthly payment on a ${usd(EX.price)} home`,
					columns: ['Down payment', 'Monthly payment', 'Annual MIP'],
					rows: [
						[`${pc(FHA_MIN_DOWN)}`, usd2(2745.78), '0.55%, life of loan'],
						['5%', usd2(2696.63), '0.5%, life of loan'],
						['10%', usd2(2579.7), '0.5%, 11 years'],
						['20%', usd2(2345.84), '0.5%, 11 years']
					]
				}
			},
			{
				heading: 'When another loan may fit better',
				paragraphs: [
					'FHA loans are not the only low-down-payment option. Veterans may do better with a [VA loan](/va-mortgage-calculator), which has no monthly mortgage insurance. If you can put down 20%, a conventional loan avoids mortgage insurance altogether. Compare the two with the [mortgage calculator](/mortgage-calculator).',
					'Also, before you shop, check what you can afford with the [house affordability calculator](/house-affordability-calculator). Then plan your savings with the [down payment calculator](/down-payment-calculator). Later, you can see whether a [refinance](/refinance-calculator) would remove the mortgage insurance.'
				]
			}
		],
		formulas: [
			{
				title: 'Upfront MIP',
				expression: 'UFMIP = base loan × 1.75%   (added to the loan)',
				variables: [{ symbol: 'base loan', meaning: 'home price − down payment' }]
			},
			{
				title: 'Annual MIP',
				expression: 'Monthly MIP = base loan × annual MIP rate ÷ 12',
				variables: [{ symbol: 'annual MIP rate', meaning: 'from HUD’s chart, based on loan term, loan size and LTV (see the table above)' }]
			},
			{
				title: 'Monthly payment',
				expression: 'P&I on (base loan + UFMIP) + base loan × annual MIP ÷ 12 + tax ÷ 12 + insurance ÷ 12',
				variables: []
			}
		],
		example: {
			title: `${usd(EX.price)} home, ${pc(FHA_MIN_DOWN)} down, ${EX.rate}%, 30 years`,
			steps: [
				`Base loan: ${usd(EX.price)} × ${pc(1 - FHA_MIN_DOWN)} = ${usd(EX.base)}`,
				`Upfront MIP: ${usd(EX.base)} × ${pc(FHA_UFMIP)} = ${usd2(EX.ufmip)} → loan ${usd2(EX.loan)}`,
				`Principal & interest at ${EX.rate}%: ${usd2(EX.pi)}`,
				`LTV ${pc(1 - FHA_MIN_DOWN)} is over 95% → annual MIP ${pc(EX.mip.rate)}: ${usd(EX.base)} × ${pc(EX.mip.rate)} ÷ 12 = ${usd2(EX.mipMonthly)}`
			],
			result: `About ${usd2(EX.subtotal)} a month before tax and insurance, or ${usd2(EX.total)} with ${usd(EX.taxYr)} tax and ${usd(EX.insYr)} insurance.`
		},
		faq: [
			{
				q: 'How is an FHA loan payment calculated?',
				a: 'Add the upfront premium to the base loan and find the principal and interest payment. Then add one twelfth of the annual MIP, property tax and home insurance. The FHA loan calculator does all of this for you.'
			},
			{
				q: 'How long do I pay FHA mortgage insurance?',
				a: 'With 10% or more down, annual MIP ends after 11 years. With less than 10% down, it lasts for the life of the loan unless you refinance into a loan without it.'
			},
			{
				q: 'What is the minimum down payment for an FHA loan?',
				a: `${pc(FHA_MIN_DOWN)} with a credit score of 580 or higher. With a score between 500 and 579, FHA requires 10% down.`
			},
			{
				q: 'Can I pay the upfront MIP in cash?',
				a: 'Yes. It can be paid at closing or added to the loan, but most borrowers finance it, which is what this calculator assumes.'
			},
			{
				q: 'Are there limits on how much I can borrow?',
				a: 'Yes. FHA loan limits vary by county and are updated every year. Check HUD’s FHA mortgage limits lookup for your area.'
			}
		],
		sources: [FHA_SOURCE, { title: 'HUD — Let FHA help you', url: 'https://www.hud.gov/buying/loans' }],
		disclaimer: 'Estimates only. Your lender confirms the final rate, premiums, loan limits and fees.'
	}
});
