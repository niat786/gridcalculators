/**
 * India Employees' Provident Fund (EPF) figures used by the EPF calculator.
 * Official home: https://www.epfindia.gov.in/ . The official site could not be fetched from the build
 * environment, so each figure below was confirmed in at least two independent published sources.
 */

/** Financial year the declared interest rate belongs to. */
export const EPF_RATE_YEAR = 'FY 2025-26';

/**
 * EPF interest rate, % a year, for FY 2025-26 (the latest declared; FY 2026-27 is not declared until early 2027).
 * Sources: All India Radio / newsonair.gov.in, 2 Mar 2026 — the 239th CBT meeting recommended 8.25% for 2025-26
 * (https://www.newsonair.gov.in/union-minister-dr-mansukh-mandaviya-chairs-239th-meeting-of-cbt-epf-in-new-delhi);
 * ThePrint, 18 Jun 2026 — government ratified 8.25% (https://theprint.in/economy/govt-ratifies-8-25-pc-epf-interest-rate-for-fy26-to-be-credited-this-month/2963099/);
 * Business Today, 15 Jul 2026 — EPFO began crediting 8.25% for FY 2025-26.
 */
export const EPF_RATE = 8.25;

/**
 * Employee share, % of PF wages (basic + DA).
 * Source: KPMG Flash Alert 2026-253 (https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-253.html)
 * and CAclubindia (17 Sep 2026): "Contribution rates are unchanged" — employee 12%, employer 12%.
 */
export const EPF_EMPLOYEE_PCT = 12;
export const EPF_EMPLOYER_PCT = 12;

/**
 * Part of the employer's 12% that goes to the Employees' Pension Scheme (EPS), the rest (3.67%) to EPF.
 * Source: same KPMG alert ("3.67% toward EPF and 8.33% toward EPS"), Razorpay Payroll guide, CAclubindia.
 */
export const EPS_PCT = 8.33;

/**
 * Monthly wage ceiling for mandatory EPF/EPS coverage and for the EPS share.
 * Raised from ₹15,000 to ₹25,000 by Labour Ministry notification S.O. 5109(E) dated 17 Sep 2026,
 * effective from that date (the ceiling had been ₹15,000 since Sept 2014).
 * Sources: KPMG flash alert above; Business Today 6 Oct 2026; Upstox; Razorpay (employer EPS up to the ceiling,
 * about ₹2,083 a month at ₹25,000). Note: the Central Government's own 1.16% pension contribution is limited
 * to ₹15,000 of wages (G.S.R. 890(E)) — that is paid by the Government, not by the employer or employee.
 */
export const EPF_WAGE_CEILING = 25_000;
export const EPF_WAGE_CEILING_EFFECTIVE = '17 September 2026';

/** The calculator stops at 58: EPS membership ends at 58 and the post-58 split is not modelled. */
export const EPF_MAX_RETIREMENT_AGE = 58;

export const EPF_SOURCE = { title: 'EPFO — Employees’ Provident Fund Organisation', url: 'https://www.epfindia.gov.in/' };
export const EPF_CEILING_SOURCE = {
	title: 'KPMG — India: EPF wage ceiling raised to INR 25,000 (flash alert)',
	url: 'https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-253.html'
};
