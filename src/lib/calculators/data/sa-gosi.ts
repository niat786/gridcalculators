/**
 * Saudi GOSI (General Organization for Social Insurance) monthly contributions. Verified 2026-10-28.
 *
 * OFFICIAL (gosi.gov.sa GOSI Online FAQ pages, fetched): Annuities Branch 18% of the contributory wage, 9% employer and
 * 9% employee (Saudis only); Occupational Hazards Branch 2% paid by the employer (may rise to 4% for employers who ignore
 * safety instructions, not modelled), applies to non-Saudis too; SANED (unemployment insurance) 1.5%, 0.75% employer and
 * 0.75% employee, mandatory for Saudis registered with the pensions branch; non-Saudis are not in the Annuities branch or
 * SANED. Contributory wage = basic wage (which GOSI defines to include commissions) plus cash housing allowance.
 * Wage limits: the Annuities Branch minimum is SAR 1,500 and the Occupational Hazards minimum is SAR 400; the maximum is
 * SAR 45,000 (the Regulations may raise it, and a third-party guide, Qoyod, warns the cap should be confirmed with GOSI).
 *
 * NEW SOCIAL INSURANCE LAW (royal decree M/273, in force 3 July 2024) for Saudis with no contribution period under the
 * Social Insurance or Civil Pension laws before 3 July 2024: the annuities rate for employer and employee each rises by
 * 0.5 percentage points every July, from 9% to 11% in 2028. Schedule confirmed in: Okaz (national newspaper, 4 Jun 2025),
 * Lockton ("rise by 0.5% per year, from 9% to 11%, between 3 July 2025 and 2028"), ZenHR help centre, Myndsolution payroll
 * guide and PaySpace (which reports 10% in force from July 2026, giving 23.5% combined). SANED and the 2% occupational
 * hazards rate do not step. Sources disagree by two days on the step date (1 vs 3 July); this tool steps on 1 July.
 */

/** Contributory wage limits in SAR per month. */
export const SA_GOSI_ANNUITY_MIN_WAGE = 1_500;
export const SA_GOSI_HAZARDS_MIN_WAGE = 400;
export const SA_GOSI_MAX_WAGE = 45_000;

/** Annuities rate (percent, each side) for contributors who joined before 3 July 2024: unchanged. */
export const SA_GOSI_ANNUITY_LEGACY_PCT = 9;

/** SANED, percent, each side, Saudis only. */
export const SA_GOSI_SANED_PCT = 0.75;

/** Occupational hazards, percent, employer only, Saudis and non-Saudis. */
export const SA_GOSI_HAZARDS_PCT = 2;

export const SA_GOSI_NEW_LAW_START = '2024-07-03';
export const SA_GOSI_NEW_LAW_START_LABEL = '3 July 2024';

/**
 * Annuities rate (percent, each side) for new entrants, from the given date (ISO). The last row whose `from` is on or
 * before the contribution month applies.
 */
export const SA_GOSI_ANNUITY_NEW_SCHEDULE: { from: string; pct: number; label: string }[] = [
	{ from: '2024-07-03', pct: 9, label: 'July 2024 to June 2025' },
	{ from: '2025-07-01', pct: 9.5, label: 'July 2025 to June 2026' },
	{ from: '2026-07-01', pct: 10, label: 'July 2026 to June 2027' },
	{ from: '2027-07-01', pct: 10.5, label: 'July 2027 to June 2028' },
	{ from: '2028-07-01', pct: 11, label: 'July 2028 onward' }
];

export const SA_GOSI_LAW_LABEL = 'GOSI contribution rules and the Social Insurance Law (in force 3 July 2024)';

export const SA_GOSI_SOURCES = [
	{ title: 'GOSI: employer FAQ (contribution rates, wage limits, wage definition)', url: 'https://www.gosi.gov.sa/GOSIOnline/FAQ_Employer&locale=en_US' },
	{ title: 'GOSI: contributor FAQ (SANED, wage limits)', url: 'https://www.gosi.gov.sa/GOSIOnline/FAQ_Contributor&locale=en_US' },
	{ title: 'Okaz: GOSI pension contribution increase from July 2025', url: 'https://www.okaz.com.sa/economy/na/2199463' },
	{ title: 'Lockton: Saudi Arabia introduces new social insurance reforms', url: 'https://global.lockton.com/us/en/news-insights/saudi-arabia-introduces-new-social-insurance-reforms' }
];
