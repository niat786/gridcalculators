/**
 * Oman end-of-service gratuity for non-Omani workers. Verified 2026-10-28.
 *
 * LAW TEXT (official): Labour Law, Royal Decree No. 53/2023, Article 61, read at decree.om/2023/rd20230053:
 * the employer pays workers "who do not benefit from the provisions of the Social Protection Law" a gratuity
 * "not less than the basic wage for each year of his service"; fractions of a year are paid pro rata; "the final
 * basic wage of the worker shall be taken as a basis"; service that began before the law counts; and "the provisions
 * of this article apply until the savings system stipulated in the Social Protection Law comes into force".
 * Article V: published in Official Gazette 1504 on 30 July 2023 and in force the next day, 31 July 2023.
 * Article 40 lists nine misconduct cases where dismissal is without notice and without gratuity (not modelled).
 *
 * TRANSITION (Ministry of Labour clarification, reported by Oman Observer, 23 Oct 2024; same split described by Cercli):
 * service before the new law is paid under the old 2003 law, 15 days (half a basic salary) a year for the first three
 * years of service and a full basic salary a year after that; service from the new law's date is paid at one full basic
 * salary a year. Ministry example: start 1 Aug 2021 on RO 500 = RO 250 a year to 31 Jul 2023, then RO 500 a year.
 */

/** Article V of RD 53/2023: the law came into force on 31 July 2023. */
export const OM_LAW_EFFECTIVE = '2023-07-31';
export const OM_LAW_EFFECTIVE_LABEL = '31 July 2023';

/**
 * The Ministry's example treats 1 Aug 2021 to 31 Jul 2023 as two whole years at the old rate, so the last day of
 * the old-law period is taken as 31 July 2023 (a one-day difference at most).
 */
export const OM_OLD_PERIOD_LAST_DAY = '2023-07-31';

/** Old law, applied to service before the new law: half a month's basic wage for each of the first three years. */
export const OM_OLD_FIRST_TIER_YEARS = 3;
export const OM_OLD_MONTHS_PER_YEAR_FIRST = 0.5;
/** Old law, years after the first three; and the new law (Article 61): one basic wage per year. */
export const OM_MONTHS_PER_YEAR_FULL = 1;

/**
 * Social Protection Law (Royal Decree 52/2023) savings system for non-Omanis: replaces the gratuity once it starts.
 * Employer contributes 9% of monthly basic wage (Executive Regulation, Article 139(1) as reported by Oman Observer and
 * Teamed; Gulf News, 11 Mar 2026). The start date is set by the Social Protection Fund board; Royal Decree 60/2025
 * (13 July 2025) moved the latest start from 19 July 2026 to 19 July 2027 (Al Tamimi & Co; Teamed). As of 16 Oct 2026
 * Teamed reports no start date has been set, so the gratuity below still applies.
 */
export const OM_SAVINGS_RATE_PCT = 9;
export const OM_SAVINGS_LATEST_START = '19 July 2027';

export const OM_LAW_LABEL = 'Oman Labour Law (Royal Decree 53/2023), Article 61';

export const OM_SOURCES = [
	{ title: 'Oman Labour Law, Royal Decree 53/2023: official text (Article 61)', url: 'https://decree.om/2023/rd20230053/' },
	{ title: 'Oman Observer: how gratuity is calculated in Oman for now (Ministry of Labour clarification)', url: 'https://www.omanobserver.om/article/1161053/oman/labour/how-employees-gratuity-will-be-calculated-in-oman-for-now' },
	{ title: 'Al Tamimi & Co: Omani Social Protection Law timeline extended by Decree 60/2025', url: 'https://www.tamimi.com/our-knowledge/publications/eyes-on-2026/articles/omani-social-protection-law-key-timeline-extensions-under-sultani-decree-60-2025/' }
];
