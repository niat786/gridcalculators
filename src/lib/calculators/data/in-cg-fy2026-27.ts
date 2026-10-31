/**
 * India: capital gains tax and advance tax figures for tax year (FY) 2026-27.
 *
 * Verified 2026-10-28 on incometaxindia.gov.in (Income-tax Act, 2025, in force from 1 April 2026).
 *
 * SECTION MAP (old Income-tax Act 1961 -> Income-tax Act 2025):
 *   111A (STCG on STT-paid equity)  -> section 196        112A (LTCG on STT-paid equity) -> section 198
 *   112  (other LTCG)               -> section 197        45 (charge)                    -> section 67
 *   "short-term capital asset"      -> section 2(101)     50AA (debt funds, MLDs)        -> carried over (Finance Act 2024 amendment)
 *   207 (who pays advance tax)      -> section 403        208 (Rs 10,000 test)           -> section 404
 *   211 (instalments and dates)     -> section 408        234C (interest on deferment)   -> section 425
 * The rates did not change with the new Act, only the section numbers.
 *
 * NOT MODELLED by the calculators using this file (they say so on the page):
 * set-off and carry-forward of capital losses, reinvestment exemptions (old 54, 54EC, 54F), the basic-exemption
 * shortfall adjustment, non-residents, TDS on the sale, tax on units/bonds bought before 1 April 2023 that
 * are not covered below, interest under old 234B, and the section 425(4) relief for late-arising capital gains.
 */
import { CESS_RATE } from './in-tax-fy2026-27';

export const CG_TAX_YEAR_LABEL = 'FY 2026-27';
export { CESS_RATE };

// ---------------------------------------------------------------------------------------------
// Capital gains: rates (transfers on or after 23 July 2024)
// ---------------------------------------------------------------------------------------------

/**
 * Sale date from which the rates below apply. The Finance (No. 2) Act 2024 changed the rates for transfers made
 * on or after 23 July 2024, and the Income-tax Act 2025 kept them. Earlier sales are refused by the calculator.
 */
export const CG_RATES_FROM = '2024-07-23';

/**
 * Section 196 (Income-tax Act 2025): "Tax on short-term capital gains in certain cases" - 20% on short-term gains from
 * an equity share, a unit of an equity-oriented fund or a unit of a business trust where STT is paid.
 * Source: https://www.incometaxindia.gov.in/w/section-196-78
 */
export const STCG_EQUITY_RATE_PCT = 20;

/**
 * Section 197: "Tax on long-term capital gains" - 12.5% on long-term capital gains (no indexation).
 * Source: https://www.incometaxindia.gov.in/w/section-197-78
 * Section 198: 12.5% on STT-paid long-term gains from listed equity shares, equity-oriented funds and business
 * trust units, on the amount ABOVE Rs 1,25,000 in the tax year.
 * Source: https://www.incometaxindia.gov.in/w/section-198-78
 */
export const LTCG_RATE_PCT = 12.5;
export const LTCG_EQUITY_EXEMPTION = 125_000;

/**
 * Section 197(3): for a resident individual or HUF transferring land, building or both acquired BEFORE 23 July 2024,
 * the tax is the lower of (A) 12.5% on the gain without indexation and (B) 20% on the gain with indexed cost of
 * acquisition and indexed cost of improvement (the excess of A over B is ignored).
 * Source: https://www.incometaxindia.gov.in/w/section-197-78
 */
export const LTCG_INDEXED_RATE_PCT = 20;
export const INDEXATION_PURCHASED_BEFORE = '2024-07-23';

/**
 * Debt funds ("specified mutual funds") bought on or after 1 April 2023 and market-linked debentures:
 * the gain is deemed short-term whatever the holding period and is taxed at slab rates
 * (old section 50AA, amended by the Finance (No. 2) Act 2024). From 1 April 2026 a specified mutual fund is one that
 * invests more than 65% of its proceeds in debt and money-market instruments (or in such a fund).
 * Source: https://www.incometaxindia.gov.in/w/section-21-110
 */
export const DEBT_FUND_DEEMED_STCG_FROM = '2023-04-01';

// ---------------------------------------------------------------------------------------------
// Holding periods: section 2(101)
// ---------------------------------------------------------------------------------------------

/**
 * "Short-term capital asset" = held for NOT MORE than 24 months before the transfer; for securities listed on a
 * recognised stock exchange in India, units of UTI, units of an equity-oriented fund and zero coupon bonds the
 * period is 12 months. Unlisted shares are not in the 12-month list, so they use 24 months.
 * Source (text of clause 101, quoted by TaxClue):
 * https://www.taxclue.in/blog/section-2-income-tax-act-2025-definitions-short-term-capital-asset-slump-sale-transfer-and-virtual-digital-asset/
 * Second source: Studycafe overview of the new capital gains structure and the Zeroinfy summary of section 67
 * (12 months listed equity / equity fund units, 24 months everything else).
 */
export const HOLDING_MONTHS_LISTED = 12;
export const HOLDING_MONTHS_OTHER = 24;

// ---------------------------------------------------------------------------------------------
// Cost Inflation Index
// ---------------------------------------------------------------------------------------------

/**
 * Cost Inflation Index by financial year (key = the year the FY starts, e.g. 2026 = FY 2026-27).
 * Source: Income Tax Department "Cost Inflation Index" page, Notification No. 85/2026 dated 15-07-2026 under
 * section 72(8)(a) of the Income-tax Act, 2025: 2001-02 = 100 ... 2025-26 = 376, 2026-27 = 384.
 * https://www.incometaxindia.gov.in/w/cost-inflation-index
 * Second source: Business Today, 16 Jul 2026, "CBDT notifies Cost Inflation Index of 384 for FY27".
 */
export const CII: Record<number, number> = {
	2001: 100,
	2002: 105,
	2003: 109,
	2004: 113,
	2005: 117,
	2006: 122,
	2007: 129,
	2008: 137,
	2009: 148,
	2010: 167,
	2011: 184,
	2012: 200,
	2013: 220,
	2014: 240,
	2015: 254,
	2016: 264,
	2017: 272,
	2018: 280,
	2019: 289,
	2020: 301,
	2021: 317,
	2022: 331,
	2023: 348,
	2024: 363,
	2025: 376,
	2026: 384
};
export const CII_FIRST_FY_START = 2001;
export const CII_LATEST_FY_START = 2026;
export const CII_NOTIFICATION = 'Notification No. 85/2026 dated 15 July 2026';

// ---------------------------------------------------------------------------------------------
// Advance tax
// ---------------------------------------------------------------------------------------------

/**
 * Section 404: advance tax is payable only if the tax payable for the year is Rs 10,000 or more.
 * Source: https://www.incometaxindia.gov.in/w/section-404-6
 */
export const ADVANCE_TAX_THRESHOLD = 10_000;

/**
 * Section 403: advance tax does not apply to a resident individual aged 60 or more at any time in the tax year
 * who has no income chargeable under "Profits and gains of business or profession".
 * Source: https://www.incometaxindia.gov.in/w/section-403-6
 */
export const ADVANCE_TAX_SENIOR_AGE = 60;

export interface Instalment {
	/** ISO due date. */
	due: string;
	/** Cumulative share of the year's advance tax that must be paid by this date, %. */
	cumulativePct: number;
	/** Months of interest charged on a shortfall at this instalment. */
	interestMonths: number;
}

/**
 * Section 408(1): not less than 15% by 15 June, 45% by 15 September, 75% by 15 December, 100% by 15 March
 * (cumulative). Section 408(2): an assessee declaring presumptive profits under section 58(2), Table Sl. No. 1
 * (eligible business) or 3 (specified profession), pays the whole amount by 15 March.
 * Source: https://www.incometaxindia.gov.in/w/section-408-6
 * Second source: India Briefing, "Advance Tax under India's Income-tax Act, 2025: Checklist for TY 2026-27".
 *
 * Section 425(1): interest of 3% (1% a month for 3 months) on the shortfall at 15 June, 15 September and 15 December,
 * and 1% (one month) at 15 March. Source: https://www.incometaxindia.gov.in/w/section-425-6
 */
export const INSTALMENTS_FY2026_27: Instalment[] = [
	{ due: '2026-06-15', cumulativePct: 15, interestMonths: 3 },
	{ due: '2026-09-15', cumulativePct: 45, interestMonths: 3 },
	{ due: '2026-12-15', cumulativePct: 75, interestMonths: 3 },
	{ due: '2027-03-15', cumulativePct: 100, interestMonths: 1 }
];

/** Interest on an advance-tax shortfall, % per month, simple interest (section 425). */
export const ADVANCE_TAX_INTEREST_PCT_PER_MONTH = 1;

/**
 * Section 425(2): no interest for the 15 June / 15 September shortfall if the advance tax paid by that date is at
 * least 12% / 36% of the tax due on the returned income.
 * Source: https://www.incometaxindia.gov.in/w/section-425-6
 */
export const SAFE_HARBOUR_PCT = { '2026-06-15': 12, '2026-09-15': 36 } as Record<string, number>;

// ---------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------

export const SEC196_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 196 (STCG on equity)', url: 'https://www.incometaxindia.gov.in/w/section-196-78' };
export const SEC197_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 197 (long-term capital gains)', url: 'https://www.incometaxindia.gov.in/w/section-197-78' };
export const SEC198_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 198 (LTCG on equity above Rs 1.25 lakh)', url: 'https://www.incometaxindia.gov.in/w/section-198-78' };
export const CII_SOURCE = { title: 'Income Tax Department: Cost Inflation Index (up to FY 2026-27)', url: 'https://www.incometaxindia.gov.in/w/cost-inflation-index' };
export const SEC403_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 403 (liability for advance tax)', url: 'https://www.incometaxindia.gov.in/w/section-403-6' };
export const SEC404_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 404 (Rs 10,000 condition)', url: 'https://www.incometaxindia.gov.in/w/section-404-6' };
export const SEC408_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 408 (instalments and due dates)', url: 'https://www.incometaxindia.gov.in/w/section-408-6' };
export const SEC425_SOURCE = { title: 'Income Tax Department: Income-tax Act, 2025, section 425 (interest for deferment of advance tax)', url: 'https://www.incometaxindia.gov.in/w/section-425-6' };
