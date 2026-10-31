/**
 * US retirement plan limits for the 2026 tax year (IRS Notice 2025-67).
 * Update every November when the IRS announces the next year's limits.
 */
export const RETIREMENT_TAX_YEAR = 2026;

/** 401(k), 403(b), governmental 457(b) and TSP. */
export const LIMIT_401K = {
	elective: 24_500,
	catchUp50: 8_000,
	/** SECURE 2.0 higher catch-up for ages 60–63 (replaces the age-50 catch-up). */
	catchUp60to63: 11_250
};

export function limit401k(age: number): number {
	if (age >= 60 && age <= 63) return LIMIT_401K.elective + LIMIT_401K.catchUp60to63;
	if (age >= 50) return LIMIT_401K.elective + LIMIT_401K.catchUp50;
	return LIMIT_401K.elective;
}

/** Traditional and Roth IRAs share one combined limit. */
export const LIMIT_IRA = { base: 7_500, catchUp50: 1_100 };

export function limitIra(age: number): number {
	return LIMIT_IRA.base + (age >= 50 ? LIMIT_IRA.catchUp50 : 0);
}

/** Roth IRA contribution phase-out by modified AGI. */
export const ROTH_PHASEOUT: Record<string, { from: number; to: number; label: string }> = {
	single: { from: 153_000, to: 168_000, label: 'Single or head of household' },
	mfj: { from: 242_000, to: 252_000, label: 'Married filing jointly' },
	mfs: { from: 0, to: 10_000, label: 'Married filing separately (lived together)' }
};

export const IRS_LIMITS_SOURCE = {
	title: 'IRS: 401(k) limit increases to $24,500 for 2026, IRA limit increases to $7,500',
	url: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500'
};
