/**
 * UAE end-of-service gratuity (private sector, mainland), Federal Decree-Law No. 33 of 2021.
 * Law text read at the official legislation portal (uaelegislation.gov.ae, Article 51) and the
 * u.ae private-sector end-of-service page. Verified 2026-10-28.
 */

/**
 * Article 51(2): a foreign full-time worker with "one or more years of continuous service" is entitled
 * to a gratuity on the basic wage. Below one year there is no gratuity (u.ae: "If a worker has served
 * for less than 1 year, he is not entitled to any gratuity pay").
 */
export const AE_MIN_SERVICE_YEARS = 1;

/** Article 51(2): "the wage of twenty-one (21) days for each year of the first five years of service". */
export const AE_DAYS_PER_YEAR_FIRST = 21;
export const AE_FIRST_TIER_YEARS = 5;

/** Article 51(2): "the wage of thirty (30) days for each year in excess of that". */
export const AE_DAYS_PER_YEAR_AFTER = 30;

/**
 * Article 51(6) and u.ae: "the total gratuity shall not exceed the wage of 2 years". The gratuity is
 * calculated on the basic wage, so the cap is applied as 24 months of basic wage (the usual reading).
 */
export const AE_CAP_MONTHS = 24;

/**
 * Daily wage. Neither the Decree-Law nor the Implementing Regulation (Cabinet Resolution 1 of 2022)
 * defines a divisor (checked: Article 51 and the Resolution's Articles 16, 29, 30). Common practice is
 * monthly basic wage ÷ 30. A yearly method (basic × 12 ÷ 365) is also used; the DIFC law itself uses
 * a 365-day daily rate for its pre-2020 gratuity (DIFC Employment Law, Art. 66(3)(b)).
 */
export const AE_MONTH_DAYS = 30;
export const AE_YEAR_DAYS = 365;

/**
 * Article 51(4): days of absence without pay are not counted in the period of service.
 * Article 51: no reduction when the worker resigns (the text has no resignation rule at all; the old
 * 1980 law's 1/3 and 2/3 cuts were removed).
 */

/**
 * DIFC: Employment Law (DIFC Law No. 2 of 2019), Art. 66 and Schedule 1. From 1 February 2020 employers
 * pay into a Qualifying Scheme (DEWS) instead of accruing end-of-service gratuity:
 * 5.83% of monthly basic wage for the first five years and 8.33% for each additional year.
 * Service before 1 Feb 2020 stays as a frozen gratuity (Tamimi & Co summary of the scheme).
 */
export const DIFC_DEWS_RATE_FIRST_5 = 5.83;
export const DIFC_DEWS_RATE_AFTER_5 = 8.33;
export const DIFC_DEWS_START = '1 February 2020';

export const AE_LAW_YEAR_LABEL = 'Federal Decree-Law No. 33 of 2021';

export const AE_LAW_SOURCE = {
	title: 'UAE Federal Decree-Law No. 33 of 2021 on Labour Relations (Article 51)',
	url: 'https://uaelegislation.gov.ae/en/legislations/1541/download'
};
export const AE_PORTAL_SOURCE = {
	title: 'u.ae: End of service benefits for employees in the private sector',
	url: 'https://u.ae/en/information-and-services/jobs/Sector-of-employment/employment-in-the-private-sector/end-of-service-benefits-for-employees-in-the-private-sector'
};
export const DIFC_SOURCE = {
	title: 'DIFC Employment Law (DIFC Law No. 2 of 2019): workplace savings (DEWS)',
	url: 'https://difc.com/business/employee-workplace-savings'
};
