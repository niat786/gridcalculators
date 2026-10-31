/**
 * India: income tax, HRA, EPF, professional tax and gratuity figures for FY 2026-27
 * (assessment year 2027-28; called "tax year 2026-27" in the Income-tax Act, 2025).
 *
 * Verified 2026-10-28.
 *
 * WHAT CHANGED WITH THE INCOME-TAX ACT, 2025 (in force from 1 April 2026):
 * Section NUMBERS changed, the AMOUNTS did not (Finance Act 2026 left slabs, rebate, standard deduction,
 * surcharge and deduction caps unchanged). Mapping used in the page text:
 *   115BAC (new regime) -> section 202      87A (rebate) -> section 156
 *   80C -> section 123 (+ Schedule XV)      80CCD(1B) -> section 124(3)    80CCD(2) -> section 124(1)-(2)
 *   80D -> section 126                      24(b) interest -> section 22    16(ia)/16(iii) -> section 19
 *   10(13A) HRA -> Schedule III (Table Sl. No. 11), limits in Income-tax Rules 2026 rule 279
 *   10(10) gratuity -> section 19 (Table Sl. No. 5-6)      288A/288B rounding -> section 516
 * The one amount that DID change in practice is the HRA 50% city list (now 8 cities, see below), and
 * the EPF wage ceiling (now Rs 25,000, from 17 September 2026).
 *
 * NOT MODELLED (stated in the page text): special-rate income (capital gains, lottery, VDA), the
 * 15% surcharge cap on dividends / capital gains, non-residents, HUF, advance-tax interest,
 * Agniveer / 80CCH, family-pension deduction, tax on employer contributions above the annual limit.
 */

export const IN_TAX_YEAR_LABEL = 'FY 2026-27';
export const IN_ASSESSMENT_YEAR_LABEL = 'AY 2027-28';
export const IN_TAX_YEAR_FULL = 'FY 2026-27 (AY 2027-28)';

export const IN_TAX_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 202 (new tax regime rates)',
	url: 'https://www.incometaxindia.gov.in/w/section-202-76'
};
export const IN_REBATE_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 156 (rebate and marginal relief)',
	url: 'https://www.incometaxindia.gov.in/w/section-156-84'
};
export const IN_SALARY_DEDUCTIONS_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 19 (standard deduction, gratuity)',
	url: 'https://www.incometaxindia.gov.in/w/section-19-206'
};
export const IN_THRESHOLDS_SOURCE = {
	title: 'Income Tax Department: Threshold limits (old-regime slabs, surcharge, standard deduction)',
	url: 'https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act'
};
export const IN_SEC123_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 123 (old 80C)',
	url: 'https://www.incometaxindia.gov.in/w/section-123-96'
};
export const IN_SEC124_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 124 (NPS)',
	url: 'https://www.incometaxindia.gov.in/w/section-124-98'
};
export const IN_SEC126_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 126 (old 80D)',
	url: 'https://www.incometaxindia.gov.in/w/section-126-92'
};
export const IN_SEC22_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 22 (house property deductions)',
	url: 'https://www.incometaxindia.gov.in/w/section-22-218'
};
export const IN_ROUNDING_SOURCE = {
	title: 'Income Tax Department: Income-tax Act, 2025, section 516 (rounding off)',
	url: 'https://www.incometaxindia.gov.in/w/section-516-3'
};
export const IN_HRA_SOURCE = {
	title: 'Income Tax Department: Income-tax Rules, 2026, rule 279 (HRA limits)',
	url: 'https://www.incometaxindia.gov.in/w/rule-279-1'
};
export const IN_GRATUITY_TAX_FAQ_SOURCE = {
	title: 'Income Tax Department FAQ: gratuity exemption limit of Rs 20 lakh',
	url: 'https://www.incometaxindia.gov.in/w/what-is-the-effective-date-of-enhancement-of-limit-of-gratuity-from-rs-10-lakh-to-20-lakh-for-purpose-of-tax-exemption-computation-under-section-10-10-ii-'
};
export const IN_LABOUR_FAQ_SOURCE = {
	title: 'Ministry of Labour and Employment: FAQs on the Labour Codes (gratuity, wages)',
	url: 'https://www.labour.gov.in/static/uploads/2026/01/de4758d5bfeffc456d7de97a801891b0.pdf'
};
export const IN_EPF_CEILING_SOURCE = {
	title: 'BDO India: EPF wage ceiling raised to Rs 25,000 (S.O. 5109(E), 17 September 2026)',
	url: 'https://www.bdo.in/en-gb/insights/alerts-updates/alert-new-epf-ceiling-hiked'
};

// ---------------------------------------------------------------------------------------------
// Slabs
// ---------------------------------------------------------------------------------------------

export interface Slab {
	/** Upper edge of the slab (income up to and including this amount). */
	upTo: number;
	rate: number;
}

/**
 * New regime (section 202(1), the default). Same for every age.
 * Source: https://www.incometaxindia.gov.in/w/section-202-76 : nil to 4,00,000; 5% to 8,00,000;
 * 10% to 12,00,000; 15% to 16,00,000; 20% to 20,00,000; 25% to 24,00,000; 30% above 24,00,000.
 * Second source: ClearTax income-tax slabs page (same table, FY 2026-27 unchanged by Budget 2026).
 */
export const NEW_REGIME_SLABS: Slab[] = [
	{ upTo: 400_000, rate: 0 },
	{ upTo: 800_000, rate: 0.05 },
	{ upTo: 1_200_000, rate: 0.1 },
	{ upTo: 1_600_000, rate: 0.15 },
	{ upTo: 2_000_000, rate: 0.2 },
	{ upTo: 2_400_000, rate: 0.25 },
	{ upTo: Infinity, rate: 0.3 }
];

export type AgeGroup = 'below60' | 'age60to79' | 'age80plus';

/**
 * Old regime (opt-out) slabs for residents.
 * Source: https://www.incometaxindia.gov.in/w/tax-rates%E2%80%8B (Income Tax Dept "Tax rates"):
 *  below 60: nil to 2,50,000, 5% to 5,00,000, 20% to 10,00,000, 30% above.
 *  60 to below 80: nil to 3,00,000, 5% to 5,00,000, 20% to 10,00,000, 30% above.
 *  80 and above: nil to 5,00,000, 20% to 10,00,000, 30% above.
 * Basic exemption limits also on https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act
 * (2,50,000 / 3,00,000 / 5,00,000). Second source: ClearTax slabs page.
 */
export const OLD_REGIME_SLABS: Record<AgeGroup, Slab[]> = {
	below60: [
		{ upTo: 250_000, rate: 0 },
		{ upTo: 500_000, rate: 0.05 },
		{ upTo: 1_000_000, rate: 0.2 },
		{ upTo: Infinity, rate: 0.3 }
	],
	age60to79: [
		{ upTo: 300_000, rate: 0 },
		{ upTo: 500_000, rate: 0.05 },
		{ upTo: 1_000_000, rate: 0.2 },
		{ upTo: Infinity, rate: 0.3 }
	],
	age80plus: [
		{ upTo: 500_000, rate: 0 },
		{ upTo: 1_000_000, rate: 0.2 },
		{ upTo: Infinity, rate: 0.3 }
	]
};

export const AGE_OPTIONS = [
	{ label: 'Below 60', value: 'below60' },
	{ label: '60 to 79', value: 'age60to79' },
	{ label: '80 and above', value: 'age80plus' }
];

// ---------------------------------------------------------------------------------------------
// Rebate (old 87A, now section 156)
// ---------------------------------------------------------------------------------------------

/**
 * Section 156(2): new regime, total income up to 12,00,000 gets a rebate of 100% of tax or 60,000,
 * whichever is less; above 12,00,000 the tax is limited to the amount of income over 12,00,000
 * (marginal relief). Source: https://www.incometaxindia.gov.in/w/section-156-84
 */
export const NEW_REGIME_REBATE_LIMIT = 1_200_000;
export const NEW_REGIME_REBATE_MAX = 60_000;
/**
 * Section 156(1): old regime, total income up to 5,00,000 gets a rebate of 100% of tax or 12,500,
 * whichever is less. There is no marginal relief in the old regime.
 * Source: https://www.incometaxindia.gov.in/w/section-156-84
 */
export const OLD_REGIME_REBATE_LIMIT = 500_000;
export const OLD_REGIME_REBATE_MAX = 12_500;

// ---------------------------------------------------------------------------------------------
// Surcharge and cess
// ---------------------------------------------------------------------------------------------

export interface SurchargeBand {
	/** Surcharge applies when total income EXCEEDS this amount. */
	above: number;
	rate: number;
}

/**
 * Surcharge on income tax for individuals, subject to marginal relief.
 * Source: https://www.incometaxindia.gov.in/w/threshold-limits-under-income-tax-act (reflects Finance Act 2026):
 * 10% above 50 lakh, 15% above 1 crore, 25% above 2 crore, 37% above 5 crore, or 25% if the new regime applies.
 * Second source: ClearTax / BankBazaar surcharge tables (same).
 */
export const SURCHARGE_OLD: SurchargeBand[] = [
	{ above: 5_000_000, rate: 0.1 },
	{ above: 10_000_000, rate: 0.15 },
	{ above: 20_000_000, rate: 0.25 },
	{ above: 50_000_000, rate: 0.37 }
];
/** New regime: highest surcharge is 25% (no 37% band). */
export const SURCHARGE_NEW: SurchargeBand[] = [
	{ above: 5_000_000, rate: 0.1 },
	{ above: 10_000_000, rate: 0.15 },
	{ above: 20_000_000, rate: 0.25 }
];

/** Health and education cess: 4% of income tax plus surcharge, both regimes. Source: Income Tax Dept "Tax rates" page. */
export const CESS_RATE = 0.04;

// ---------------------------------------------------------------------------------------------
// Salary deductions and Chapter VIII (old Chapter VI-A) caps
// ---------------------------------------------------------------------------------------------

/**
 * Section 19, Table Sl. No. 2: standard deduction is the lesser of Rs 75,000 or the salary where tax is
 * computed under section 202(1) (new regime); otherwise the lesser of Rs 50,000 or the salary.
 * Source: https://www.incometaxindia.gov.in/w/section-19-206
 */
export const STANDARD_DEDUCTION_NEW = 75_000;
export const STANDARD_DEDUCTION_OLD = 50_000;

/** Section 19, Table Sl. No. 1: tax on employment (professional tax) deductible in full. Old regime only
 *  (disallowed in the new regime; source: Taxheal list of deductions under the new regime, plus section 202(2)). */

/** Section 123 (old 80C): total deduction capped at Rs 1,50,000. Source: https://www.incometaxindia.gov.in/w/section-123-96 */
export const CAP_80C = 150_000;
/** Section 124(3) (old 80CCD(1B)): extra Rs 50,000 for own NPS contribution. Source: https://www.incometaxindia.gov.in/w/section-124-98 */
export const CAP_NPS_EXTRA = 50_000;
/**
 * Section 124(1)-(2) (old 80CCD(2)): employer NPS contribution up to 14% of salary (basic + DA) for a
 * Government employer, 10% for others; 14% for everyone where tax is under section 202(1) (new regime).
 * Source: https://www.incometaxindia.gov.in/w/section-124-98
 */
export const EMPLOYER_NPS_PCT_GOVT = 0.14;
export const EMPLOYER_NPS_PCT_OTHER_OLD = 0.1;
export const EMPLOYER_NPS_PCT_NEW = 0.14;
/**
 * Section 126 (old 80D): self and family up to 25,000 (50,000 if a senior citizen) and parents up to
 * 25,000 (50,000 if a senior citizen); overall each side is capped at 50,000, so the most anyone can
 * claim is 1,00,000. Source: https://www.incometaxindia.gov.in/w/section-126-92
 */
export const CAP_80D_TOTAL = 100_000;
/**
 * Section 22(2) (old 24(b)): interest on a loan for a self-occupied house, capped at Rs 2,00,000
 * when the house is completed within 5 years of the loan year (else Rs 30,000).
 * Source: https://www.incometaxindia.gov.in/w/section-22-218 (also ITR-1 instructions: max house
 * property loss set off Rs 2,00,000, notification G.S.R. 226(E) of 30 March 2026).
 * Not available in the new regime (section 202(2)).
 */
export const CAP_HOME_LOAN_INTEREST = 200_000;

// ---------------------------------------------------------------------------------------------
// HRA (Schedule III Table Sl. No. 11, Income-tax Rules 2026 rule 279)
// ---------------------------------------------------------------------------------------------

/**
 * Rule 279 (Income-tax Rules, 2026): exemption is the least of (a) allowance received, (b) rent paid
 * above one-tenth of salary, (c) 50% of salary in Mumbai, Kolkata, Delhi, Chennai, Hyderabad, Pune,
 * Ahmedabad and Bengaluru, 40% elsewhere. "Salary" includes DA where the terms of employment provide
 * for it and excludes all other allowances and perquisites.
 * Source: https://www.incometaxindia.gov.in/w/rule-279-1
 * (Second source: ClearTax HRA guide and Moneylife report on the Income-tax Rules 2026 -
 * Hyderabad, Pune, Ahmedabad and Bengaluru were ADDED to the old four metros.)
 */
export const HRA_METRO_CITIES = [
	'Mumbai',
	'Delhi',
	'Kolkata',
	'Chennai',
	'Bengaluru',
	'Hyderabad',
	'Pune',
	'Ahmedabad'
];
export const HRA_METRO_PCT = 0.5;
export const HRA_OTHER_PCT = 0.4;
export const HRA_RENT_DEDUCT_PCT = 0.1;

// ---------------------------------------------------------------------------------------------
// EPF and gratuity provision (in-hand salary)
// ---------------------------------------------------------------------------------------------

/**
 * EPF / EPS / EDLI statutory wage ceiling: Rs 25,000 a month (raised from Rs 15,000) by notification
 * S.O. 5109(E) dated 17 September 2026, effective that date.
 * Sources: BDO India alert (https://www.bdo.in/en-gb/insights/alerts-updates/alert-new-epf-ceiling-hiked),
 * KPMG Flash News FAQs on EPFO Wage Ceiling Limit (September 2026), CAclubindia summary of the EPFO FAQs.
 * The official notification itself could not be opened from here; confirm on epfindia.gov.in.
 */
export { EPF_WAGE_CEILING } from './in-epf';
/** Employee contribution 12% of PF wages; employer 12% (8.33% EPS + 3.67% EPF). Rates unchanged. */
export const EPF_EMPLOYEE_RATE = 0.12;
export const EPF_EMPLOYER_RATE = 0.12;
/**
 * Gratuity provision in a CTC: 15/26 x 1/12 of basic = 4.81% (rounded, as employers conventionally use).
 * This is the standard CTC convention, not a statutory rate.
 */
export const GRATUITY_PROVISION_RATE = 0.0481;

export interface PtState {
	value: string;
	label: string;
	/** Total professional tax for a full year at the top slab. */
	annual: number;
	/** The preset is only valid when gross monthly pay is at least this much (the top slab). */
	minMonthly: number;
}
/**
 * Professional tax is set by each state and varies by salary slab. Only the TOP slab of states whose
 * figure agreed across independent payroll sources is offered, and only when monthly gross reaches
 * that slab; otherwise the person is asked to use the custom amount. States not listed: use custom.
 *  - Maharashtra: Rs 200 a month, Rs 300 in February (annual Rs 2,500), above Rs 10,000 a month
 *    (women exempt up to Rs 25,000). Sources: TM Services PT guide 2026, SalaryBox PT guide 2026-27, Savvy HRMS.
 *  - Karnataka: Rs 200 a month from Rs 25,000, Rs 300 in February (annual Rs 2,500), revised 1 April 2025.
 *    Sources: TM Services PT guide 2026, Saral PT guide.
 *  - Gujarat: Rs 200 a month above Rs 12,000. Sources: TM Services, Saral, Savvy HRMS.
 *  - West Bengal: Rs 200 a month above Rs 40,000. Sources: TM Services, Saral, SalaryBox.
 * The national ceiling is Rs 2,500 a year (Article 276 of the Constitution).
 */
export const PT_STATES: PtState[] = [
	{ value: 'none', label: 'None / no professional tax', annual: 0, minMonthly: 0 },
	{ value: 'MH', label: 'Maharashtra (top slab)', annual: 2_500, minMonthly: 10_001 },
	{ value: 'KA', label: 'Karnataka (Rs 25,000+ a month)', annual: 2_500, minMonthly: 25_000 },
	{ value: 'GJ', label: 'Gujarat (above Rs 12,000 a month)', annual: 2_400, minMonthly: 12_001 },
	{ value: 'WB', label: 'West Bengal (above Rs 40,000 a month)', annual: 2_400, minMonthly: 40_001 },
	{ value: 'custom', label: 'Other state: enter amount', annual: 0, minMonthly: 0 }
];

// ---------------------------------------------------------------------------------------------
// Gratuity
// ---------------------------------------------------------------------------------------------

/**
 * Gratuity is now governed by the Code on Social Security, 2020 (in force from 21 November 2025,
 * replacing the Payment of Gratuity Act, 1972). Formula unchanged: 15 days' wages for every completed
 * year of service or part over six months, with the day-rate wages / 26. Maximum Rs 20 lakh.
 * Sources: Ministry of Labour FAQs on the Labour Codes (Q8, Q9, Q12), labour.gov.in compliance
 * handbook, Numerica / labour law reporter summaries.
 * Employees covered: 5 years' continuous service (not needed on death or disablement); fixed-term
 * employees qualify after 1 year.
 */
export const GRATUITY_DAYS_PER_YEAR = 15;
export const GRATUITY_DIVISOR_COVERED = 26;
/** Employees not covered: half a month's salary (15/30) per completed year. Section 19 Table Sl. No. 6. */
export const GRATUITY_DIVISOR_NOT_COVERED = 30;
export const GRATUITY_MIN_YEARS = 5;
export const GRATUITY_MIN_YEARS_FIXED_TERM = 1;
/**
 * Tax-free gratuity limit: Rs 20,00,000 across all employers (CBDT notification S.O. 1420(E) of
 * 29 March 2018 for covered employees, S.O. 1213(E) of 8 March 2019 for others).
 * Source: https://www.incometaxindia.gov.in/w/what-is-the-effective-date-of-enhancement-of-limit-of-gratuity-from-rs-10-lakh-to-20-lakh-for-purpose-of-tax-exemption-computation-under-section-10-10-ii-
 * The statutory maximum payable under the Code is also Rs 20 lakh (Ministry of Labour FAQ Q12).
 */
export const GRATUITY_CAP = 2_000_000;
