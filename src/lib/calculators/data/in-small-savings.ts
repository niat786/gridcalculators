/**
 * India small-savings figures used by the PPF calculator.
 * The Ministry of Finance (Department of Economic Affairs) resets the PPF rate every quarter.
 * Update by the end of each quarter (30 Dec, 31 Mar, 30 Jun, 30 Sep) from https://www.nsiindia.gov.in/
 * and https://www.indiapost.gov.in/ (the official pages could not be fetched from the build environment,
 * so each figure below was confirmed in at least two independent published sources).
 */

/** Quarter the PPF rate below is notified for. */
export const PPF_RATE_PERIOD = 'October–December 2026 (Q3 of FY 2026-27)';

/**
 * PPF interest rate, % a year, for 1 Oct – 31 Dec 2026.
 * Sources: PTI via Free Press Journal, 30 Sep 2026 (https://www.freepressjournal.in/business/small-savings-interest-rates-unchanged-for-oct-dec-ppf-at-71-per-cent-nsc-at-77-pc)
 * quotes the Finance Ministry notification: rates for Q3 FY 2026-27 "shall remain unchanged from those notified for the second quarter";
 * Outlook Money, 1 Oct 2026, and Angel One, 1 Oct 2026, both give PPF = 7.1%. SBI's PPF page also lists 7.10%.
 */
export const PPF_RATE = 7.1;

/**
 * Minimum and maximum deposit in a financial year.
 * Source: SBI PPF page https://sbi.co.in/portal/web/personal-banking/public-provident-fund-ppf
 * ("Minimum Rs.500 and maximum Rs.1,50,000 per year"), repeated by Business Today (4 Apr 2026) and the richify.ai
 * summary of the India Post page. Anything above the maximum earns no interest.
 */
export const PPF_MIN_DEPOSIT = 500;
export const PPF_MAX_DEPOSIT = 150_000;

/**
 * Original term 15 years; extendable in blocks of 5 years, with or without further deposits.
 * Sources: SBI PPF page (above) "extended in blocks of 5 years"; freefincal.com PPF extension rules
 * (https://freefincal.com/public-provident-fund-extension-rules-upon-maturity/).
 */
export const PPF_TERM_YEARS = 15;
export const PPF_EXTENSION_YEARS = 5;
export const PPF_MAX_EXTENSIONS = 4;

export const PPF_SOURCE = { title: 'India Post — Public Provident Fund', url: 'https://www.indiapost.gov.in/' };
export const SMALL_SAVINGS_SOURCE = { title: 'National Savings Institute — small savings interest rates', url: 'https://www.nsiindia.gov.in/' };
