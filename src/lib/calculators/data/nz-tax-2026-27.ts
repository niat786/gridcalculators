/**
 * New Zealand income tax, ACC, student loan and KiwiSaver figures for the 2026-27 tax year
 * (1 April 2026 – 31 March 2027). Checked against ird.govt.nz and payroll summaries on 2026-10-28.
 * Review every April.
 */
export const NZ_TAX_YEAR = '2026-27';
export const NZ_TAX_YEAR_LONG = '1 April 2026 – 31 March 2027';

export const IRD_RATES_SOURCE = {
	title: 'Inland Revenue — Tax rates for individuals',
	url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals'
};
export const IRD_ACC_SOURCE = {
	title: 'Inland Revenue — ACC earners\' levy rates',
	url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/acc-clients-and-carers/acc-earners-levy-rates'
};
export const IRD_IETC_SOURCE = {
	title: 'Inland Revenue — Independent earner tax credit (IETC)',
	url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/individual-tax-credits/independent-earner-tax-credit-ietc'
};
export const IRD_STUDENT_LOAN_SOURCE = {
	title: 'Inland Revenue — Repaying my student loan when I earn salary or wages',
	url: 'https://www.ird.govt.nz/student-loans/living-in-new-zealand-with-a-student-loan/repaying-my-student-loan-when-i-earn-salary-or-wages'
};
export const IRD_KIWISAVER_CHANGES_SOURCE = {
	title: 'Inland Revenue — KiwiSaver changes',
	url: 'https://www.ird.govt.nz/kiwisaver-changes'
};
export const IRD_GOV_CONTRIBUTION_SOURCE = {
	title: 'Inland Revenue — Getting the KiwiSaver government contribution',
	url: 'https://www.ird.govt.nz/kiwisaver/kiwisaver-individuals/growing-my-kiwisaver-account/getting-the-kiwisaver-government-contribution'
};
export const BUSINESS_ESCT_SOURCE = {
	title: 'business.govt.nz — Employer superannuation contribution tax (ESCT)',
	url: 'https://business.govt.nz/tax-and-accounting/tax-when-you-have-employees/employer-superannuation-contribution-tax-esct'
};

export interface NzBracket {
	upTo: number;
	rate: number;
}

/**
 * Resident rates since 31 July 2024 (IRD, rates from 1 April 2025 shown; Moore Markhams "1 April 2026 payroll
 * changes" lists the same bands for 2026-27): to $15,600 10.5%; to $53,500 17.5%; to $78,100 30%; to $180,000 33%; above 39%.
 */
export const NZ_BRACKETS: NzBracket[] = [
	{ upTo: 15_600, rate: 0.105 },
	{ upTo: 53_500, rate: 0.175 },
	{ upTo: 78_100, rate: 0.3 },
	{ upTo: 180_000, rate: 0.33 },
	{ upTo: Infinity, rate: 0.39 }
];

/** ACC earners' levy 2026-27 (IRD): $1.75 per $100, on earnings up to $156,641 (maximum levy $2,741.22). */
export const ACC_RATE = 0.0175;
export const ACC_MAX_EARNINGS = 156_641;

/**
 * Independent earner tax credit (IRD): $10 a week, up to $520 a year, for income $24,000–$66,000;
 * reduced by 13 cents per $1 over $66,000, reaching zero at $70,000. Paid through tax code ME.
 */
export const IETC_MAX = 520;
export const IETC_FROM = 24_000;
export const IETC_FULL_TO = 66_000;
export const IETC_ABATE_RATE = 0.13;
export const IETC_END = 70_000;

/** Student loan repayment: 12 cents per $1 over $24,128 a year ($464 a week), per IRD and 1 April 2026 payroll summaries. */
export const STUDENT_LOAN_RATE = 0.12;
export const STUDENT_LOAN_THRESHOLD = 24_128;

/** KiwiSaver (IRD "KiwiSaver changes"): default 3.5% from 1 April 2026, 4% from 1 April 2028. Employee options 3.5, 4, 6, 8, 10 (3% by temporary reduction). */
export const KIWISAVER_DEFAULT_RATE = 3.5;
export const KIWISAVER_RATE_OPTIONS = [3, 3.5, 4, 6, 8, 10];

/**
 * Government contribution (IRD, since 1 July 2025): 25 cents per $1 contributed between 1 July and 30 June,
 * maximum $260.72 a year (needs $1,042.86), not available above $180,000 taxable income, ages 16 to 65.
 */
export const GOV_CONTRIBUTION_RATE = 0.25;
export const GOV_CONTRIBUTION_MAX = 260.72;
export const GOV_CONTRIBUTION_INCOME_LIMIT = 180_000;
export const GOV_CONTRIBUTION_MIN_AGE = 16;
export const GOV_CONTRIBUTION_MAX_AGE = 65;

/**
 * ESCT bands for employer contributions (business.govt.nz; calculate.co.nz says unchanged for 2026/27).
 * Rate depends on salary plus employer contributions: to $18,720 10.5%; to $64,200 17.5%; to $93,720 30%;
 * to $216,000 33%; above 39%.
 */
export const ESCT_BANDS: NzBracket[] = [
	{ upTo: 18_720, rate: 0.105 },
	{ upTo: 64_200, rate: 0.175 },
	{ upTo: 93_720, rate: 0.3 },
	{ upTo: 216_000, rate: 0.33 },
	{ upTo: Infinity, rate: 0.39 }
];

export function nzIncomeTax(income: number): number {
	let tax = 0;
	let lower = 0;
	for (const b of NZ_BRACKETS) {
		if (income > lower) tax += (Math.min(income, b.upTo) - lower) * b.rate;
		if (income <= b.upTo) break;
		lower = b.upTo;
	}
	return tax;
}

export function accLevy(income: number): number {
	return Math.min(income, ACC_MAX_EARNINGS) * ACC_RATE;
}

export function ietc(income: number): number {
	if (income < IETC_FROM || income >= IETC_END) return 0;
	if (income <= IETC_FULL_TO) return IETC_MAX;
	return Math.max(0, IETC_MAX - IETC_ABATE_RATE * (income - IETC_FULL_TO));
}

export function studentLoanRepayment(income: number): number {
	return Math.max(0, income - STUDENT_LOAN_THRESHOLD) * STUDENT_LOAN_RATE;
}

export function esctRate(salaryPlusEmployer: number): number {
	for (const b of ESCT_BANDS) if (salaryPlusEmployer <= b.upTo) return b.rate;
	return ESCT_BANDS[ESCT_BANDS.length - 1].rate;
}

export function govContribution(memberContribution: number, income: number): number {
	if (income > GOV_CONTRIBUTION_INCOME_LIMIT || !(memberContribution > 0)) return 0;
	return Math.min(GOV_CONTRIBUTION_RATE * memberContribution, GOV_CONTRIBUTION_MAX);
}
