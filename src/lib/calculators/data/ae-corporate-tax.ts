/**
 * UAE federal corporate tax, Federal Decree-Law No. 47 of 2022 (as amended). Verified 2026-10-28.
 * The Federal Tax Authority home pages could not be fetched from this environment, so every figure below was confirmed in
 * at least two independent sources: PwC Worldwide Tax Summaries (UAE, last reviewed 9 Sep 2026), ClearTax UAE guide, and the
 * FTA's own Small Business Relief page (tax.gov.ae), which was fetched.
 */

/** Taxable income up to this amount is taxed at 0% (PwC: "Taxable income not exceeding AED 375,000"). */
export const AE_CT_ZERO_BAND = 375_000;
/** Taxable income above the band is taxed at 9% (PwC; ClearTax example: AED 1,000,000 gives AED 56,250). */
export const AE_CT_RATE = 0.09;

/**
 * Small Business Relief. FTA page (tax.gov.ae, Small Business Relief): a resident person may elect for each tax period if
 * "Revenue equal to or less than AED 3,000,000 in both the current and all previous Tax Periods"; it is "treated as not
 * having derived any Taxable Income"; other reliefs and deductions are not available. Excluded: a Qualifying Free Zone
 * Person and a member of a multinational group with consolidated revenue of more than AED 3.15 billion (EUR 750m).
 * Ministerial Decision No. 73 of 2023 set the AED 3m threshold and an end date of tax periods ending on or before
 * 31 Dec 2026. Ministerial Decision No. 131 of 2026 (announced 7 Aug 2026; The National, Khaleej Times, Entrepreneur
 * Middle East) extended it to tax periods ending on or before 31 Dec 2029; the threshold is unchanged. (Older guides, such
 * as ClearTax, still show 2026.)
 */
export const AE_SBR_REVENUE_LIMIT = 3_000_000;
export const AE_SBR_LAST_PERIOD_END = '2029-12-31';
export const AE_SBR_LAST_PERIOD_END_LABEL = '31 December 2029';
export const AE_SBR_MNE_REVENUE_AED = 3_150_000_000;

/**
 * Qualifying Free Zone Person (QFZP): 0% on qualifying income and 9% on non-qualifying income (PwC; ClearTax). The 0% band
 * of AED 375,000 does not apply to the non-qualifying part (ClearTax). A de minimis test limits non-qualifying revenue to
 * the lower of AED 5,000,000 or 5% of total revenue (ClearTax); failing it, or other conditions, loses QFZP status.
 */
export const AE_QFZP_DE_MINIMIS_AED = 5_000_000;
export const AE_QFZP_DE_MINIMIS_PCT = 5;

/**
 * Domestic Minimum Top-up Tax (DMTT): Federal Decree-Law No. 60 of 2023, financial years starting on or after 1 Jan 2025,
 * for UAE entities of groups with consolidated revenue of at least EUR 750 million in at least two of the four preceding
 * years; 15% minimum effective tax rate; rules in Cabinet Decision No. 142 of 2024 (PwC; ClearTax; Alvarez & Marsal).
 */
export const AE_DMTT_RATE_PCT = 15;
export const AE_DMTT_THRESHOLD_EUR_M = 750;
export const AE_DMTT_FROM = '1 January 2025';

export const AE_CT_LAW_LABEL = 'Federal Decree-Law No. 47 of 2022';

export const AE_CT_SOURCES = [
	{ title: 'PwC Worldwide Tax Summaries: United Arab Emirates, taxes on corporate income', url: 'https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income' },
	{ title: 'Federal Tax Authority: Small Business Relief', url: 'https://tax.gov.ae/en/taxes/corporate.tax/corporate.tax.topics/small.business.relief.23.aspx' },
	{ title: 'The National: UAE extends corporate tax relief for small businesses until 2029 (Ministerial Decision 131)', url: 'https://thenationalnews.com/business/economy/2026/08/07/uae-extends-corporate-tax-relief-for-small-businesses-until-2029' },
	{ title: 'ClearTax: Corporate tax in the UAE (rates, QFZP, DMTT)', url: 'https://www.cleartax.com/ae/corporate-tax-in-uae' }
];
