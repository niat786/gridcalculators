/**
 * Bahrain leaving indemnity for workers not covered by the Social Insurance Law (in practice, expatriates),
 * Labour Law for the Private Sector, Law No. 36 of 2012, Article 116. Verified 2026-10-28.
 *
 * OFFICIAL TEXT (LMRA, lmra.gov.bh "labour law.pdf", read via fetch): Article 116 gives "half month's wage for each of
 * the first three years" and then one month's wage for each following year, for fractions of a year "in proportion to the
 * period spent at the employer's service", on termination, for workers "not subject to the provisions of the Social
 * Insurance Law". Article 47 fixes the basis: the worker's "most recent basic wage" plus any social allowance
 * (the average of the last three months for piece or commission pay). No cap in Article 116 (the 12-month cap belongs to
 * Article 111(b), compensation for unfair dismissal). No resignation reduction: HAQQ, Teamed and gulfpaycheck agree that
 * resignation does not reduce it; forfeiture is only for the gross-misconduct dismissals of Article 107 (not modelled).
 *
 * SIO CHANGE (not "since 2019"): Prime Minister's Decision No. 109 of 2023 (issued 12 Dec 2023, under Article 10 of Law
 * No. 14 of 2022 amending the Social Insurance Law). From 1 March 2024 employers pay a monthly contribution to the
 * Social Insurance Organisation (SIO) for each non-Bahraini worker, by the 15th of each month: 4.2% of wage for the first
 * three years of service with the employer and 8.4% after (Al Tamimi & Co; Teamed; HAQQ). The worker claims the indemnity
 * from the SIO. Employers who had a worker for more than 3 years before 1 March 2024 pay 8.4% from that date.
 * Service before 1 March 2024 stays the employer's liability under Article 116. The SIO award uses the same half-month /
 * one-month formula on the last wage, capped at the contributions paid (Teamed).
 */

export const BH_FIRST_TIER_YEARS = 3;
export const BH_MONTHS_PER_YEAR_FIRST = 0.5;
export const BH_MONTHS_PER_YEAR_AFTER = 1;

/** First day of the SIO contribution system; service up to the day before stays with the employer. */
export const BH_SIO_START = '2024-03-01';
export const BH_SIO_LAST_EMPLOYER_DAY = '2024-02-29';
export const BH_SIO_START_LABEL = '1 March 2024';
export const BH_SIO_RATE_FIRST_PCT = 4.2;
export const BH_SIO_RATE_AFTER_PCT = 8.4;

export const BH_LAW_LABEL = 'Bahrain Labour Law No. 36 of 2012, Article 116';

export const BH_SOURCES = [
	{ title: 'LMRA: Bahrain Labour Law for the Private Sector, Law No. 36 of 2012 (Articles 47 and 116)', url: 'https://lmra.gov.bh/files/cms/shared/file/labour law.pdf' },
	{ title: 'Al Tamimi & Co: the new end-of-service gratuity system for non-Bahrainis (Decision 109 of 2023)', url: 'https://www.tamimi.com/news/the-new-end-of-service-gratuity-system-amendments-to-the-payment-of-leaving-indemnity-to-non-bahrainis-in-the-private-sector-2/' },
	{ title: 'Teamed: Bahrain end of service and the SIO system', url: 'https://www.teamed.global/gulf-employment-law/bahrain-end-of-service-sio' }
];
