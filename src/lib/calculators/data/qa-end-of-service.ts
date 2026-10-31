/**
 * Qatar end-of-service gratuity, Labour Law No. 14 of 2004, Article 54. Verified 2026-10-28.
 * The official Al Meezan / ILO texts could not be fetched from this environment (blocked), so each rule was
 * confirmed in at least two independent reputable sources:
 *  - Clyde & Co, "Termination of Employment and End of Service Benefit in Qatar" (law firm): gratuity is owed to
 *    an employee who has "completed one or more years' of continuous service", at "not less than three weeks of the
 *    employee's final basic salary for each completed year of service", and also for part years.
 *  - Gulf Times column quoting Article 54: "three weeks' last drawn basic salary per year of service" and
 *    "pro-rata for fractions of service".
 *  - Teamed (Gulf employment guide): floor of "three weeks' basic wage for each year", base is the last basic wage
 *    including the annual increment but not housing, transport, other allowances or bonuses; resignation does not
 *    forfeit it, only an Article 61 dismissal does; worked example 4 x (3 x 2,000) + 1.5 x 2,000 = 27,000.
 * Decree-Law No. 18 of 2020 changed notice rules (Article 49) and exit permits; none of the three sources reports
 * a change to Article 54 (checked again for Law No. 9 of 2026, which Teamed and Qatar Living say did not touch gratuity).
 */

/** Article 54: gratuity is due once the worker has completed this many years of continuous service. */
export const QA_MIN_SERVICE_YEARS = 1;

/** Article 54: the contract may agree more, but never fewer than three weeks of basic wage per year. */
export const QA_MIN_WEEKS_PER_YEAR = 3;

/**
 * The law does not say how to turn a monthly wage into a weekly one. Two usual conventions:
 *  - monthly basic / 30 x 7 days a week (the Qatar Living guide's formula: basic / 30 x 21 x years);
 *  - monthly basic x 12 / 52 for one week (the "weekly wage" reading).
 */
export const QA_MONTH_DAYS = 30;
export const QA_WEEKS_PER_YEAR = 52;
export const QA_MONTHS_PER_YEAR = 12;

export const QA_LAW_LABEL = 'Qatar Labour Law No. 14 of 2004, Article 54';

export const QA_SOURCES = [
	{
		title: 'Clyde & Co: Termination of employment and end of service benefit in Qatar',
		url: 'https://www.clydeco.com/en/insights/2016/02/termination-of-employment-and-end-of-service-benef'
	},
	{
		title: 'Teamed: Qatar end-of-service gratuity (Article 54)',
		url: 'https://www.teamed.global/gulf-employment-law/qatar-end-of-service-gratuity'
	},
	{
		title: 'Al Meezan: Labour Law No. 14 of 2004 (official text, Arabic)',
		url: 'https://www.almeezan.qa/LawView.aspx?opt=&LawID=3961&language=ar'
	}
];
