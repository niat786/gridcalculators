import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import { CAP_NPS_EXTRA } from '../data/in-tax-fy2026-27';
import meta from './nps-calculator.meta';
import {
	NPS_GOV_MIN_ANNUITY_PCT,
	NPS_MAX_AGE,
	NPS_NONGOV_FULL_LUMP_LIMIT,
	NPS_NONGOV_MIN_ANNUITY_PCT,
	NPS_NORMAL_EXIT_AGE,
	NPS_SOURCE,
	NPS_SOURCE_2,
	NPS_TAX_FREE_LUMP_PCT,
	NPS_TAX_SOURCE,
	PFRDA_HOME
} from '../data/in-savings-2026';

/**
 * Corpus after `months` months. Each month the balance grows by the monthly rate, then the contribution is added
 * (contribution at the end of the month). The contribution rises by `stepUpPct` at the start of each new year.
 */
export function npsCorpus(opening: number, monthly: number, annualPct: number, years: number, stepUpPct: number) {
	const i = annualPct / 100 / 12;
	let bal = opening;
	let c = monthly;
	let contributed = 0;
	for (let m = 1; m <= years * 12; m++) {
		bal = bal * (1 + i) + c;
		contributed += c;
		if (m % 12 === 0) c *= 1 + stepUpPct / 100;
	}
	return { corpus: bal, contributed };
}

/** Smallest share of the corpus that must buy an annuity, % (0 when the whole corpus may be taken as a lump sum). */
export function minAnnuityPct(type: string, corpus: number): number {
	if (type === 'gov') return NPS_GOV_MIN_ANNUITY_PCT;
	return corpus <= NPS_NONGOV_FULL_LUMP_LIMIT ? 0 : NPS_NONGOV_MIN_ANNUITY_PCT;
}

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Monthly pension', summary });

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'type',
			label: 'Subscriber type',
			type: 'select',
			display: 'segmented',
			default: 'nongov',
			options: [
				{ label: 'Non-government', value: 'nongov' },
				{ label: 'Government', value: 'gov' }
			],
			help: 'Non-government covers the All Citizen and Corporate models.'
		},
		{ id: 'age', label: 'Your age now', type: 'number', default: 30, min: 18, max: 70, step: 1, decimal: false, suffix: 'years' },
		{ id: 'retire', label: 'Retirement age', type: 'number', default: NPS_NORMAL_EXIT_AGE, min: 40, max: NPS_MAX_AGE, step: 1, decimal: false, suffix: 'years', help: 'Normal exit is at 60. You can continue to 85.' },
		{ id: 'monthly', label: 'Monthly contribution', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'stepup', label: 'Yearly increase in contribution', type: 'number', default: 0, min: 0, max: 50, step: 1, suffix: '%', help: 'Use 0 to keep the contribution flat.' },
		{ id: 'opening', label: 'Corpus you already have', type: 'number', default: 0, min: 0, max: 100_000_000_000, step: 10000, prefix: '$' },
		{ id: 'return', label: 'Expected return', type: 'number', default: 10, min: 0, max: 30, step: 0.5, suffix: '%', help: 'A guess for the average yearly return. NPS returns are not guaranteed.' },
		{ id: 'annuityPct', label: 'Share put into an annuity', type: 'number', default: 40, min: 0, max: 100, step: 5, suffix: '%', help: 'The rules set a minimum: 20% for non-government above ₹8 lakh, 40% for government.' },
		{ id: 'annuityRate', label: 'Annuity rate', type: 'number', default: 6, min: 0, max: 20, step: 0.1, suffix: '%', help: 'What the annuity provider pays a year on the amount used. An assumption: rates differ by provider.' },
		{ id: 'inflation', label: 'Inflation', type: 'number', default: 5, min: 0, max: 20, step: 0.5, suffix: '%', help: 'Used only to show the corpus in today’s money.' }
	],
	calculate(v: InputValues): CalculationResult {
		const age = Number(v.age);
		const retire = Number(v.retire);
		const monthly = Number(v.monthly);
		const stepup = Number(v.stepup);
		const opening = Number(v.opening);
		const ret = Number(v.return);
		const annuityPct = Number(v.annuityPct);
		const annuityRate = Number(v.annuityRate);
		const inflation = Number(v.inflation);
		const type = v.type === 'gov' ? 'gov' : 'nongov';

		if (![age, retire, monthly, stepup, opening, ret, annuityPct, annuityRate, inflation].every(Number.isFinite)) return fail('Fill in every field.');
		if (!Number.isInteger(age) || !Number.isInteger(retire)) return fail('Enter ages as whole numbers.');
		if (age < 18 || retire > NPS_MAX_AGE || retire < NPS_NORMAL_EXIT_AGE) return fail(`NPS exit is from age ${NPS_NORMAL_EXIT_AGE} to ${NPS_MAX_AGE}, and you join from 18.`);
		if (retire <= age) return fail('Your retirement age must be above your current age.');
		if (monthly < 0 || opening < 0 || stepup < 0 || stepup > 50 || ret < 0 || ret > 30 || annuityPct < 0 || annuityPct > 100 || annuityRate < 0 || annuityRate > 20 || inflation < 0 || inflation > 20) {
			return fail('Check the numbers: none can be negative, and the percentages need sensible values.');
		}
		if (monthly === 0 && opening === 0) return fail('Enter a monthly contribution or a starting corpus.');

		const years = retire - age;
		const { corpus, contributed } = npsCorpus(opening, monthly, ret, years, stepup);
		const minPct = minAnnuityPct(type, corpus);
		const usedPct = Math.max(annuityPct, minPct);
		const annuityAmt = (corpus * usedPct) / 100;
		const lump = corpus - annuityAmt;
		const taxFree = Math.min(lump, (corpus * NPS_TAX_FREE_LUMP_PCT) / 100);
		const taxable = lump - taxFree;
		const pension = (annuityAmt * annuityRate) / 100 / 12;
		const real = corpus / Math.pow(1 + inflation / 100, years);

		return {
			primaryResult: money(pension),
			primaryLabel: 'Monthly pension from the annuity',
			summary: `After ${num(years, 0)} years you would have about ${money(corpus, true)}. ${pct(usedPct, 1)} (${money(annuityAmt, true)}) buys the annuity${usedPct > annuityPct ? `, because the minimum for your case is ${pct(minPct)}` : ''}, and ${money(lump, true)} is paid as a lump sum.`,
			secondaryMetrics: [
				{ label: `Corpus at age ${retire}`, value: money(corpus) },
				{ label: 'Corpus in today’s money', value: money(real) },
				{ label: 'You contribute (plus starting corpus)', value: money(contributed + opening) },
				{ label: 'Growth on top', value: money(corpus - contributed - opening) },
				{ label: 'Annuity share used', value: pct(usedPct, 1) },
				{ label: 'Lump sum', value: money(lump) },
				{ label: `Tax-free part of the lump sum (${NPS_TAX_FREE_LUMP_PCT}% of corpus)`, value: money(taxFree) },
				{ label: 'Taxable part of the lump sum', value: money(taxable) }
			]
		};
	},
	content: {
		intro: `Use this NPS calculator to estimate how much your National Pension System (NPS) account could grow to by retirement. It shows how the corpus splits into a lump sum and an annuity under the December 2025 PFRDA exit rules, and the monthly pension you could get.`,
		howTo: [
			'Choose government or non-government, then enter your age, retirement age (60 or later), monthly contribution and an expected yearly return.',
			'Set the share you will put into an annuity and the annuity rate you expect. The calculator never goes below the legal minimum.',
			'Read the corpus, the lump sum with its tax-free part, and the monthly pension.'
		],
		about: [
			{
				heading: 'What is the National Pension System?',
				paragraphs: [
					'The National Pension System (NPS) is a retirement savings scheme regulated by PFRDA, the pension regulator of India. You contribute during your working life, and the money is invested in a mix of assets. At retirement, you take part of the corpus as a lump sum and use the rest to buy an annuity, which pays a regular pension.',
					`The normal exit age is ${NPS_NORMAL_EXIT_AGE}. You can stay invested up to age ${NPS_MAX_AGE}. The returns are market-linked, so they are not guaranteed.`
				]
			},
			{
				heading: 'How the NPS corpus is calculated',
				paragraphs: [
					'The calculator works month by month. Each month, your balance grows by one month of return (the yearly return divided by 12), and then your contribution is added. If you set a yearly increase, your contribution rises each year.',
					'It then shows the corpus at today’s prices too, using the inflation rate you enter. That matters, because a large number in the future buys less than it does today. For example, ₹2,26,04,879 after 30 years at 5% inflation is worth about ₹52,30,259 at today’s prices.'
				]
			},
			{
				heading: 'The exit rules: lump sum and annuity',
				paragraphs: [
					`At normal exit, the PFRDA rules of December 2025 decide how much you must put into an annuity. For non-government subscribers, the minimum is ${NPS_NONGOV_MIN_ANNUITY_PCT}% of the corpus when it is above ₹12 lakh. You can take everything as a lump sum if the corpus is up to ${inr(NPS_NONGOV_FULL_LUMP_LIMIT)}. Between the two limits, there are other options to ask your provider about. Government subscribers must put at least ${NPS_GOV_MIN_ANNUITY_PCT}% into an annuity.`,
					`The calculator never uses a share below the minimum for your case. The monthly pension equals the annuity amount times the annuity rate you enter, divided by 12.`
				]
			},
			{
				heading: 'How the inputs change your pension',
				paragraphs: [
					'The table uses a non-government subscriber who contributes from age 30 to 60 at a 10% return, with 40% in an annuity at 6%. Change one input at a time to see its effect.'
				],
				table: {
					caption: 'Estimated NPS corpus and pension',
					columns: ['Scenario', 'Corpus', 'Monthly pension'],
					rows: [
						['₹10,000 a month from age 30 to 60', '₹2,26,04,879', '₹45,210'],
						['Same, but starting at 40', '₹75,93,688', '₹15,187'],
						['Same, but ₹5,000 a month', '₹1,13,02,440', '₹22,605'],
						['Same, but an 8% return', '₹1,49,03,594', '₹29,807'],
						['Same, but contributions rise 10% a year', '₹6,36,66,690', '₹1,27,333'],
						['Same, but retiring at 65', '₹3,79,66,381', '₹75,933']
					]
				}
			},
			{
				heading: 'NPS and tax',
				paragraphs: [
					`Up to ${NPS_TAX_FREE_LUMP_PCT}% of the corpus is tax-free as a lump sum. A non-government subscriber can now take up to 80% as a lump sum, but the extra 20% is taxed at slab rates unless the tax law is changed. The pension from the annuity is taxed as income when you receive it.`,
					`In the old tax regime, you can claim an extra deduction of up to ${inr(CAP_NPS_EXTRA)} a year for your own NPS contributions. See how it affects your tax in the [India income tax calculator](/india-income-tax-calculator).`
				]
			},
			{
				heading: 'Tips for planning with NPS',
				paragraphs: ['A few habits make a big difference:'],
				list: [
					'**Start early.** The table shows that starting at 30 instead of 40 triples the corpus.',
					'**Raise your contribution with your pay.** A 10% yearly increase changes the result a lot.',
					'**Test a lower return.** Try 8% as well as 10% before you rely on a number.',
					'**Plan for inflation.** Look at the figure at today’s prices, not just the big one.',
					'**Use other retirement tools.** Compare with the [EPF calculator](/epf-calculator), the [PPF calculator](/ppf-calculator) and the [SWP calculator](/swp-calculator) for the lump sum.'
				]
			}
		],
		formulas: [
			{
				title: 'Corpus',
				expression: 'Corpus = existing × (1 + i)ⁿ + C × [(1 + i)ⁿ − 1] ÷ i',
				variables: [
					{ symbol: 'i', meaning: 'expected yearly return ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'months until retirement' },
					{ symbol: 'C', meaning: 'monthly contribution, added at the end of each month (raised by the yearly increase, if any)' }
				]
			},
			{
				title: 'At retirement',
				expression: 'Annuity = corpus × annuity share\nLump sum = corpus − annuity\nMonthly pension = annuity × annuity rate ÷ 12',
				variables: [{ symbol: 'Tax-free part', meaning: 'up to 60% of the corpus; any lump sum above 60% is taxable at slab rates' }]
			}
		],
		example: {
			title: 'Age 30, ₹10,000 a month, 10% return, retire at 60',
			steps: [
				'Months: 360. Monthly rate: i = 10% ÷ 12. Corpus = ₹10,000 × [(1 + i)³⁶⁰ − 1] ÷ i = ₹2,26,04,879.25.',
				'Annuity share 40%: annuity amount ₹90,41,951.70, lump sum ₹1,35,62,927.55.',
				'The whole 60% lump sum is tax-free. Monthly pension = ₹90,41,951.70 × 6% ÷ 12 = ₹45,209.76.'
			],
			result: '₹45,209.76 a month'
		},
		faq: [
			{
				q: 'How is the NPS pension calculated?',
				a: 'The calculator grows your contributions to a corpus, puts your chosen share into an annuity, and multiplies that amount by the annuity rate. Dividing by 12 gives the monthly pension.'
			},
			{
				q: 'What is the minimum annuity under the new NPS rules?',
				a: 'Since December 2025, non-government subscribers must put at least 20% of the corpus into an annuity when it is above ₹12 lakh. They may take everything as a lump sum up to ₹8 lakh. Government subscribers still need at least 40%. This tool applies 20% above ₹8 lakh; between ₹8 lakh and ₹12 lakh there are also other options you can ask your provider about.'
			},
			{
				q: 'How much of the NPS lump sum is tax-free?',
				a: 'Up to 60% of the corpus is tax-free. A non-government subscriber can now take up to 80% as a lump sum, but the extra 20% is taxed at slab rates unless the tax law is changed. Pension from the annuity is taxed as income.'
			},
			{
				q: 'What return should I assume for NPS?',
				a: 'Nobody can say for sure, because NPS returns are market-linked. Try a low, a middle and a high figure, and plan around the low one.'
			},
			{
				q: 'What is left out?',
				a: 'Fees, tax on the annuity, early exit before 60, partial withdrawals, annuity types with a return of purchase price, and the small-corpus exceptions for government subscribers. Returns and annuity rates are assumptions.'
			}
		],
		sources: [NPS_SOURCE, NPS_SOURCE_2, NPS_TAX_SOURCE, PFRDA_HOME],
		disclaimer: 'This is an estimate for general information, not financial advice. NPS returns are market-linked and not guaranteed; confirm the exit and tax rules with PFRDA, your provider or a tax professional.'
	}
});
