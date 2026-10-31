/**
 * Bangladesh: individual income tax under the Finance Act 2026 (Budget presented 11 June 2026, Finance Bill passed by
 * Parliament on 29 June 2026, in force from 1 July 2026), as of 2026-10-28.
 *
 * Which year: the Act sets the same rates and tax-free limits for assessment year (AY) 2026-27 (income earned 1 July 2025 to
 * 30 June 2026, returns due now) and AY 2027-28 (income earned 1 July 2026 to 30 June 2027). The calculator is labelled AY 2027-28.
 *
 * Verified 2026-10-28. nbr.gov.bd could not be reached from the build environment (the egress proxy refuses it), so every figure
 * is confirmed in at least two independent reputable sources (named above each figure). Parliament RAISED the general
 * tax-free limit from the Budget's Tk 375,000 to Tk 400,000 before passing the bill (The Daily Star, Bangladesh Post,
 * Bd24Live, The Report, Roy Law Nexus), and the category limits moved up by the same Tk 25,000 (PwC Bangladesh's
 * Finance Act 2026 summary, Roy Law Nexus, Ramco). Articles that still show Tk 375,000, 425,000, 500,000 or 525,000 describe the
 * original proposal or the earlier year.
 *
 * NOT MODELLED (said on the page): the net-wealth surcharge (10% to 35% of tax for net wealth above Tk 40 million, or more than
 * one car, or a large house), the environmental surcharge on cars, the instrument-by-instrument caps inside the investment
 * rebate (you enter the eligible amount), non-residents (30% for non-resident foreigners), income taxed at special or final
 * rates (dividends 15%, etc.), tax already deducted at source, the early-filing incentive and late-filing surcharge, and any
 * exemptions beyond the general salary exemption.
 */

export const BD_TAX_YEAR_LABEL = 'AY 2027-28';
export const BD_TAX_YEAR_LONG = 'assessment year 2027-28 (income year 1 July 2026 to 30 June 2027)';

export const BD_PWC_SOURCE = {
	title: 'PwC Bangladesh: Finance Act, 2026, key amendments',
	url: 'https://www.pwc.com/bd/en/assets/pdfs/budget/finance-act-2026-key-amendments.pdf'
};
export const BD_KPMG_SOURCE = {
	title: 'KPMG Bangladesh: salient features of Finance Bill 2026 (tax and VAT)',
	url: 'https://assets.kpmg.com/content/dam/kpmg/bd/pdf/Salient_features_of_Finance_Bill_2026(Tax-and_VAT).pdf'
};
export const BD_ROY_SOURCE = {
	title: 'Roy Law Nexus: Bangladesh income tax guide 2026-27 (Finance Act amendments)',
	url: 'https://roylawnexus.com/legal-insights/bangladesh-income-tax-2026-finance-act-amendments'
};
export const BD_DAILY_STAR_SOURCE = {
	title: 'The Daily Star: Finance Bill passed, tax-free income threshold set at Tk 4 lakh',
	url: 'https://www.thedailystar.net/business/bangladesh-budget-2025-26/news/finance-bill-passed-tax-free-income-threshold-set-tk-4-lakh-fy2026-27-4211511'
};
export const BD_RAMCO_SOURCE = {
	title: 'Ramco: Bangladesh payroll and tax compliance (Budget 2026, minimum tax, salary exemption)',
	url: 'https://www.ramco.com/payce/payroll-compliance-bangladesh'
};
export const BD_PROTHOM_ALO_SOURCE = {
	title: 'Prothom Alo: budget 2026-27 tax-free limit and slabs (11 June 2026)',
	url: 'https://en.prothomalo.com/business/local/0sug1clq5v'
};

export type BdCategory = 'general' | 'women' | 'disabled' | 'third' | 'fighter';

export const BD_CATEGORIES: { value: BdCategory; label: string; threshold: number }[] = [
	// PwC Bangladesh (table for AY 2026-27 and AY 2027-28), Roy Law Nexus, Ramco; Daily Star for the general limit.
	{ value: 'general', label: 'General taxpayer', threshold: 400_000 },
	{ value: 'women', label: 'Woman, or aged 65 or more', threshold: 450_000 },
	{ value: 'disabled', label: 'Person with a disability', threshold: 525_000 },
	{ value: 'third', label: 'Third-gender taxpayer', threshold: 525_000 },
	{ value: 'fighter', label: 'Gazetted war-wounded freedom fighter or July fighter', threshold: 550_000 }
];

// KPMG, Prothom Alo, Roy Law Nexus and Ramco: a parent or legal guardian of a person with a disability gets Tk 50,000 more
// (Prothom Alo: per dependent child or ward; KPMG: only one of two taxpaying parents can claim). Modelled for one dependant.
export const BD_DISABLED_DEPENDANT_EXTRA = 50_000;

export interface BdSlab {
	/** Width of the slab in taka; null for the top, open-ended slab. */
	width: number | null;
	rate: number;
}

// PwC Bangladesh, KPMG, Roy Law Nexus, Ramco and Prothom Alo: after the tax-free limit, the next Tk 300,000 at 10%, next
// Tk 400,000 at 15%, next Tk 500,000 at 20%, next Tk 2,000,000 at 25%, and the rest at 30% (for AY 2026-27 and 2027-28; a
// 35% top rate starts from AY 2028-29). The old 5% slab is gone.
export const BD_SLABS: BdSlab[] = [
	{ width: 300_000, rate: 0.1 },
	{ width: 400_000, rate: 0.15 },
	{ width: 500_000, rate: 0.2 },
	{ width: 2_000_000, rate: 0.25 },
	{ width: null, rate: 0.3 }
];

// KPMG (Item 3: "For AY 2026-27 to AY 2030-31 – Taka 5,000. However, in case of new taxpayers – Taka 1,000"), Roy Law Nexus
// and Ramco: one minimum tax of Tk 5,000 (Tk 1,000 for a new taxpayer) for anyone whose income is above the tax-free limit,
// even if the rebate would take the tax lower. The earlier area-based minimums (Tk 5,000 in Dhaka North, Dhaka South and
// Chattogram city corporations, Tk 4,000 in other city corporations, Tk 3,000 elsewhere) no longer apply: Ramco says the
// flat amount applies "regardless of location".
export const BD_MIN_TAX = 5_000;
export const BD_MIN_TAX_NEW = 1_000;

// KPMG, Roy Law Nexus and Jural Acuity: the investment rebate is the lowest of 3% of total taxable income, 10% of the actual
// eligible investment (Sixth Schedule, Part 3), and Tk 750,000. PwC Bangladesh says the 15% / Tk 1 million qualifying
// amounts were reduced to 10% / Tk 750,000. Ramco gives the same new limits, gazetted 30 June 2026.
export const BD_REBATE_INCOME_PCT = 0.03;
export const BD_REBATE_INVESTMENT_PCT = 0.1;
export const BD_REBATE_MAX = 750_000;

// Ramco (employment income) and Arthonitee: the salary exemption is the lower of one-third of employment income and
// Tk 500,000 (raised from Tk 450,000 in the 2025 budget). Neither the Finance Act 2026 summaries (PwC, KPMG) nor Ramco
// report a change for 2026-27. This is the only figure confirmed in two secondary sources only, so the page tells people to
// switch it off if their own exemption differs.
export const BD_SALARY_EXEMPT_SHARE = 1 / 3;
export const BD_SALARY_EXEMPT_CAP = 500_000;

export const BD_SALARY_SOURCE = {
	title: 'Arthonitee: Bangladesh tax changes 2026-27 (salary exemption and planning rules)',
	url: 'https://www.arthonitee.com/guides/bangladesh-tax-changes-2026-27'
};
