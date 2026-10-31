/**
 * Shared Indian income-tax engine for FY 2026-27 (individual, resident). All figures come from
 * in-tax-fy2026-27.ts. Used by india-income-tax-calculator and in-hand-salary-calculator.
 */
import {
	CAP_80C,
	CAP_80D_TOTAL,
	CAP_HOME_LOAN_INTEREST,
	CAP_NPS_EXTRA,
	CESS_RATE,
	EMPLOYER_NPS_PCT_GOVT,
	EMPLOYER_NPS_PCT_NEW,
	EMPLOYER_NPS_PCT_OTHER_OLD,
	NEW_REGIME_REBATE_LIMIT,
	NEW_REGIME_REBATE_MAX,
	NEW_REGIME_SLABS,
	OLD_REGIME_REBATE_LIMIT,
	OLD_REGIME_REBATE_MAX,
	OLD_REGIME_SLABS,
	STANDARD_DEDUCTION_NEW,
	STANDARD_DEDUCTION_OLD,
	SURCHARGE_NEW,
	SURCHARGE_OLD,
	type AgeGroup,
	type Slab
} from './in-tax-fy2026-27';

export type Regime = 'new' | 'old';

/** Section 516: drop paise, then round to the nearest Rs 10 (last digit 5 or more goes up). */
export function roundToTen(n: number): number {
	if (!(n > 0)) return 0;
	const r = Math.floor(n);
	const rem = r % 10;
	return rem >= 5 ? r - rem + 10 : r - rem;
}

export function slabTax(slabs: Slab[], income: number): number {
	let tax = 0;
	let lower = 0;
	for (const s of slabs) {
		if (income > lower) tax += (Math.min(income, s.upTo) - lower) * s.rate;
		if (income <= s.upTo) break;
		lower = s.upTo;
	}
	return tax;
}

export interface TaxBreakdown {
	totalIncome: number;
	slabTax: number;
	/** Standard rebate (old 87A / section 156). */
	rebate: number;
	/** New regime marginal relief just above the rebate limit. */
	marginalRelief: number;
	taxAfterRelief: number;
	surchargeRate: number;
	surcharge: number;
	surchargeRelief: number;
	cess: number;
	/** Final tax, rounded to Rs 10. */
	total: number;
}

function slabsFor(regime: Regime, age: AgeGroup): Slab[] {
	return regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS[age];
}

/** Tax after rebate / marginal relief (before surcharge). */
function taxAfterRebate(regime: Regime, age: AgeGroup, income: number) {
	const base = slabTax(slabsFor(regime, age), income);
	let rebate = 0;
	let relief = 0;
	if (regime === 'new') {
		if (income <= NEW_REGIME_REBATE_LIMIT) rebate = Math.min(base, NEW_REGIME_REBATE_MAX);
		else if (base > income - NEW_REGIME_REBATE_LIMIT) relief = base - (income - NEW_REGIME_REBATE_LIMIT);
	} else if (income <= OLD_REGIME_REBATE_LIMIT) {
		rebate = Math.min(base, OLD_REGIME_REBATE_MAX);
	}
	return { base, rebate, relief, tax: base - rebate - relief };
}

/** Tax plus surcharge (with marginal relief), before cess. Recurses to the band edge for the relief cap. */
function withSurcharge(regime: Regime, age: AgeGroup, income: number) {
	const t = taxAfterRebate(regime, age, income);
	const bands = regime === 'new' ? SURCHARGE_NEW : SURCHARGE_OLD;
	let band: { above: number; rate: number } | undefined;
	for (const b of bands) if (income > b.above) band = b;
	if (!band) return { ...t, rate: 0, surcharge: 0, surchargeRelief: 0 };
	const full = t.tax * band.rate;
	const atEdge = withSurcharge(regime, age, band.above);
	const limit = atEdge.tax + atEdge.surcharge + (income - band.above);
	let surcharge = full;
	if (t.tax + full > limit) surcharge = Math.max(0, limit - t.tax);
	return { ...t, rate: band.rate, surcharge, surchargeRelief: full - surcharge };
}

/** Tax on a total income (the income is rounded to Rs 10 first, per section 516). */
export function taxOnIncome(regime: Regime, age: AgeGroup, totalIncomeRaw: number): TaxBreakdown {
	const income = roundToTen(totalIncomeRaw);
	const w = withSurcharge(regime, age, income);
	const cess = (w.tax + w.surcharge) * CESS_RATE;
	return {
		totalIncome: income,
		slabTax: w.base,
		rebate: w.rebate,
		marginalRelief: w.relief,
		taxAfterRelief: w.tax,
		surchargeRate: w.rate,
		surcharge: w.surcharge,
		surchargeRelief: w.surchargeRelief,
		cess,
		total: roundToTen(w.tax + w.surcharge + cess)
	};
}

export interface AssessInput {
	age: AgeGroup;
	/** Gross salary income (before exemptions and the standard deduction). */
	salary: number;
	otherIncome: number;
	// old regime only
	hraExemption: number;
	ded80c: number;
	ded80d: number;
	homeLoanInterest: number;
	nps1b: number;
	professionalTax: number;
	otherDeductions: number;
	// employer NPS (both regimes)
	employerNps: number;
	basicDa: number;
	govtEmployer: boolean;
}

export interface Assessment {
	regime: Regime;
	salary: number;
	otherIncome: number;
	hraExemption: number;
	standardDeduction: number;
	professionalTax: number;
	houseProperty: number;
	deductions: number;
	grossTotalIncome: number;
	tax: TaxBreakdown;
}

export function employerNpsAllowed(regime: Regime, i: AssessInput): number {
	const pct =
		regime === 'new' ? EMPLOYER_NPS_PCT_NEW : i.govtEmployer ? EMPLOYER_NPS_PCT_GOVT : EMPLOYER_NPS_PCT_OTHER_OLD;
	return Math.min(Math.max(0, i.employerNps), Math.max(0, i.basicDa) * pct);
}

export function assess(regime: Regime, i: AssessInput): Assessment {
	const salary = Math.max(0, i.salary);
	const other = Math.max(0, i.otherIncome);
	const npsEmployer = employerNpsAllowed(regime, i);
	if (regime === 'new') {
		const std = Math.min(STANDARD_DEDUCTION_NEW, salary);
		const gti = salary - std + other;
		const deductions = Math.min(npsEmployer, gti);
		const taxable = gti - deductions;
		return {
			regime,
			salary,
			otherIncome: other,
			hraExemption: 0,
			standardDeduction: std,
			professionalTax: 0,
			houseProperty: 0,
			deductions,
			grossTotalIncome: gti,
			tax: taxOnIncome('new', i.age, taxable)
		};
	}
	const hra = Math.min(Math.max(0, i.hraExemption), salary);
	const net = salary - hra;
	const std = Math.min(STANDARD_DEDUCTION_OLD, net);
	const pt = Math.min(Math.max(0, i.professionalTax), net - std);
	const hp = Math.min(Math.max(0, i.homeLoanInterest), CAP_HOME_LOAN_INTEREST);
	const gti = Math.max(0, net - std - pt + other - hp);
	const via =
		Math.min(Math.max(0, i.ded80c), CAP_80C) +
		Math.min(Math.max(0, i.nps1b), CAP_NPS_EXTRA) +
		Math.min(Math.max(0, i.ded80d), CAP_80D_TOTAL) +
		npsEmployer +
		Math.max(0, i.otherDeductions);
	const deductions = Math.min(via, gti);
	return {
		regime,
		salary,
		otherIncome: other,
		hraExemption: hra,
		standardDeduction: std,
		professionalTax: pt,
		houseProperty: hp,
		deductions,
		grossTotalIncome: gti,
		tax: taxOnIncome('old', i.age, gti - deductions)
	};
}
