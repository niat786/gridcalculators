/**
 * South African tax and payroll rules for the 2026/27 tax year (1 March 2026 – 28 February 2027,
 * SARS calls it the "2027 year of assessment"), shared by the South Africa calculators:
 * income tax, take-home pay and transfer duty.
 *
 * Every figure has a comment with the source and what it says. Verified on 2026-10-28.
 * Review every February (Budget Speech: brackets, rebates, medical credits, retirement cap) and
 * whenever the Minister changes the UIF ceiling or the transfer duty table.
 *
 * NOT MODELLED (stated on the pages): the additional medical expenses tax credit, carry-forward of
 * retirement contributions above the cap, taxable fringe benefits, travel allowances, interest and
 * dividends exemptions, capital gains, tax on lump sums, the Skills Development Levy (paid by the
 * employer), and the exact SARS PAYE tables (the tools annualise the pay instead).
 */

export const ZA_TAX_YEAR_LABEL = '2026/27 tax year (1 March 2026 – 28 February 2027)';
export const ZA_TAX_YEAR_SHORT = '2026/27';

export const SARS_RATES_SOURCE = {
	title: 'SARS — Rates of tax for individuals (2027 tax year)',
	url: 'https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/'
};
export const SARS_EMPLOYER_GUIDE_SOURCE = {
	title: 'SARS — Guide for Employers in respect of Employees’ Tax (2027)',
	url: 'https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/'
};
export const SARS_TRANSFER_DUTY_SOURCE = {
	title: 'SARS — Transfer duty rates',
	url: 'https://www.sars.gov.za/tax-rates/transfer-duty/'
};
export const SARS_UIF_SOURCE = {
	title: 'SARS — Unemployment Insurance Fund (UIF)',
	url: 'https://www.sars.gov.za/types-of-tax/unemployment-insurance-fund/'
};
export const ZA_BUDGET_SOURCE = {
	title: 'TaxTim — Budget 2026: what it actually means for your pocket',
	url: 'https://www.taxtim.com/za/blog/budget-2026-what-it-actually-means-for-your-pocket'
};

export interface ZaBracket {
	/** Upper limit of the bracket (taxable income, rand); Infinity for the top one. */
	upTo: number;
	/** Rate on the part of income inside this bracket. */
	rate: number;
	/** Tax on all income below the bracket's lower limit. */
	base: number;
	/** Lower limit of the bracket (the amount the rate applies above). */
	from: number;
}

/*
 * SARS "Rates of tax for individuals", 2027 tax year (1 March 2026 – 28 February 2027):
 *   1 – 245 100           18% of taxable income
 *   245 101 – 383 100     44 118 + 26% of the amount above 245 100
 *   383 101 – 530 200     79 998 + 31% of the amount above 383 100
 *   530 201 – 695 800     125 599 + 36% of the amount above 530 200
 *   695 801 – 887 000     185 215 + 39% of the amount above 695 800
 *   887 001 – 1 878 600   259 783 + 41% of the amount above 887 000
 *   1 878 601 and above   666 339 + 45% of the amount above 1 878 600
 * Confirmed by Xero SA and TaxTim (Budget 2026: 18% band now to R245 100, 45% above R1 878 600).
 */
export const ZA_BRACKETS: ZaBracket[] = [
	{ from: 0, upTo: 245_100, rate: 0.18, base: 0 },
	{ from: 245_100, upTo: 383_100, rate: 0.26, base: 44_118 },
	{ from: 383_100, upTo: 530_200, rate: 0.31, base: 79_998 },
	{ from: 530_200, upTo: 695_800, rate: 0.36, base: 125_599 },
	{ from: 695_800, upTo: 887_000, rate: 0.39, base: 185_215 },
	{ from: 887_000, upTo: 1_878_600, rate: 0.41, base: 259_783 },
	{ from: 1_878_600, upTo: Infinity, rate: 0.45, base: 666_339 }
];

/*
 * SARS rebates, 2027 tax year: Primary R17 820 (all individuals); Secondary R9 765 (age 65 and over,
 * on top of the primary); Tertiary R3 249 (age 75 and over, on top of both).
 * Age is measured on the last day of the tax year (28 February 2027).
 */
export const ZA_REBATE_PRIMARY = 17_820;
export const ZA_REBATE_SECONDARY = 9_765;
export const ZA_REBATE_TERTIARY = 3_249;

/*
 * SARS tax thresholds, 2027 tax year (the income below which no tax is payable, before medical credits):
 * under 65: R99 000; 65 to 74: R153 250; 75 and over: R171 300.
 * These equal (rebates ÷ 18%), which the code uses to check them in the tests.
 */
export const ZA_THRESHOLDS = { under65: 99_000, age65: 153_250, age75: 171_300 };

/*
 * Medical scheme fees tax credit, from 1 March 2026, per month: R376 for the main member, R376 for
 * the first dependant, R254 for each additional dependant. (SARS Guide for Employers 2027 lists
 * R376 / R376 / R254; TaxTim on Budget 2026: "R376 per month ... up from R364, and R254 ... up from R246".)
 * The credit cannot reduce the tax below zero.
 */
export const ZA_MEDICAL_CREDIT_MAIN = 376;
export const ZA_MEDICAL_CREDIT_FIRST_DEPENDANT = 376;
export const ZA_MEDICAL_CREDIT_OTHER_DEPENDANT = 254;

/*
 * Retirement fund contributions (pension, provident, retirement annuity) are deductible up to the
 * lesser of 27.5% of the higher of remuneration or taxable income and R430 000 a year.
 * SARS Guide for Employers 2027: "the lesser of R430 000 or 27.5% of the higher of remuneration or
 * taxable income". TaxTim on Budget 2026: the rand cap rises from R350 000 to R430 000.
 */
export const ZA_RETIREMENT_RATE = 0.275;
export const ZA_RETIREMENT_CAP = 430_000;

/*
 * UIF: SARS says the employee pays 1% of remuneration and the employer 1%, on remuneration up to a
 * monthly ceiling of R17 712 (annual R212 544; maximum R177.12 a month each). Ceiling effective 1 June 2021.
 */
export const ZA_UIF_RATE = 0.01;
export const ZA_UIF_MONTHLY_CEILING = 17_712;

/*
 * Transfer duty, SARS table ("2027 table, effective from 1 April 2026, no changes" from the 2026 table
 * effective 1 April 2025; also in the Rates and Monetary Amounts Act 3 of 2026):
 *   1 – 1 210 000               0%
 *   1 210 001 – 1 663 800       3% of the value above 1 210 000
 *   1 663 801 – 2 329 300       13 614 + 6% of the value above 1 663 800
 *   2 329 301 – 2 994 800       53 544 + 8% of the value above 2 329 300
 *   2 994 801 – 13 310 000      106 784 + 11% of the value above 2 994 800
 *   13 310 001 and above        1 241 456 + 13% of the value above 13 310 000
 */
export const ZA_TRANSFER_DUTY: ZaBracket[] = [
	{ from: 0, upTo: 1_210_000, rate: 0, base: 0 },
	{ from: 1_210_000, upTo: 1_663_800, rate: 0.03, base: 0 },
	{ from: 1_663_800, upTo: 2_329_300, rate: 0.06, base: 13_614 },
	{ from: 2_329_300, upTo: 2_994_800, rate: 0.08, base: 53_544 },
	{ from: 2_994_800, upTo: 13_310_000, rate: 0.11, base: 106_784 },
	{ from: 13_310_000, upTo: Infinity, rate: 0.13, base: 1_241_456 }
];

export type ZaAge = 'under65' | '65to74' | '75plus';

export function zaBracketFor(table: ZaBracket[], amount: number): ZaBracket {
	for (const b of table) if (amount <= b.upTo) return b;
	return table[table.length - 1];
}

/** Tax from a bracket table (before rebates and credits). */
export function zaTableTax(table: ZaBracket[], amount: number): number {
	if (!(amount > 0)) return 0;
	const b = zaBracketFor(table, amount);
	return b.base + (amount - b.from) * b.rate;
}

export function zaRebates(age: ZaAge): number {
	return ZA_REBATE_PRIMARY + (age !== 'under65' ? ZA_REBATE_SECONDARY : 0) + (age === '75plus' ? ZA_REBATE_TERTIARY : 0);
}

export function zaThreshold(age: ZaAge): number {
	return age === '75plus' ? ZA_THRESHOLDS.age75 : age === '65to74' ? ZA_THRESHOLDS.age65 : ZA_THRESHOLDS.under65;
}

/** Monthly medical scheme fees tax credit for the main member plus dependants (members = total people on the scheme). */
export function zaMedicalCreditMonthly(members: number): number {
	const n = Math.max(0, Math.floor(members));
	if (n === 0) return 0;
	if (n === 1) return ZA_MEDICAL_CREDIT_MAIN;
	return ZA_MEDICAL_CREDIT_MAIN + ZA_MEDICAL_CREDIT_FIRST_DEPENDANT + (n - 2) * ZA_MEDICAL_CREDIT_OTHER_DEPENDANT;
}

export interface ZaTaxResult {
	taxBeforeRebates: number;
	rebates: number;
	medicalCredit: number;
	/** Tax payable for the year, never below zero. */
	tax: number;
	/** Marginal rate on the next rand of income (0 while rebates and credits still absorb the tax). */
	marginalRate: number;
	averageRate: number;
	bracketRate: number;
}

/** Annual normal tax for the 2026/27 year. `medicalMembers` counts the main member and every dependant. */
export function zaIncomeTax(taxableIncome: number, age: ZaAge, medicalMembers: number): ZaTaxResult {
	const income = Math.max(0, taxableIncome);
	const taxBeforeRebates = zaTableTax(ZA_BRACKETS, income);
	const rebates = zaRebates(age);
	const medicalCredit = zaMedicalCreditMonthly(medicalMembers) * 12;
	const afterRebates = Math.max(0, taxBeforeRebates - rebates);
	const tax = Math.max(0, afterRebates - medicalCredit);
	const bracketRate = zaBracketFor(ZA_BRACKETS, income).rate;
	const marginalRate = taxBeforeRebates - rebates - medicalCredit >= 0 ? bracketRate : 0;
	return { taxBeforeRebates, rebates, medicalCredit, tax, marginalRate, averageRate: income > 0 ? tax / income : 0, bracketRate };
}

/** Annual retirement fund deduction allowed: lesser of the contribution, 27.5% of remuneration and the rand cap. */
export function zaRetirementDeduction(annualContribution: number, annualRemuneration: number): number {
	return Math.max(0, Math.min(annualContribution, ZA_RETIREMENT_RATE * annualRemuneration, ZA_RETIREMENT_CAP));
}

export function zaTransferDuty(price: number): number {
	return zaTableTax(ZA_TRANSFER_DUTY, price);
}
