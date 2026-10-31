/**
 * India: Sukanya Samriddhi, NSC, KVP, SCSS, Post Office MIS and NPS figures.
 * Verified 2026-10-28.
 *
 * RATES CHANGE EVERY QUARTER. The Ministry of Finance (Department of Economic Affairs) notifies them near the end of
 * each quarter. Next review: by 31 December 2026 for the January-March 2027 quarter. The rate on the day a fixed-term
 * certificate or account is opened stays fixed for that scheme (NSC, KVP, MIS, SCSS); SSY is reset every quarter.
 * Official page: https://www.nsiindia.gov.in/ and https://www.indiapost.gov.in/. The official rate table (O.M. No. 1/4/2019-NS dated
 * 30.09.2026) could not be opened from the build environment (the dea.gov.in page is blocked to robots and the NSI /
 * India Post rate pages are not reachable), so each rate below was confirmed in at least two independent
 * published sources that quote the O.M.
 */

export const SMALL_SAVINGS_PERIOD = 'October-December 2026 (Q3 of FY 2026-27)';
export const SMALL_SAVINGS_PERIOD_SHORT = 'Oct-Dec 2026';

/**
 * Rates for 1 Oct - 31 Dec 2026, % a year. The O.M. says the Q3 rates "shall remain unchanged from those notified for
 * the second quarter" (1 Jul - 30 Sep 2026).
 * Sources: Business Today, 30 Sep 2026 (SSY 8.2, SCSS 8.2, NSC 7.7, KVP 7.5, MIS 7.4):
 * https://www.businesstoday.in/personal-finance/story/small-savings-scheme-interest-rates-unchanged-for-q3-fy27-check-ppf-scss-ssy-rates-558892-2026-09-30
 * Free Press Journal (PTI), 30 Sep 2026 (NSC 7.7, SSY 8.2, MIS 7.4, KVP 7.5 maturing in 115 months):
 * https://www.freepressjournal.in/business/small-savings-interest-rates-unchanged-for-oct-dec-ppf-at-71-per-cent-nsc-at-77-pc
 * Richify (all five schemes, Oct-Dec 2026): https://www.richify.ai/in/small-savings-interest-rates
 * Also SCSS 8.2% (effective 1 Jul 2026) on Central Bank of India's SCSS page; MIS 7.4% on ClearTax's POMIS page.
 */
export const SSY_RATE = 8.2;
export const SCSS_RATE = 8.2;
export const NSC_RATE = 7.7;
export const KVP_RATE = 7.5;
export const MIS_RATE = 7.4;

/**
 * KVP: money doubles in 115 months at 7.5% (Free Press Journal / Richify above). Check: 12 x ln 2 / ln 1.075 = 115.01.
 */
export const KVP_MATURITY_MONTHS = 115;
export const KVP_TERM_NOTE = 'Doubles in 115 months at 7.5%';

/**
 * Sukanya Samriddhi Account: girl child under 10 at opening; Rs 250 minimum and Rs 1,50,000 maximum a financial year;
 * deposits for 15 years from opening; account matures 21 years from opening; interest compounded yearly.
 * Sources: NSI https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=27 ("girl child under 10 ... minimum Rs 250 and
 * maximum Rs 1,50,000 per financial year ... 21-year term"); Indian Bank SSA page
 * https://indianbank.bank.in/departments/sukanya-samriddhi-account/ (deposits for 15 years, matures at 21, compounded annually).
 */
export const SSY_MIN_DEPOSIT = 250;
export const SSY_MAX_DEPOSIT = 150_000;
export const SSY_DEPOSIT_YEARS = 15;
export const SSY_MATURITY_YEARS = 21;
export const SSY_MAX_OPENING_AGE = 9; // "under 10 years" at opening

/** NSC (VIII issue): 5 years; minimum Rs 1,000 in multiples of Rs 100, no maximum. Source: NSI page Id_Pk=27. */
export const NSC_TERM_YEARS = 5;
export const NSC_MIN = 1_000;
export const NSC_MULTIPLE = 100;

/** KVP: minimum Rs 1,000 in multiples of Rs 100, no maximum. Source: NSI page Id_Pk=27. */
export const KVP_MIN = 1_000;
export const KVP_MULTIPLE = 100;

/**
 * SCSS: Rs 1,000 minimum in multiples of Rs 1,000, Rs 30 lakh maximum across all SCSS accounts, 5 years (extendable by 3),
 * interest paid quarterly: it accrues to 31 Mar / 30 Jun / 30 Sep / 31 Dec and is paid on the first working day of April /
 * July / October / January. Sources: NSI https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=62 and Central Bank of India
 * https://centralbank.bank.in/en/Senior_Citizen_Deposit.
 */
export const SCSS_MIN = 1_000;
export const SCSS_MULTIPLE = 1_000;
export const SCSS_MAX = 3_000_000;
export const SCSS_TERM_YEARS = 5;
export const SCSS_PAYOUTS_PER_YEAR = 4;

/**
 * Post Office MIS: 5 years, minimum Rs 1,000 in multiples of Rs 1,000, maximum Rs 9 lakh single account and
 * Rs 15 lakh joint account, interest paid monthly. Source: NSI https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=27;
 * ClearTax https://cleartax.in/s/post-office-monthly-income-scheme-pomis-2 (single holders' accounts together
 * cannot exceed Rs 9 lakh).
 */
export const MIS_MIN = 1_000;
export const MIS_MULTIPLE = 1_000;
export const MIS_MAX_SINGLE = 900_000;
export const MIS_MAX_JOINT = 1_500_000;
export const MIS_TERM_YEARS = 5;

export const NSI_SOURCE = { title: 'National Savings Institute: schemes and limits', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=27' };
export const NSI_SCSS_SOURCE = { title: 'National Savings Institute: Senior Citizens Savings Scheme', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=62' };
export const SMALL_SAVINGS_RATE_SOURCE = {
	title: 'Business Today: small savings rates unchanged for Oct-Dec 2026 (quarter 3, FY 2026-27)',
	url: 'https://www.businesstoday.in/personal-finance/story/small-savings-scheme-interest-rates-unchanged-for-q3-fy27-check-ppf-scss-ssy-rates-558892-2026-09-30'
};
export const SMALL_SAVINGS_RATE_SOURCE_2 = {
	title: 'Free Press Journal (PTI): small savings rates for Oct-Dec 2026',
	url: 'https://www.freepressjournal.in/business/small-savings-interest-rates-unchanged-for-oct-dec-ppf-at-71-per-cent-nsc-at-77-pc'
};
export const SSY_SOURCE = { title: 'Indian Bank: Sukanya Samriddhi Account features', url: 'https://indianbank.bank.in/departments/sukanya-samriddhi-account/' };
export const SSY_EXAMPLE_SOURCE = { title: 'Jainam: Sukanya Samriddhi Yojana calculator (published Rs 1.5 lakh example)', url: 'https://www.jainam.in/sukanya-samriddhi-yojana-calculator/' };

// ---------------------------------------------------------------------------------------------
// NPS
// ---------------------------------------------------------------------------------------------

/**
 * PFRDA (Exits and Withdrawals under the NPS) (Amendment) Regulations, 2025, dated 12 Dec 2025, in force from Gazette
 * publication. NON-GOVERNMENT subscribers (All Citizen and Corporate models), normal exit at 60 (or after 15 years):
 *   corpus up to Rs 8 lakh      -> 100% may be taken as a lump sum, no annuity needed;
 *   Rs 8 lakh to Rs 12 lakh     -> up to Rs 6 lakh lump sum and the rest as annuity / systematic withdrawal, OR up to 80% lump sum and at least 20% annuity;
 *   above Rs 12 lakh            -> up to 80% lump sum, at least 20% annuity.
 * GOVERNMENT subscribers, normal exit: up to 60% lump sum, at least 40% annuity. Exit age raised to 85.
 * Sources: Business Today, 17 Dec 2025 https://www.businesstoday.in/personal-finance/retirement-planning/story/pfrda-eases-nps-exit-rules-for-non-government-subscribers-lowers-mandatory-annuity-to-20-507010-2025-12-17 ;
 * PTI via The Week, 17 Dec 2025 https://www.theweek.in/wire-updates/business/2025/12/17/dcm100-biz-pfrda-exit-norms.html ;
 * PB Partners (same table), https://www.pbpartners.com/articles/generic/new-nps-rules-by-pfrda
 * The PFRDA gazette text itself could not be opened; verify at https://www.pfrda.org.in/.
 */
export const NPS_NONGOV_MIN_ANNUITY_PCT = 20;
export const NPS_GOV_MIN_ANNUITY_PCT = 40;
export const NPS_NONGOV_FULL_LUMP_LIMIT = 800_000;
export const NPS_NORMAL_EXIT_AGE = 60;
export const NPS_MAX_AGE = 85;

/**
 * Tax: the NPS lump sum is tax-free only up to 60% of the corpus (old section 10(12A), carried into the Income-tax Act
 * 2025). The extra 20% a non-government subscriber can now take is taxed at slab rates until the law is amended;
 * Budget 2026 did not raise the tax-free limit. Annuity pension is taxed as income when received.
 * Sources: 1Finance https://1finance.co.in/1f-dashboard/?p=6881 ; Sahi https://www.sahi.com/blogs/what-is-nps-tax-benefits-new-withdrawal-rules-2026 ;
 * Nexdigm https://www.nexdigm.com/media/did-nps-subscriber-get-tax-deduction-on-additional-20-contribution-from-60-to-80/
 */
export const NPS_TAX_FREE_LUMP_PCT = 60;

export const NPS_SOURCE = {
	title: 'Business Today: PFRDA eases NPS exit rules, minimum annuity cut to 20% (Dec 2025)',
	url: 'https://www.businesstoday.in/personal-finance/retirement-planning/story/pfrda-eases-nps-exit-rules-for-non-government-subscribers-lowers-mandatory-annuity-to-20-507010-2025-12-17'
};
export const NPS_SOURCE_2 = { title: 'PTI via The Week: PFRDA rejigs NPS exit norms (Dec 2025)', url: 'https://www.theweek.in/wire-updates/business/2025/12/17/dcm100-biz-pfrda-exit-norms.html' };
export const NPS_TAX_SOURCE = { title: '1Finance: new NPS withdrawal rules, 80% lump sum but only 60% tax-free', url: 'https://1finance.co.in/1f-dashboard/?p=6881' };
export const PFRDA_HOME = { title: 'PFRDA (Pension Fund Regulatory and Development Authority)', url: 'https://www.pfrda.org.in/' };
