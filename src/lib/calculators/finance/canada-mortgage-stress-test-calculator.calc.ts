import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './canada-mortgage-stress-test-calculator.meta';
import {
	CMHC_30YR_SURCHARGE,
	CMHC_PREMIUMS,
	CMHC_SOURCE,
	FINANCE_CANADA_SOURCE,
	INSURED_PRICE_CAP,
	MAX_GDS,
	MAX_TDS,
	MIN_DOWN_FIRST_RATE,
	MIN_DOWN_FIRST_TIER,
	MIN_DOWN_SECOND_RATE,
	OSFI_SOURCE,
	QUALIFY_BUFFER,
	QUALIFY_FLOOR
} from '../data/ca-tax-2026';

/** Canadian fixed-rate mortgages compound semi-annually; this is the equivalent monthly rate. */
export function monthlyRate(annualPct: number): number {
	return Math.pow(1 + annualPct / 100 / 2, 1 / 6) - 1;
}

export function paymentFor(loan: number, annualPct: number, years: number): number {
	const m = monthlyRate(annualPct);
	const n = years * 12;
	return m === 0 ? loan / n : (loan * m) / (1 - Math.pow(1 + m, -n));
}

export function loanFor(payment: number, annualPct: number, years: number): number {
	const m = monthlyRate(annualPct);
	const n = years * 12;
	return m === 0 ? payment * n : (payment * (1 - Math.pow(1 + m, -n))) / m;
}

export function qualifyingRate(contractPct: number): number {
	return Math.max(contractPct + QUALIFY_BUFFER, QUALIFY_FLOOR);
}

export function minDownPayment(price: number): number {
	return MIN_DOWN_FIRST_RATE * Math.min(price, MIN_DOWN_FIRST_TIER) + MIN_DOWN_SECOND_RATE * Math.max(0, price - MIN_DOWN_FIRST_TIER);
}

/** CMHC premium rate on the loan for a loan-to-value ratio above 80% (including the 30-year surcharge). */
export function cmhcPremiumRate(ltv: number, amortYears: number): number {
	if (ltv <= 0.8) return 0;
	const tier = CMHC_PREMIUMS.find((t) => ltv <= t.ltvUpTo + 1e-12);
	if (!tier) return NaN;
	return tier.rate + (amortYears > 25 ? CMHC_30YR_SURCHARGE : 0);
}

/** Rows for the CMHC premium table, built from the data file (content is written once at build time). */
function premiumRows(): string[][] {
	let from = 0.8;
	return CMHC_PREMIUMS.map((t) => {
		const row = [`Over ${pct(from * 100, 0)} to ${pct(t.ltvUpTo * 100, 0)}`, pct(t.rate * 100, 2)];
		from = t.ltvUpTo;
		return row;
	});
}
const premiumSummary = CMHC_PREMIUMS.map((t, i) => `${i === 0 ? 'over 80%' : `over ${pct(CMHC_PREMIUMS[i - 1].ltvUpTo * 100, 0)}`} to ${pct(t.ltvUpTo * 100, 0)} loan-to-value ${pct(t.rate * 100, 2)}`).join(', ');

export interface StressInput {
	income: number;
	debts: number;
	propertyTax: number;
	heating: number;
	condo: number;
	down: number;
	contractRate: number;
	amort: number;
	firstTimeOrNew: boolean;
}

export interface StressResult {
	qualRate: number;
	housingCosts: number;
	maxPayment: number;
	binding: 'GDS' | 'TDS';
	insured: boolean;
	amortUsed: number;
	maxPrice: number;
	baseMortgage: number;
	premium: number;
	premiumRate: number;
	totalLoan: number;
	gds: number;
	tds: number;
	paymentAtContract: number;
	downPct: number;
	canBuy: boolean;
}

export function stressTest(i: StressInput): StressResult {
	const qualRate = qualifyingRate(i.contractRate);
	const monthlyIncome = i.income / 12;
	const housingCosts = i.propertyTax / 12 + i.heating + i.condo * 0.5;
	const gdsRoom = MAX_GDS * monthlyIncome - housingCosts;
	const tdsRoom = MAX_TDS * monthlyIncome - housingCosts - i.debts;
	const binding: 'GDS' | 'TDS' = gdsRoom <= tdsRoom ? 'GDS' : 'TDS';
	const maxPayment = Math.max(0, Math.min(gdsRoom, tdsRoom));
	const insuredAmort = i.amort > 25 && !i.firstTimeOrNew ? 25 : i.amort;
	const loanUninsured = loanFor(maxPayment, qualRate, i.amort);
	const loanInsured = loanFor(maxPayment, qualRate, insuredAmort);

	// Is a price affordable, and what loan (including any CMHC premium) does it need?
	const check = (price: number) => {
		const base = price - i.down;
		if (base <= 0) return { ok: true, insured: false, base: 0, rate: 0, amort: i.amort };
		const ltv = base / price;
		if (ltv <= 0.8 + 1e-12) {
			return { ok: base <= loanUninsured + 1e-6, insured: false, base, rate: 0, amort: i.amort };
		}
		const rate = cmhcPremiumRate(ltv, insuredAmort);
		const okRules = price < INSURED_PRICE_CAP && i.down + 1e-9 >= minDownPayment(price) && Number.isFinite(rate);
		return { ok: okRules && base * (1 + rate) <= loanInsured + 1e-6, insured: true, base, rate, amort: insuredAmort };
	};

	const candidates: number[] = [i.down, loanUninsured + i.down, i.down / 0.2, INSURED_PRICE_CAP - 0.01];
	for (const t of CMHC_PREMIUMS) {
		const rate = t.rate + (insuredAmort > 25 ? CMHC_30YR_SURCHARGE : 0);
		candidates.push(loanInsured / (1 + rate) + i.down);
		candidates.push(i.down / (1 - t.ltvUpTo));
	}
	// Price allowed by the minimum down payment: 5% of the first $500,000 and 10% of the rest.
	candidates.push(i.down < MIN_DOWN_FIRST_RATE * MIN_DOWN_FIRST_TIER ? i.down / MIN_DOWN_FIRST_RATE : MIN_DOWN_FIRST_TIER + (i.down - MIN_DOWN_FIRST_RATE * MIN_DOWN_FIRST_TIER) / MIN_DOWN_SECOND_RATE);

	let best = i.down;
	for (const c of candidates) {
		if (!Number.isFinite(c) || c < best) continue;
		// Step down a hair for rounding, then confirm with the real rules.
		for (const price of [c, Math.floor(c * 100) / 100]) {
			const info = check(price);
			if (info.ok && price >= best) {
				best = price;
			}
		}
	}
	const maxPrice = Math.floor(best + 1e-9);
	const final = check(maxPrice);
	const base = final.base;
	const premiumRate = final.insured ? final.rate : 0;
	const premium = base * premiumRate;
	const totalLoan = base + premium;
	const payQual = totalLoan > 0 ? paymentFor(totalLoan, qualRate, final.amort) : 0;
	return {
		qualRate,
		housingCosts,
		maxPayment,
		binding,
		insured: final.insured,
		amortUsed: final.amort,
		maxPrice,
		baseMortgage: base,
		premium,
		premiumRate,
		totalLoan,
		gds: monthlyIncome > 0 ? (payQual + housingCosts) / monthlyIncome : 0,
		tds: monthlyIncome > 0 ? (payQual + housingCosts + i.debts) / monthlyIncome : 0,
		paymentAtContract: totalLoan > 0 ? paymentFor(totalLoan, i.contractRate, final.amort) : 0,
		downPct: maxPrice > 0 ? i.down / maxPrice : 0,
		canBuy: base > 0
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income', label: 'Gross household income', type: 'number', default: 120000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr' },
		{ id: 'debts', label: 'Other debt payments', type: 'number', default: 400, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo', help: 'Car loans, credit card minimums, student loans, support payments.' },
		{ id: 'tax', label: 'Property tax', type: 'number', default: 3600, min: 0, max: 10_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{ id: 'heat', label: 'Heating', type: 'number', default: 150, min: 0, max: 100_000, step: 10, prefix: '$', suffix: '/mo' },
		{ id: 'condo', label: 'Condo fees', type: 'number', default: 0, min: 0, max: 100_000, step: 25, prefix: '$', suffix: '/mo', help: 'Lenders count 50% of condo fees.' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 100000, min: 0, max: 1_000_000_000, step: 5000, prefix: '$' },
		{ id: 'rate', label: 'Contract interest rate', type: 'number', default: 4.5, min: 0, max: 20, step: 0.01, suffix: '%', help: 'The rate your lender offers. You qualify at the higher stress rate.' },
		{ id: 'amort', label: 'Amortization', type: 'number', default: 25, min: 5, max: 30, step: 1, suffix: 'years', decimal: false },
		{ id: 'firstTime', label: 'First-time buyer or newly built home', type: 'toggle', default: false, help: 'Insured mortgages can use 30 years only for first-time buyers and newly built homes.' }
	],
	calculate(v): CalculationResult {
		const n = {
			income: Number(v.income),
			debts: Number(v.debts),
			propertyTax: Number(v.tax),
			heating: Number(v.heat),
			condo: Number(v.condo),
			down: Number(v.down),
			contractRate: Number(v.rate),
			amort: Number(v.amort)
		};
		const ok =
			Object.values(n).every((x) => Number.isFinite(x) && x >= 0) && n.income > 0 && n.contractRate <= 20 && Number.isInteger(n.amort) && n.amort >= 5 && n.amort <= 30;
		if (!ok) {
			return { primaryResult: DASH, primaryLabel: 'Maximum home price', summary: 'Enter an income above zero, amounts of zero or more, and an amortization of 5 to 30 years.' };
		}
		const r = stressTest({ ...n, firstTimeOrNew: v.firstTime === true });
		const gdsRoomMonthly = money(r.maxPayment);
		if (!r.canBuy) {
			return {
				primaryResult: money(r.maxPrice, true),
				primaryLabel: 'Maximum home price',
				summary: `At the stress-test rate of ${pct(r.qualRate, 2)} your income leaves no room for a mortgage after housing costs and debts, so only your down payment is left.`,
				secondaryMetrics: [
					{ label: 'Qualifying rate', value: pct(r.qualRate, 2) },
					{ label: 'Maximum mortgage', value: money(0, true) },
					{ label: 'Monthly room for principal and interest', value: gdsRoomMonthly }
				]
			};
		}
		return {
			primaryResult: money(r.maxPrice, true),
			primaryLabel: 'Maximum home price',
			summary: `You qualify at ${pct(r.qualRate, 2)} (the greater of your rate + 2% and 5.25%). The ${r.binding} limit (${r.binding === 'GDS' ? '39' : '44'}%) is the one that caps you; the mortgage is ${r.insured ? 'CMHC-insured' : 'uninsured'} with a ${r.amortUsed}-year amortization.`,
			secondaryMetrics: [
				{ label: 'Qualifying rate', value: pct(r.qualRate, 2) },
				{ label: 'Maximum mortgage', value: money(r.baseMortgage, true) },
				{ label: 'CMHC insurance premium (added to the loan)', value: r.insured ? `${money(r.premium, true)} (${pct(r.premiumRate * 100, 2)})` : 'None (20% or more down)' },
				{ label: 'Down payment', value: `${money(Number(v.down), true)} (${pct(r.downPct * 100, 1)})` },
				{ label: 'Payment at your contract rate', value: money(r.paymentAtContract) },
				{ label: 'GDS at the qualifying rate', value: pct(r.gds * 100, 2) },
				{ label: 'TDS at the qualifying rate', value: pct(r.tds * 100, 2) }
			]
		};
	},
	content: {
		intro: `See how much mortgage and home price you can qualify for under the Canadian mortgage stress test. This stress test calculator qualifies you at the greater of your contract rate plus ${QUALIFY_BUFFER}% or ${pct(QUALIFY_FLOOR, 2)}. It also applies the ${pct(MAX_GDS * 100, 0)} GDS and ${pct(MAX_TDS * 100, 0)} TDS limits used by CMHC.`,
		howTo: [
			'Enter your gross household income, your monthly debts, your property tax, heating and condo fees.',
			'Enter your down payment, the contract rate your lender offers and the amortization.',
			'Switch on the first-time buyer option if you are a first-time buyer or buying a newly built home.',
			'Read the maximum home price, the maximum mortgage and the CMHC premium if you put down less than 20%.'
		],
		about: [
			{
				heading: 'What is the mortgage stress test?',
				paragraphs: [
					`The stress test is a rule that checks whether you could still pay your mortgage if rates rose. Your lender must test you at a higher rate than the one you will actually pay. That rate is the greater of your contract rate plus ${QUALIFY_BUFFER} percentage points or ${pct(QUALIFY_FLOOR, 2)}.`,
					`For example, with a contract rate of 4.5%, you qualify at ${pct(qualifyingRate(4.5), 2)}. With a contract rate of 3%, you qualify at ${pct(qualifyingRate(3), 2)}, because the floor applies. The floor takes over whenever your contract rate is below ${pct(QUALIFY_FLOOR - QUALIFY_BUFFER, 2)}.`,
					'The test only sets how much you can borrow. Your real payments use your contract rate.'
				]
			},
			{
				heading: 'How GDS and TDS limit your mortgage',
				paragraphs: [
					`Lenders use two ratios. Gross debt service (GDS) is your housing costs divided by your gross income. Housing costs are the mortgage payment, property tax, heating and half of any condo fees. CMHC caps GDS at ${pct(MAX_GDS * 100, 0)}.`,
					`Total debt service (TDS) adds your other debts, such as car loans, credit card minimums and student loans. CMHC caps TDS at ${pct(MAX_TDS * 100, 0)}. Whichever limit leaves you less room is the one that caps you, and the calculator tells you which.`,
					'Both ratios use your gross income, which is your pay before tax. To see what you keep after tax, use the [Canada take-home pay calculator](/canada-take-home-pay-calculator).'
				]
			},
			{
				heading: 'Down payment and CMHC insurance',
				paragraphs: [
					`If you put down less than 20%, the mortgage must be insured. The premium depends on your loan-to-value ratio and is added to your loan. A ${pct(CMHC_30YR_SURCHARGE * 100, 2)} surcharge applies for a 30-year amortization.`,
					`Insured mortgages are for homes under ${moneyIn('CAD', INSURED_PRICE_CAP, true)}. The minimum down payment is ${pct(MIN_DOWN_FIRST_RATE * 100, 0)} of the first ${moneyIn('CAD', MIN_DOWN_FIRST_TIER, true)} plus ${pct(MIN_DOWN_SECOND_RATE * 100, 0)} of the rest. A 30-year amortization on an insured loan is for first-time buyers and newly built homes only. Other insured mortgages are limited to 25 years.`
				],
				table: { caption: 'CMHC premium on the total loan', columns: ['Loan-to-value', 'Premium'], rows: premiumRows() }
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The main number is the highest home price you can buy with your down payment. Below it you see the maximum mortgage, the premium if any, and your GDS and TDS at the qualifying rate.',
					'Treat the maximum as a ceiling, not a target. Your payment at your contract rate is lower than the qualifying payment, but it is still a long commitment. For the payment on a smaller loan, try the [Canadian mortgage calculator](/canadian-mortgage-calculator).',
					'Buying also costs more than the price. The [land transfer tax calculator](/land-transfer-tax-calculator) shows one closing cost you should add to your plan.'
				]
			},
			{
				heading: 'Ways to qualify for more, and what the tool leaves out',
				paragraphs: ['A few changes can raise the amount you qualify for:'],
				list: [
					'**Pay down debts.** Each dollar of monthly debt cuts your TDS room.',
					'**Save a bigger down payment.** At 20% down you avoid the premium. Past that, you borrow less for the same home.',
					'**Add a co-borrower.** A second income raises the limit, as long as their debts do not offset it.',
					'**Compare lenders.** A lower contract rate helps once it is above the floor.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'Lenders also check credit, job history and the source of your down payment. They may use their own limits for uninsured loans. In Ontario, Quebec and Saskatchewan, provincial sales tax on the premium is paid in cash at closing, and this tool does not include it.',
					'The result is a guide, not an approval. Ask a lender or mortgage broker for a pre-approval before you shop.'
				]
			}
		],
		formulas: [
			{
				title: 'Qualifying and debt ratios',
				expression: `Qualifying rate = max(contract rate + ${QUALIFY_BUFFER}%, ${pct(QUALIFY_FLOOR, 2)})`,
				variables: [
					{ symbol: 'GDS', meaning: `(mortgage payment + property tax + heating + 50% of condo fees) ÷ gross income ≤ ${pct(MAX_GDS * 100, 0)}` },
					{ symbol: 'TDS', meaning: `(GDS costs + all other debt payments) ÷ gross income ≤ ${pct(MAX_TDS * 100, 0)}` },
					{ symbol: 'Payment', meaning: 'Loan × m ÷ (1 − (1 + m)⁻ⁿ), with m = (1 + rate ÷ 2)^(1/6) − 1 for semi-annual compounding' }
				]
			},
			{
				title: 'CMHC insurance (down payment under 20%)',
				expression: `Premium = loan × rate: ${premiumSummary}; +${pct(CMHC_30YR_SURCHARGE * 100, 2)} for a 30-year amortization`,
				variables: [
					{ symbol: 'Rules', meaning: `Price under ${moneyIn('CAD', INSURED_PRICE_CAP, true)}; ${pct(MIN_DOWN_FIRST_RATE * 100, 0)} down on the first ${moneyIn('CAD', MIN_DOWN_FIRST_TIER, true)} and ${pct(MIN_DOWN_SECOND_RATE * 100, 0)} on the rest; 30 years only for first-time buyers and new builds` }
				]
			}
		],
		example: {
			title: '$120,000 income, $100,000 down, 4.5% rate, 25 years',
			steps: [
				'Qualifying rate = max(4.5% + 2%, 5.25%) = 6.5%.',
				'Housing costs = $3,600 ÷ 12 + $150 heating = $450 a month.',
				'GDS room = 39% × $10,000 − $450 = $3,450; TDS room = 44% × $10,000 − $450 − $400 = $3,550.',
				'The $3,450 limit supports a loan of $515,060.84 at 6.5% over 25 years. With a 2.80% CMHC premium the mortgage can be $501,031.94, so the highest whole-dollar price is $601,031.'
			],
			result: 'Maximum home price $601,031, with a $14,029 CMHC premium (2.8%). The payment at your 4.5% contract rate is $2,850.72 a month.'
		},
		faq: [
			{
				q: 'What is the mortgage stress test in Canada?',
				a: `Lenders must check that you could still afford the mortgage at a higher rate: the greater of your contract rate plus ${QUALIFY_BUFFER} percentage points or ${pct(QUALIFY_FLOOR, 2)}. OSFI sets this minimum qualifying rate for uninsured mortgages, and insured mortgages follow the same rate.`
			},
			{
				q: 'What are the GDS and TDS limits?',
				a: `CMHC sets ${pct(MAX_GDS * 100, 0)} for GDS and ${pct(MAX_TDS * 100, 0)} for TDS on insured mortgages. Uninsured lenders set their own limits, so this tool uses the same ratios as a guide.`
			},
			{
				q: 'Why does a low contract rate not help me qualify for more?',
				a: `Below ${pct(QUALIFY_FLOOR - QUALIFY_BUFFER, 2)}, the ${pct(QUALIFY_FLOOR, 2)} floor applies, so you are tested at the same rate. For example, a 3% rate and a 3.25% rate give the same maximum price, even though your real payment is lower at 3%.`
			},
			{
				q: 'How much down payment do I need?',
				a: `Under ${moneyIn('CAD', INSURED_PRICE_CAP, true)} you need ${pct(MIN_DOWN_FIRST_RATE * 100, 0)} of the first ${moneyIn('CAD', MIN_DOWN_FIRST_TIER, true)} and ${pct(MIN_DOWN_SECOND_RATE * 100, 0)} of the rest. With less than 20% down, you pay a CMHC premium that is added to your mortgage.`
			},
			{
				q: 'Does the CMHC premium count against me?',
				a: 'The premium is added to your mortgage, so it raises your payment and is part of the loan you qualify for. In Ontario, Quebec and Saskatchewan, provincial sales tax on the premium is paid in cash at closing and is not included here.'
			}
		],
		sources: [OSFI_SOURCE, CMHC_SOURCE, FINANCE_CANADA_SOURCE],
		disclaimer: 'Estimate only. Lenders also look at credit, employment and other factors. This is not a mortgage approval or financial advice.'
	}
});
