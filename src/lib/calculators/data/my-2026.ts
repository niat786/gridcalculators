/**
 * Malaysia: resident individual income tax for the year of assessment 2026 (income earned 1 January to 31 December
 * 2026, filed in 2027) and EPF (KWSP) contribution rules, as in force on 2026-10-28.
 *
 * Verified 2026-10-28. hasil.gov.my, kwsp.gov.my and perkeso.gov.my could not be reached from the build environment
 * (the egress proxy refuses them), so every figure is confirmed in at least two independent reputable sources
 * (named above each figure; PwC's Malaysian Tax Booklet is the main one for tax).
 *
 * Budget 2027 (tabled October 2026) proposals, such as a RM12,000 self relief and lower 18%/24% rates for YA 2027, are
 * NOT law yet and apply to YA 2027, so they are NOT used here.
 *
 * NOT MODELLED (said on the page): non-resident rates (flat 30% on employment income), jointly assessed spouses and
 * the extra RM400 rebate for them, housing loan interest relief, disabled-child and disabled-spouse reliefs, the
 * zakat deduction against business income, and capital gains or dividend tax.
 */

export const MY_TAX_YEAR_LABEL = 'YA 2026';
export const MY_TAX_YEAR_LONG = 'year of assessment 2026 (income earned in 2026)';

export const MY_TAX_SOURCE = {
	title: 'PwC Malaysia: Malaysian Tax Booklet 2025/2026, personal income tax',
	url: 'https://www.pwc.com/my/en/publications/mtb/personal-income-tax.html'
};
export const MY_TAX_SOURCE_2 = {
	title: 'ClearTax Malaysia: Budget 2026 (personal tax rates unchanged for 2026)',
	url: 'https://www.cleartax.com/my/en/malaysia-budget-2026'
};
export const MY_TAX_SOURCE_3 = {
	title: 'Ecovis Malaysia: Tax Guide Malaysia (resident rate bands)',
	url: 'https://www.ecovis.com.my/?p=5749'
};
export const MY_RELIEF_SOURCE = {
	title: 'Landco: personal tax relief for YA 2026',
	url: 'https://landco.my/tax-relief-en/personal-tax-relief-2026/'
};
export const MY_RELIEF_SOURCE_2 = {
	title: 'The Sun: maximise your reliefs and deductions before Dec 31',
	url: 'https://thesun.my/business/local-business/tax-matters-maximise-your-reliefs-and-deduction-before-dec-31'
};

export interface MyTaxBand {
	/** Chargeable income above this amount (RM). */
	over: number;
	/** Marginal rate on income above `over`, up to the next band. */
	rate: number;
}

// PwC (YA 2026 column), Ecovis and the resident table on ClearTax (which confirms Budget 2026 left rates unchanged):
// first 5,000: 0%; next 15,000: 1%; next 15,000: 3%; next 15,000: 6%; next 20,000: 11%; next 30,000: 19%;
// next 300,000: 25%; next 200,000: 26%; next 1,400,000: 28%; above 2,000,000: 30%.
// (PwC prints a few cumulative figures that do not reconcile with these rates, e.g. 21,100 at RM150,000; the bands
// and rates agree across all three sources, so tax is computed from the bands, not from printed cumulative figures.)
export const MY_TAX_BANDS: MyTaxBand[] = [
	{ over: 0, rate: 0 },
	{ over: 5_000, rate: 0.01 },
	{ over: 20_000, rate: 0.03 },
	{ over: 35_000, rate: 0.06 },
	{ over: 50_000, rate: 0.11 },
	{ over: 70_000, rate: 0.19 },
	{ over: 100_000, rate: 0.25 },
	{ over: 400_000, rate: 0.26 },
	{ over: 600_000, rate: 0.28 },
	{ over: 2_000_000, rate: 0.3 }
];

// PwC: rebate of RM400 when chargeable income is RM35,000 or less. Zakat, fitrah and other Islamic dues paid are also a
// rebate of the actual amount paid. A rebate cannot reduce tax below zero and any excess is not refunded.
export const MY_REBATE_LIMIT = 35_000;
export const MY_REBATE_AMOUNT = 400;

// Personal reliefs (RM). Each cap is given by at least two of: PwC, Landco (YA 2026), The Sun (YA 2025 list).
export const MY_RELIEF_SELF = 9_000;
export const MY_RELIEF_DISABLED_SELF = 7_000;
export const MY_RELIEF_SPOUSE = 4_000;
export const MY_RELIEF_CHILD_UNDER_18 = 2_000;
export const MY_RELIEF_CHILD_18_PLUS_PRE_UNI = 2_000;
export const MY_RELIEF_CHILD_18_PLUS_HIGHER = 8_000;
// EPF contributions up to RM4,000; life insurance / takaful up to RM3,000 (Landco, The Sun, PwC).
export const MY_RELIEF_EPF_CAP = 4_000;
export const MY_RELIEF_LIFE_INSURANCE_CAP = 3_000;
// Education or medical insurance premiums up to RM4,000.
export const MY_RELIEF_MEDICAL_INSURANCE_CAP = 4_000;
// SOCSO and EIS contributions up to RM350.
export const MY_RELIEF_SOCSO_CAP = 350;
// Private retirement scheme (PRS) or deferred annuity up to RM3,000.
export const MY_RELIEF_PRS_CAP = 3_000;
// Net savings in SSPN (education savings) up to RM8,000.
export const MY_RELIEF_SSPN_CAP = 8_000;
// Childcare or kindergarten fees up to RM3,000 (child aged 6 or below at registered centres; Budget 2026 widens it to 12).
export const MY_RELIEF_CHILDCARE_CAP = 3_000;
// Medical expenses for serious diseases, fertility treatment and medical examinations (self, spouse, child) up to RM10,000.
export const MY_RELIEF_MEDICAL_CAP = 10_000;
// Medical, special-needs and carer expenses for parents up to RM8,000.
export const MY_RELIEF_PARENTS_CAP = 8_000;
// Own education fees (tertiary or approved courses) up to RM7,000.
export const MY_RELIEF_EDUCATION_CAP = 7_000;
// Lifestyle (books, phone, computer, internet, skills courses) up to RM2,500; sports up to RM1,000.
export const MY_RELIEF_LIFESTYLE_CAP = 2_500;
export const MY_RELIEF_SPORTS_CAP = 1_000;

/* ------------------------------------------------------------------ EPF */

export const MY_EPF_SOURCE = {
	title: 'Aniday: EPF, SOCSO and EIS contribution tables Malaysia 2026 (EPF Third Schedule bands)',
	url: 'https://aniday.com/en/malaysia/epf-socso-eis'
};
export const MY_EPF_SOURCE_2 = {
	title: 'LogMasuk: EPF contribution rate in Malaysia (rates, rounding up to the next ringgit)',
	url: 'https://logmasuk.my/epf-contribution-rate-in-malaysia/'
};
export const MY_EPF_SOURCE_3 = {
	title: 'web.hr: EPF contribution Malaysia 2026 (rates, foreign employees from October 2025)',
	url: 'https://web.hr/glossary/epf-contribution-malaysia'
};
export const MY_EPF_FOREIGN_SOURCE = {
	title: 'Payroll.my: mandatory 2% EPF contribution for foreign employees from October 2025',
	url: 'https://payroll.my/malaysia-employment-act/mandatory-2-epf-contribution-for-employers-foreign-employees-in-malaysia-effective-october-2025'
};
export const MY_EPF_DIVIDEND_SOURCE = {
	title: 'Malay Mail: EPF announces 6.15pc dividend for both conventional and Shariah savings for 2025',
	url: 'https://www.malaymail.com/news/malaysia/2026/02/28/epf-announces-615pc-dividend-for-both-conventional-shariah-savings-for-2025/210707'
};
export const MY_EPF_DIVIDEND_SOURCE_2 = {
	title: 'The Borneo Post: EPF delivers 6.15 pct dividend (declared 28 February 2026)',
	url: 'https://www.theborneopost.com/2026/03/13/epf-delivers-6-15-pct-dividend-while-reinforcing-long-term-savings-security/'
};

// Aniday (Part A of the Third Schedule), LogMasuk and web.hr: Malaysian citizen aged under 60.
// Employee 11% of wages. Employer 13% when monthly wages are RM5,000 or less, 12% when above RM5,000.
export const MY_EPF_EMPLOYEE_PCT = 11;
export const MY_EPF_EMPLOYER_PCT_LOW = 13;
export const MY_EPF_EMPLOYER_PCT_HIGH = 12;
export const MY_EPF_EMPLOYER_THRESHOLD = 5_000;
// Aniday: wages up to RM5,000 are in RM20 bands, RM5,000 to RM20,000 in RM100 bands, and the contribution for a band is the
// percentage of the band's upper limit (e.g. band 2,980.01 to 3,000 pays 330 employee and 390 employer; band 9,900.01 to
// 10,000 pays 1,100 and 1,200; LogMasuk: 500.01 to 520 pays 58 and 68). Above RM20,000 the percentage applies to actual wages.
export const MY_EPF_BAND_SMALL = 20;
export const MY_EPF_BAND_LARGE = 100;
export const MY_EPF_BAND_SMALL_LIMIT = 5_000;
export const MY_EPF_BAND_LIMIT = 20_000;
// Aniday: "The total contribution which includes cents shall be rounded to the next ringgit." (LogMasuk and Ajobthing agree.)
// Aniday, web.hr, LogMasuk and Payroll.my: non-Malaysian employees (except domestic servants) pay a mandatory 2% employee
// and 2% employer share on wages from October 2025 (first payment due 15 November 2025). Computed directly on wages,
// rounded up to the next ringgit. Aniday notes KWSP has published no scheduled increase.
export const MY_EPF_FOREIGN_PCT = 2;

// Malay Mail and The Borneo Post: EPF declared a 6.15% dividend for 2025 on both conventional and Shariah savings on
// 28 February 2026 (6.30% for 2024). The 2026 dividend is not declared until early 2027, so 2025 is the latest.
export const MY_EPF_LATEST_DIVIDEND = 6.15;
export const MY_EPF_LATEST_DIVIDEND_YEAR = 2025;
