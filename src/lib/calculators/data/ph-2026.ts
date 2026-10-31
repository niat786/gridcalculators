/**
 * Philippines: employee social contributions (SSS, PhilHealth, Pag-IBIG), the TRAIN-law income tax table and
 * the 13th month pay rules, as in force on 2026-10-28.
 *
 * Verified 2026-10-28. sss.gov.ph, philhealth.gov.ph, pagibigfund.gov.ph and bir.gov.ph could not be reached from the
 * build environment (the egress proxy refuses them), so every figure is confirmed in at least two independent
 * reputable sources (named above each figure).
 *
 * NOT MODELLED (said on the page): minimum-wage earner exemption, de minimis benefits, SSS WISP/MPF opt-outs,
 * voluntary or self-employed contribution schedules, GSIS (government employees), the 8% flat-rate option for
 * self-employed people, taxable allowances and overtime, and withholding on other income.
 */

export const PH_YEAR_LABEL = '2026';

/* ------------------------------------------------------------------ SSS */

export const PH_SSS_SOURCE = {
	title: 'Forvis Mazars Philippines: SSS contribution rates increased to 15% (January 2025)',
	url: 'https://www.forvismazars.com/ph/en/insights/hr-payroll-alerts/sss-contribution-rates-increased-to-15'
};
export const PH_SSS_TABLE_SOURCE = {
	title: 'Payroll Solutions PH: the new SSS contribution schedule effective January 2025 (MSC table)',
	url: 'https://www.payrollsolutions.ph/articles/46'
};
export const PH_SSS_SOURCE_2 = {
	title: 'Grant Thornton Philippines: SSS implements revised contribution rates for 2025 (Circular 2024-006)',
	url: 'https://www.grantthornton.com.ph/insights/articles-and-updates1/tax-notes/sss-implements-revised-contribution-rates-for-2025/'
};

// Forvis Mazars and Grant Thornton: "Total mandatory contribution 15% ... employer 10%, employee 5%", effective
// 1 January 2025 under RA 11199 / SSS Circular 2024-006. Forvis Mazars adds that the 2025 changes "finalize" the
// increases that began in 2019, so 2026 uses the same 15%.
export const PH_SSS_EMPLOYEE_RATE = 0.05;
export const PH_SSS_EMPLOYER_RATE = 0.1;
// Forvis Mazars, Grant Thornton and Vialto: minimum monthly salary credit (MSC) PHP 5,000, maximum PHP 35,000.
export const PH_SSS_MSC_MIN = 5_000;
export const PH_SSS_MSC_MAX = 35_000;
// Payroll Solutions PH (SSS table): each MSC covers a 500-peso band centred on it, so compensation of 5,250.00 to
// 5,749.99 maps to MSC 5,500. Pay below 5,250 maps to 5,000; pay of 34,750.00 and over maps to 35,000.
export const PH_SSS_MSC_STEP = 500;
// Payroll Solutions PH and Vialto: MSC up to 20,000 is "regular SS"; the part of the MSC above 20,000 (up to
// 35,000) goes to the Mandatory Provident Fund (MPF). Both are 5% for the employee, so the employee total is 5% of the MSC.
export const PH_SSS_REGULAR_MSC_CAP = 20_000;
// Payroll Solutions PH and Vialto: EC (employees' compensation) is paid by the employer only, so it is not deducted
// from the employee: PHP 10 below MSC 15,000 and PHP 30 from MSC 15,000 up.

/* ------------------------------------------------------------------ PhilHealth */

export const PH_PHILHEALTH_SOURCE = {
	title: 'SuperTutor PH: PhilHealth contribution table 2026 (RA 11223, 5% premium)',
	url: 'https://supertutor.ph/resources/benefits/philhealth-contribution-table-2026/'
};
export const PH_PHILHEALTH_SOURCE_2 = {
	title: 'SweldoPH: PhilHealth at 5% in 2026, why the floor and ceiling matter',
	url: 'https://sweldoph.com/news/philhealth-2026-premium-explained'
};
export const PH_PHILHEALTH_SOURCE_3 = {
	title: 'Philippine Daily Inquirer: Marcos studying cost, benefit of PhilHealth premium rate hike',
	url: 'https://newsinfo.inquirer.net/?p=1909158'
};

// SuperTutor PH and SweldoPH: premium is 5% of monthly basic salary, split equally (2.5% employee, 2.5% employer),
// the final step of the Universal Health Care Law (RA 11223) schedule, and "has stayed there through 2026".
// The Inquirer reports the 5% rate and the P100,000 ceiling, and that a deferral was only under review, not decided.
export const PH_PHILHEALTH_RATE = 0.05;
export const PH_PHILHEALTH_EMPLOYEE_SHARE = 0.5;
// SuperTutor PH, SweldoPH and the Inquirer: income floor 10,000 (premium PHP 500 total) and ceiling 100,000 (PHP 5,000 total).
export const PH_PHILHEALTH_FLOOR = 10_000;
export const PH_PHILHEALTH_CEILING = 100_000;

/* ------------------------------------------------------------------ Pag-IBIG */

export const PH_PAGIBIG_SOURCE = {
	title: 'iScale Solutions: Pag-IBIG contribution table and computation (HDMF Circular 460)',
	url: 'https://iscale-solutions.com/pag-ibig-contribution-table-and-computation/'
};
export const PH_PAGIBIG_SOURCE_2 = {
	title: 'NDV Law: the current maximum fund salary for computing Pag-IBIG contributions',
	url: 'https://ndvlaw.com/what-is-the-current-maximum-fund-salary-limit-for-computing-pag-ibig-contributions/'
};

// iScale and KAMI Workforce: employee 1% if monthly compensation is PHP 1,500 or less, 2% above that.
export const PH_PAGIBIG_LOW_PAY_LIMIT = 1_500;
export const PH_PAGIBIG_EMPLOYEE_RATE_LOW = 0.01;
export const PH_PAGIBIG_EMPLOYEE_RATE = 0.02;
// iScale and NDV Law: maximum fund salary (MFS) PHP 10,000 under HDMF Circular 460 (from February 2024; was 5,000).
// The page says the MFS "is a calculation ceiling, not an income ceiling", so the most an employee pays is 200 a month.
export const PH_PAGIBIG_MAX_FUND_SALARY = 10_000;

/* ------------------------------------------------------------------ Income tax (TRAIN, 2023 onward) */

export const PH_TAX_SOURCE = {
	title: 'PwC Worldwide Tax Summaries: Philippines, taxes on personal income',
	url: 'https://taxsummaries.pwc.com/philippines/individual/taxes-on-personal-income'
};
export const PH_TAX_SOURCE_2 = {
	title: 'Forvis Mazars Philippines: income tax table for 2023 onward',
	url: 'https://www.forvismazars.com/ph/en/insights/tax-alerts/income-tax-table-for-2023'
};
export const PH_TAX_SOURCE_3 = {
	title: 'PesoHub: BIR withholding tax table (Revenue Regulations 11-2018, Annex E)',
	url: 'https://www.pesohub.ph/government/bir/withholding-tax-table-philippines/'
};
export const PH_TAX_CONTRIBUTIONS_SOURCE = {
	title: 'Respicio & Co.: monthly application of tax deductions in employment (mandatory contributions are excluded from taxable pay)',
	url: 'https://www.respicio.ph/commentaries/monthly-application-of-tax-deductions-in-employment'
};

export interface PhTaxBracket {
	/** Income above this amount (the bracket floor). */
	over: number;
	/** Fixed tax on the floor. */
	base: number;
	/** Rate on the excess over the floor. */
	rate: number;
}

// PwC, Forvis Mazars and PesoHub (BIR Revenue Regulations 11-2018): resident individual rates effective 1 January 2023.
// Not over 250,000: nil. 250,000 to 400,000: 15% of the excess. 400,000 to 800,000: 22,500 + 20%. 800,000 to 2,000,000:
// 102,500 + 25%. 2,000,000 to 8,000,000: 402,500 + 30%. Over 8,000,000: 2,202,500 + 35%.
export const PH_TAX_BRACKETS: PhTaxBracket[] = [
	{ over: 0, base: 0, rate: 0 },
	{ over: 250_000, base: 0, rate: 0.15 },
	{ over: 400_000, base: 22_500, rate: 0.2 },
	{ over: 800_000, base: 102_500, rate: 0.25 },
	{ over: 2_000_000, base: 402_500, rate: 0.3 },
	{ over: 8_000_000, base: 2_202_500, rate: 0.35 }
];

// laborlaw.ph (citing BIR Revenue Regulations 11-2018), Respicio & Co. and Diskurso PH (citing section 32 of the Tax
// Code): 13th month pay and other benefits are excluded from gross income up to PHP 90,000 a year combined. A bill to
// raise it to 150,000 (House Bill 7661) was only filed, not enacted.
export const PH_BONUS_EXEMPTION = 90_000;

/* ------------------------------------------------------------------ 13th month pay */

export const PH_13TH_SOURCE = {
	title: 'DOLE revised guidelines on the implementation of the 13th Month Pay Law (PD 851)',
	url: 'https://chanrobles.com/PDF.LAWS/REVISED%20GUIDELINES%20ON%20THE%20IMPLEMENTATION%20OF%20THE%2013TH%20MONTH%20PAY%20LAW.pdf'
};
export const PH_13TH_SOURCE_2 = {
	title: 'LaborLaw.ph: 13th month pay (coverage, pro-rating, tax exemption)',
	url: 'https://laborlaw.ph/13th-month-pay/'
};

// DOLE revised guidelines: the minimum 13th month pay "shall not be less than one-twelfth of the total basic salary
// earned by an employee within a calendar year". Example: 9 months at 9,000 = 81,000, so 81,000 / 12 = 6,750.
export const PH_13TH_DIVISOR = 12;
// laborlaw.ph: employees need at least 30 calendar days (about one month) of service in the year to be entitled.
export const PH_13TH_MIN_MONTHS = 1;
// laborlaw.ph and the DOLE advisory: due not later than 24 December.
export const PH_13TH_DEADLINE = '24 December';
