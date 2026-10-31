/**
 * UK tax, payroll and statutory-pay figures for the 2026/27 tax year (6 April 2026 – 5 April 2027).
 * Every figure below was read from the source named above it on 2026-10-28.
 * Review every April (and after each Budget / Scottish Budget). The Budget on 28 October 2026 was NOT
 * reflected here: re-check stamp duty, income tax bands and NI after it is published.
 */

export const UK_TAX_YEAR = '2026/27';
export const UK_TAX_YEAR_DATES = '6 April 2026 to 5 April 2027';

export const UK_RATES_SOURCE = {
	title: 'GOV.UK — Rates and thresholds for employers 2026 to 2027',
	url: 'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027'
};
export const UK_INCOME_TAX_SOURCE = {
	title: 'GOV.UK — Income Tax rates and Personal Allowances',
	url: 'https://www.gov.uk/income-tax-rates'
};
export const UK_INCOME_TAX_RATES_TABLE_SOURCE = {
	title: 'GOV.UK — Income Tax rates and allowances for current and previous tax years',
	url: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past'
};
export const SCOTTISH_TAX_SOURCE = {
	title: 'Scottish Government — Scottish Income Tax: rates and bands',
	url: 'https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/'
};
export const UK_DIVIDEND_SOURCE = {
	title: 'GOV.UK — Tax on dividends',
	url: 'https://www.gov.uk/tax-on-dividends'
};
export const UK_CORPORATION_TAX_SOURCE = {
	title: 'GOV.UK — Corporation Tax rates and allowances',
	url: 'https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax'
};
export const UK_STUDENT_LOAN_SOURCE = {
	title: 'GOV.UK — Student loans: a guide to terms and conditions 2026 to 2027',
	url: 'https://www.gov.uk/government/publications/student-loans-a-guide-to-terms-and-conditions/student-loans-a-guide-to-terms-and-conditions-2026-to-2027'
};
export const UK_STUDENT_LOAN_INTEREST_SOURCE = {
	title: 'GOV.UK — Student Loans interest rates and repayment threshold announcement',
	url: 'https://www.gov.uk/government/news/student-loans-interest-rates-and-repayment-threshold-announcement--7'
};
export const UK_STUDENT_LOAN_WRITE_OFF_SOURCE = {
	title: 'GOV.UK — When your student loan gets written off or cancelled',
	url: 'https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled'
};
export const SDLT_SOURCE = {
	title: 'GOV.UK — Stamp Duty Land Tax: residential property rates',
	url: 'https://www.gov.uk/stamp-duty-land-tax/residential-property-rates'
};
export const LBTT_SOURCE = {
	title: 'Revenue Scotland — LBTT residential property rates and bands',
	url: 'https://revenue.scot/taxes/land-buildings-transaction-tax/residential-property'
};
export const ADS_SOURCE = {
	title: 'Revenue Scotland — Additional Dwelling Supplement (ADS)',
	url: 'https://revenue.scot/taxes/land-buildings-transaction-tax/additional-dwelling-supplement-ads'
};
export const LTT_SOURCE = {
	title: 'Welsh Government — Land Transaction Tax rates and bands',
	url: 'https://www.gov.wales/land-transaction-tax-rates-and-bands'
};
export const REDUNDANCY_SOURCE = {
	title: 'GOV.UK — Making staff redundant: redundancy pay',
	url: 'https://www.gov.uk/staff-redundant/redundancy-pay'
};
export const REDUNDANCY_ORDER_SOURCE = {
	title: 'legislation.gov.uk — The Employment Rights (Increase of Limits) Order 2026',
	url: 'https://www.legislation.gov.uk/uksi/2026/310/made'
};
export const REDUNDANCY_ACT_SOURCE = {
	title: 'legislation.gov.uk — Employment Rights Act 1996, section 162',
	url: 'https://www.legislation.gov.uk/ukpga/1996/18/section/162'
};
export const NI_REDUNDANCY_SOURCE = {
	title: 'nidirect — Redundancy pay (Northern Ireland)',
	url: 'https://www.nidirect.gov.uk/articles/redundancy-pay'
};
export const SMP_SOURCE = {
	title: 'GOV.UK — Maternity pay and leave: eligibility',
	url: 'https://www.gov.uk/maternity-pay-leave/eligibility'
};
export const SSP_SOURCE = {
	title: 'Acas — Statutory Sick Pay (SSP)',
	url: 'https://www.acas.org.uk/checking-sick-pay/statutory-sick-pay-ssp'
};

// ---------------------------------------------------------------------------------------------
// Income tax
// ---------------------------------------------------------------------------------------------

/** Source: UK_INCOME_TAX_SOURCE — "Personal Allowance £12,570". */
export const PERSONAL_ALLOWANCE = 12_570;
/** Source: UK_INCOME_TAX_SOURCE — "if your adjusted net income is over £100,000, your Personal Allowance drops by £1 for every £2". */
export const PA_TAPER_START = 100_000;

export interface TaxBand {
	label: string;
	/** Upper limit of the band, in TAXABLE income (after the personal allowance). Infinity for the top band. */
	upTo: number;
	rate: number;
}

/**
 * England, Wales and Northern Ireland. Source: UK_INCOME_TAX_RATES_TABLE_SOURCE (bands "income after
 * allowances"): basic 20% up to £37,700; higher 40% £37,701 to £125,140; additional 45% over £125,140.
 */
export const RUK_BANDS: TaxBand[] = [
	{ label: 'Basic rate', upTo: 37_700, rate: 0.2 },
	{ label: 'Higher rate', upTo: 125_140, rate: 0.4 },
	{ label: 'Additional rate', upTo: Infinity, rate: 0.45 }
];

/**
 * Scotland, non-savings and non-dividend income. Source: UK_INCOME_TAX_RATES_TABLE_SOURCE and
 * UK_RATES_SOURCE (income after allowances): starter 19% up to £3,967; basic 20% to £16,956;
 * intermediate 21% to £31,092; higher 42% to £62,430; advanced 45% to £125,140; top 48% above.
 * (gov.scot shows the same bands as gross-income figures: £16,537 / £29,526 / £43,662 / £75,000 / £125,140.)
 */
export const SCOTTISH_BANDS: TaxBand[] = [
	{ label: 'Starter rate', upTo: 3_967, rate: 0.19 },
	{ label: 'Basic rate', upTo: 16_956, rate: 0.2 },
	{ label: 'Intermediate rate', upTo: 31_092, rate: 0.21 },
	{ label: 'Higher rate', upTo: 62_430, rate: 0.42 },
	{ label: 'Advanced rate', upTo: 125_140, rate: 0.45 },
	{ label: 'Top rate', upTo: Infinity, rate: 0.48 }
];

/** Flat rates behind the PAYE tax codes BR, D0 and D1 (UK-wide bands: basic 20%, higher 40%, additional 45%). */
export const CODE_FLAT_RATES = { BR: 0.2, D0: 0.4, D1: 0.45 } as const;

/** Source: UK_RATES_SOURCE — "Emergency tax codes: 1257L W1, 1257L M1, 1257L X" (standard code is 1257L). */
export const STANDARD_TAX_CODE = '1257L';

// ---------------------------------------------------------------------------------------------
// National Insurance (Class 1, employee category letter A)
// ---------------------------------------------------------------------------------------------

/** Source: UK_RATES_SOURCE — Primary Threshold (PT) £12,570 a year. */
export const NI_PRIMARY_THRESHOLD = 12_570;
/** Source: UK_RATES_SOURCE — Upper Earnings Limit (UEL) £50,270 a year. */
export const NI_UPPER_EARNINGS_LIMIT = 50_270;
/** Source: UK_RATES_SOURCE — category A employee rates: 8% from PT to UEL, 2% above UEL. */
export const NI_MAIN_RATE = 0.08;
export const NI_UPPER_RATE = 0.02;
/** Source: UK_RATES_SOURCE — Secondary Threshold (ST) £5,000 a year; employer (secondary) rate 15%. */
export const NI_SECONDARY_THRESHOLD = 5_000;
export const NI_EMPLOYER_RATE = 0.15;
/** Source: UK_RATES_SOURCE — Lower Earnings Limit (LEL) £129 a week. */
export const NI_LEL_WEEKLY = 129;
/** Source: UK_RATES_SOURCE — Apprenticeship Levy: 0.5% of pay bill (levy applies when the bill is over £3 million). */
export const APPRENTICESHIP_LEVY_RATE = 0.005;

// ---------------------------------------------------------------------------------------------
// Student and postgraduate loans — repayment
// ---------------------------------------------------------------------------------------------

export type LoanPlan = 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'pg';

export interface LoanPlanInfo {
	label: string;
	/** Annual repayment threshold 2026/27. */
	threshold: number;
	/** Share of income above the threshold that is repaid. */
	rate: number;
	/** Years after the April you were first due to repay until the balance is cancelled. */
	writeOffYears: number;
}

/**
 * Thresholds and rates: UK_RATES_SOURCE ("Student loan Plan 1 threshold £26,900; Plan 2 £29,385; Plan 4
 * £33,795; Plan 5 £25,000; Postgraduate £21,000; deductions 9%; postgraduate 6%") and
 * UK_STUDENT_LOAN_SOURCE for Plans 1, 2, 5 and Postgraduate.
 * Write-off: UK_STUDENT_LOAN_WRITE_OFF_SOURCE — Plan 1 25 years, Plan 2 30, Plan 4 30 (loans first paid on
 * or after 1 Aug 2007), Plan 5 40, Postgraduate 30 — each "after the April you were first due to repay".
 */
export const LOAN_PLANS: Record<LoanPlan, LoanPlanInfo> = {
	plan1: { label: 'Plan 1', threshold: 26_900, rate: 0.09, writeOffYears: 25 },
	plan2: { label: 'Plan 2', threshold: 29_385, rate: 0.09, writeOffYears: 30 },
	plan4: { label: 'Plan 4', threshold: 33_795, rate: 0.09, writeOffYears: 30 },
	plan5: { label: 'Plan 5', threshold: 25_000, rate: 0.09, writeOffYears: 40 },
	pg: { label: 'Postgraduate Loan', threshold: 21_000, rate: 0.06, writeOffYears: 30 }
};

/** Source: UK_STUDENT_LOAN_SOURCE — "Plan 5 repayments won't be due until April 2026 at the earliest." */
export const PLAN5_FIRST_REPAYMENT_YEAR = 2026;

// ---------------------------------------------------------------------------------------------
// Student and postgraduate loans — interest (1 September 2026 to 31 August 2027)
// ---------------------------------------------------------------------------------------------

/** Source: UK_STUDENT_LOAN_INTEREST_SOURCE — "RPI used: 4.1%". */
export const LOAN_RPI = 0.041;
/** Source: UK_STUDENT_LOAN_INTEREST_SOURCE — Plan 1: "RPI (4.1%) or Bank Base Rate + 1% (currently 4.75%), whichever is lower". */
export const LOAN_BASE_RATE_PLUS_ONE = 0.0475;
/**
 * Source: UK_STUDENT_LOAN_SOURCE — Plan 2 post-study: RPI up to £29,385, RPI plus up to 3% rising with income
 * to £52,885, then RPI + 3%. Postgraduate Loan: RPI + 3%.
 * Cap: "capped at 6% from 1 September 2026 to 31 August 2027" for Plan 2 and the Postgraduate Loan.
 * Upper interest threshold £52,885: written statement to Parliament on the 6% cap.
 */
export const LOAN_PLAN2_UPPER_INTEREST_THRESHOLD = 52_885;
export const LOAN_MARGIN = 0.03;
export const LOAN_INTEREST_CAP = 0.06;

// ---------------------------------------------------------------------------------------------
// Dividends, corporation tax
// ---------------------------------------------------------------------------------------------

/** Source: UK_INCOME_TAX_RATES_TABLE_SOURCE (2026 to 2027) — dividend allowance £500. */
export const DIVIDEND_ALLOWANCE = 500;
/** Source: same page — dividend ordinary 10.75%, upper 35.75%, additional 39.35%. */
export const DIVIDEND_RATES = { basic: 0.1075, higher: 0.3575, additional: 0.3935 };

/** Source: UK_CORPORATION_TAX_SOURCE (financial year 2026): small profits rate 19%, main rate 25%,
 * lower limit £50,000, upper limit £250,000, marginal relief fraction 3/200. */
export const CT_SMALL_RATE = 0.19;
export const CT_MAIN_RATE = 0.25;
export const CT_LOWER_LIMIT = 50_000;
export const CT_UPPER_LIMIT = 250_000;
export const CT_MARGINAL_FRACTION = 3 / 200;

// ---------------------------------------------------------------------------------------------
// Statutory payments
// ---------------------------------------------------------------------------------------------

/** Source: UK_RATES_SOURCE — "SMP, remaining weeks: £194.32 or 90% of AWE, whichever is lower" (applies from 5 April 2026). */
export const SMP_FLAT_RATE = 194.32;
export const SMP_HIGH_RATE_PERCENT = 0.9;
export const SMP_HIGH_RATE_WEEKS = 6;
export const SMP_TOTAL_WEEKS = 39;
/** Source: SMP_SOURCE — "You must earn on average at least £129 a week" (the Lower Earnings Limit). */
export const SMP_MIN_WEEKLY_EARNINGS = NI_LEL_WEEKLY;

/** Source: UK_RATES_SOURCE — "Weekly rate: £123.25 or 80% of average weekly earnings, whichever is lower". */
export const SSP_WEEKLY_RATE = 123.25;
export const SSP_EARNINGS_SHARE = 0.8;
/** Source: SSP_SOURCE (Acas, updated for 6 April 2026) — "Maximum duration: up to 28 weeks". */
export const SSP_MAX_WEEKS = 28;

/**
 * Source: REDUNDANCY_ORDER_SOURCE (SI 2026/310, in force 6 April 2026) — maximum week's pay £751 (Great Britain);
 * REDUNDANCY_SOURCE shows the maximum payment of £22,530 (= 30 × £751).
 * Northern Ireland: NI_REDUNDANCY_SOURCE — "weekly pay is capped at £783", maximum payment £23,490 (= 30 × £783).
 */
export const REDUNDANCY_WEEK_CAP_GB = 751;
export const REDUNDANCY_WEEK_CAP_NI = 783;
/** Source: REDUNDANCY_SOURCE — at least 2 years' continuous service; service capped at 20 years. */
export const REDUNDANCY_MIN_YEARS = 2;
export const REDUNDANCY_MAX_YEARS = 20;
/** Source: REDUNDANCY_ACT_SOURCE s.162 — half a week under 22, one week from 22, one and a half weeks from 41. */
export const REDUNDANCY_AGE_LOW = 22;
export const REDUNDANCY_AGE_HIGH = 41;

// ---------------------------------------------------------------------------------------------
// Land taxes on residential purchases
// ---------------------------------------------------------------------------------------------

export interface PriceBand {
	/** Upper limit of the band (purchase price). Infinity for the top band. */
	upTo: number;
	rate: number;
}

/** SDLT standard residential rates. Source: SDLT_SOURCE — 0% to £125,000; 2% to £250,000; 5% to £925,000; 10% to £1.5m; 12% above. */
export const SDLT_STANDARD: PriceBand[] = [
	{ upTo: 125_000, rate: 0 },
	{ upTo: 250_000, rate: 0.02 },
	{ upTo: 925_000, rate: 0.05 },
	{ upTo: 1_500_000, rate: 0.1 },
	{ upTo: Infinity, rate: 0.12 }
];
/** SDLT first-time buyer relief. Source: SDLT_SOURCE — 0% to £300,000, 5% on £300,001 to £500,000; no relief above £500,000. */
export const SDLT_FTB: PriceBand[] = [
	{ upTo: 300_000, rate: 0 },
	{ upTo: 500_000, rate: 0.05 }
];
export const SDLT_FTB_MAX_PRICE = 500_000;
/** Source: SDLT_SOURCE — higher rates: "5% on top of the standard rates"; non-UK resident surcharge 2% (England and NI only). */
export const SDLT_HIGHER_RATES_SURCHARGE = 0.05;
export const SDLT_NON_RESIDENT_SURCHARGE = 0.02;

/** LBTT residential. Source: LBTT_SOURCE and Scottish Budget 2026-27 (rates unchanged): 0% to £145,000; 2% to £250,000; 5% to £325,000; 10% to £750,000; 12% above. */
export const LBTT_STANDARD: PriceBand[] = [
	{ upTo: 145_000, rate: 0 },
	{ upTo: 250_000, rate: 0.02 },
	{ upTo: 325_000, rate: 0.05 },
	{ upTo: 750_000, rate: 0.1 },
	{ upTo: Infinity, rate: 0.12 }
];
/** Source: LBTT_SOURCE / Scottish Budget 2026-27 — first-time buyer relief raises the nil-rate band from £145,000 to £175,000. */
export const LBTT_FTB_NIL_RATE_BAND = 175_000;
/** Source: ADS_SOURCE — 8% from 5 December 2024, on the whole price. */
export const ADS_RATE = 0.08;

/** LTT main residential rates. Source: LTT_SOURCE — 0% to £225,000; 6% to £400,000; 7.5% to £750,000; 10% to £1.5m; 12% above. */
export const LTT_MAIN: PriceBand[] = [
	{ upTo: 225_000, rate: 0 },
	{ upTo: 400_000, rate: 0.06 },
	{ upTo: 750_000, rate: 0.075 },
	{ upTo: 1_500_000, rate: 0.1 },
	{ upTo: Infinity, rate: 0.12 }
];
/** LTT higher residential rates from 11 December 2024. Source: LTT_SOURCE — 5% / 8.5% / 10% / 12.5% / 15% / 17% in bands up to £180k, £250k, £400k, £750k, £1.5m, above. */
export const LTT_HIGHER: PriceBand[] = [
	{ upTo: 180_000, rate: 0.05 },
	{ upTo: 250_000, rate: 0.085 },
	{ upTo: 400_000, rate: 0.1 },
	{ upTo: 750_000, rate: 0.125 },
	{ upTo: 1_500_000, rate: 0.15 },
	{ upTo: Infinity, rate: 0.17 }
];
