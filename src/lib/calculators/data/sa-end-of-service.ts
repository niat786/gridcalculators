/**
 * Saudi Labor Law end-of-service award, Articles 84, 85, 87. Read on the Ministry of Human Resources and
 * Social Development (hrsd.gov.sa) knowledge-centre page and confirmed in two law-firm summaries
 * (Teamed; Etqan). Verified 2026-10-28.
 * The amendments in force from 19 February 2025 (Royal Decree M/46, published 23 Aug 2024) changed the
 * definition of resignation and the resignation procedure (new Art. 79 bis) but, per King & Spalding and
 * Chambers summaries, did not change Articles 84-88.
 */

/** Article 84: half a month's wage for each of the first five years. */
export const SA_FIRST_TIER_YEARS = 5;
export const SA_MONTHS_PER_YEAR_FIRST = 0.5;
/** Article 84: one month's wage for each year after the first five. Part years are pro rata. */
export const SA_MONTHS_PER_YEAR_AFTER = 1;

/**
 * Article 85 (hrsd.gov.sa): on resignation, under 2 years of service = no award; 2 years up to 5 years =
 * one third; more than 5 and fewer than 10 years = two thirds; 10 years or more = the full award.
 */
export const SA_RESIGN_MIN_YEARS = 2;
export const SA_RESIGN_THIRD_UP_TO = 5;
export const SA_RESIGN_TWO_THIRDS_BELOW = 10;
export const SA_RESIGN_FRACTION_LOW = 1 / 3;
export const SA_RESIGN_FRACTION_MID = 2 / 3;

/**
 * Article 87: full award if the worker leaves because of force majeure, or a woman ends the contract
 * within 6 months of marriage or 3 months of childbirth. Art. 80: dismissal for the listed misconduct
 * grounds removes the award (Teamed summary).
 */
export const SA_LAW_LABEL = 'Saudi Labor Law, Articles 84 to 87';

export const SA_HRSD_SOURCE = {
	title: 'Ministry of Human Resources and Social Development: end-of-service award',
	url: 'https://www.hrsd.gov.sa/en/knowledge-centre/articles/317-0'
};
export const SA_SUMMARY_SOURCE = {
	title: 'Teamed: Saudi end-of-service award (Articles 84 to 88, with 2025 amendments)',
	url: 'https://www.teamed.global/gulf-employment-law/saudi-end-of-service-award'
};
