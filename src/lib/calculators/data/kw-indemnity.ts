/**
 * Kuwait end-of-service indemnity, Private Sector Labour Law No. 6 of 2010, Articles 51, 53, 55, 67.
 * Verified 2026-10-28. The official Public Authority for Manpower (PAM) PDF could not be fetched from this
 * environment (blocked), so each rule was confirmed in at least two independent sources among:
 *  - Teamed, "Kuwait end-of-service indemnity" (teamed.global/gulf-employment-law/kuwait-end-of-service-indemnity)
 *  - HAQQ guide to Kuwait end of service (haqq.ai/blog/nihayat-khidma-fasl-taasufi-kuwait)
 *  - Arab Times, "Kuwait company not paying indemnity, know your legal rights" (9 May 2025)
 * Amendments: Law No. 85 of 2017 and Law No. 17 of 2018 only stopped employers deducting their social-security
 * (PIFSS) contributions from the indemnity. HAQQ (checked to 20 Oct 2026) found no later change to Articles 41-55,
 * so resignation still reduces the indemnity under Article 53 and nothing makes it full for every resignation.
 */

/** Article 51(b), monthly-paid workers: 15 days' wage for each of the first five years. */
export const KW_FIRST_TIER_YEARS = 5;
export const KW_DAYS_PER_YEAR_FIRST = 15;

/** Article 51(b): one month's wage for each year after the first five. Part years are pro rata. */
export const KW_MONTHS_PER_YEAR_AFTER = 1;

/** Article 51(b): the total may not exceed one and a half years' wage. */
export const KW_CAP_MONTHS = 18;

/**
 * Article 53 (resignation from an open-ended contract; the sources agree on these bands):
 * under 3 years = nothing; 3 to under 5 = half; 5 to under 10 = two thirds; 10 or more = full.
 */
export const KW_RESIGN_MIN_YEARS = 3;
export const KW_RESIGN_HALF_UNTIL = 5;
export const KW_RESIGN_TWO_THIRDS_UNTIL = 10;
export const KW_RESIGN_FRACTION_HALF = 1 / 2;
export const KW_RESIGN_FRACTION_TWO_THIRDS = 2 / 3;

/**
 * Wage basis, Article 55: basic pay plus every element set in the contract or the employer's rules (periodic
 * bonuses, allowances, grants, cash benefits), except the social and children's allowances under Law No. 19 of 2000.
 * Many employers use basic pay alone; the law reads as total pay.
 */

/**
 * Turning a monthly wage into "a day's wage". Article 67: daily pay is the wage divided by actual working days,
 * not counting paid weekly rest days, which is about 26 a month. Employers also use 30 (15 days = half a month).
 * Both are shown in the HAQQ worked example (KD 600 wage, 7 years: KD 2,930.77 with 26, KD 2,700 with 30).
 */
export const KW_DAILY_DIVISOR_WORKING = 26;
export const KW_DAILY_DIVISOR_CALENDAR = 30;

export const KW_LAW_LABEL = 'Kuwait Private Sector Labour Law No. 6 of 2010, Articles 51 to 55';

export const KW_SOURCES = [
	{ title: 'Teamed: Kuwait end-of-service indemnity (Articles 51, 53, 55, 67)', url: 'https://www.teamed.global/gulf-employment-law/kuwait-end-of-service-indemnity' },
	{ title: 'HAQQ: Kuwait end-of-service indemnity, with amendments to 2026', url: 'https://www.haqq.ai/blog/nihayat-khidma-fasl-taasufi-kuwait' },
	{ title: 'Public Authority for Manpower: Labour Law No. 6 of 2010 (English)', url: 'https://www.manpower.gov.kw/docs/LaborLaw/Labor_Law_Eng.pdf' }
];
