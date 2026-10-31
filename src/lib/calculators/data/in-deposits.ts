/**
 * India bank deposit conventions used by the FD and RD calculators.
 */

/**
 * Interest on bank FDs/RDs is subject to TDS only above these yearly limits (per bank), at 10% with PAN.
 * Sources: Ujjivan SFB guide to Section 194A / 393 (https://www.ujjivansfb.bank.in/banking-blogs/personal-finance/section-194a-tds-fd-rd-interest):
 * ₹50,000 below age 60, ₹1 lakh for resident senior citizens; the Income-tax Act 2025 (in force 1 Apr 2026)
 * carries this into section 393(1). ClearTax (https://cleartax.in/s/tds-on-fd-interest) gives the same limits "from FY 2025-26"
 * (Budget 2025). Shown as text only; the calculators do not deduct tax.
 */
export const FD_TDS_THRESHOLD = 50_000;
export const FD_TDS_THRESHOLD_SENIOR = 100_000;
export const FD_TDS_RATE_PCT = 10;

/** Extra rate banks usually add for senior citizens. A starting value only; every bank sets its own, so the field is editable. */
export const SENIOR_EXTRA_RATE_DEFAULT = 0.5;

/** Indian banks quote FD and RD interest compounded quarterly by default (4 times a year). */
export const DEFAULT_COMPOUNDING_PER_YEAR = 4;

export const DEPOSIT_TDS_SOURCE = {
	title: 'Ujjivan SFB — TDS on FD and RD interest (Section 194A / 393)',
	url: 'https://www.ujjivansfb.bank.in/banking-blogs/personal-finance/section-194a-tds-fd-rd-interest'
};
export const RD_FORMULA_SOURCE = {
	title: 'Policybazaar — RD calculator (quarterly compounding on each instalment)',
	url: 'https://www.policybazaar.com/financial-tools-calculators/rd-calculator'
};
export const BANK_DEPOSIT_SOURCE = { title: 'State Bank of India — deposits', url: 'https://sbi.co.in/' };
