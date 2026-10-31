/**
 * Singapore: resident individual income tax for the year of assessment 2026 (income earned 1 January to 31 December
 * 2025, filed in 2026) and CPF contribution and allocation rates from 1 January 2026, as in force on 2026-10-28.
 *
 * Verified 2026-10-28. iras.gov.sg (except one page) could not be reached from the build environment (the egress proxy
 * refuses it); cpf.gov.sg could be read for the senior-worker rates, the OW ceiling and the allocation table. Every other
 * figure is confirmed in at least two independent reputable sources (named above each figure).
 *
 * Budget 2026 (12 February 2026) announced NO personal income tax rebate for YA 2026 (Grant Thornton Singapore, Apexia,
 * Sleek and NationRules all say so; KPMG, Allen & Gledhill and Mondaq summaries of the Budget list only a 40% corporate
 * rebate). The 60% rebate capped at $200 was for YA 2025.
 *
 * NOT MODELLED (said on the page): non-residents (taxed differently), spouse, child, parent, NSman and disability reliefs (entered together as "other reliefs"), CPF relief for the self-employed,
 * and the Parenthood Tax Rebate. CPF: first- and second-year PR graduated rates, wages of $750 or less, the CPF Voluntary
 * Contribution rules, the annual CPF limit of $37,740 and MediSave Basic Healthcare Sum or Full Retirement Sum caps.
 */

export const SG_TAX_YEAR_LABEL = 'YA 2026';
export const SG_TAX_YEAR_LONG = 'year of assessment 2026 (income earned in 2025)';

export const SG_TAX_SOURCE = {
	title: 'NationRules: Singapore personal income tax rates, brackets and reliefs guide (YA 2026)',
	url: 'https://www.nationrules.com/singapore/iras-personal-income-tax-rates-guide/'
};
export const SG_TAX_SOURCE_2 = {
	title: '3E Accounting: Singapore tax and salary 2026, personal income tax rates',
	url: 'https://www.3ecpa.com.sg/blog/singapore-tax-salary-2026-personal-income-tax-rates-tax-residency-rules-cpf/'
};
export const SG_TAX_SOURCE_3 = {
	title: 'SmartCalculator.sg: Singapore personal income tax 2026 (YA 2026)',
	url: 'https://www.smartcalculator.sg/articles/singapore-income-tax-guide-2026'
};
export const SG_EIR_SOURCE = {
	title: 'IRAS: Earned Income Relief (age as at 31 December of the previous year)',
	url: 'https://www.iras.gov.sg/IRASHome/Individuals/Locals/Working-Out-Your-Taxes/Deductions-for-Individuals/Earned-Income-Relief/'
};
export const SG_RELIEFS_SOURCE = {
	title: 'Sleek: tax relief in Singapore (YA 2026)',
	url: 'https://sleek.com/sg/resources/tax-relief-singapore/'
};
export const SG_REBATE_SOURCE = {
	title: 'Grant Thornton Singapore: Singapore Budget 2026 (no personal income tax rebate)',
	url: 'https://www.grantthornton.sg/insights/2026-insights/singapore-budget-2026/'
};
export const SG_REBATE_SOURCE_2 = {
	title: 'Apexia: Singapore Budget 2026 tax changes (no personal income tax rebate for YA 2026)',
	url: 'https://apexiacorp.com/taxation/singapore-budget-2026-tax-changes-overview.html'
};

export interface SgTaxBand {
	/** Chargeable income above this amount. */
	over: number;
	/** Marginal rate above `over`, up to the next band. */
	rate: number;
}

// NationRules, 3E Accounting and Sleek/SmartCalculator (same table): resident rates for YA 2024 onward.
// First $20,000: 0%. Next $10,000: 2%. Next $10,000: 3.5%. Next $40,000: 7%. Next $40,000: 11.5%. Next $40,000: 15%.
// Next $40,000: 18%. Next $40,000: 19%. Next $40,000: 19.5%. Next $40,000: 20%. Next $180,000: 22%.
// Next $500,000: 23%. Above $1,000,000: 24%.
export const SG_TAX_BANDS: SgTaxBand[] = [
	{ over: 0, rate: 0 },
	{ over: 20_000, rate: 0.02 },
	{ over: 30_000, rate: 0.035 },
	{ over: 40_000, rate: 0.07 },
	{ over: 80_000, rate: 0.115 },
	{ over: 120_000, rate: 0.15 },
	{ over: 160_000, rate: 0.18 },
	{ over: 200_000, rate: 0.19 },
	{ over: 240_000, rate: 0.195 },
	{ over: 280_000, rate: 0.2 },
	{ over: 320_000, rate: 0.22 },
	{ over: 500_000, rate: 0.23 },
	{ over: 1_000_000, rate: 0.24 }
];

// IRAS (old Earned Income Relief page), NationRules, 3E Accounting and Sleek: the relief is $1,000 below 55, $6,000 at 55 to 59
// and $8,000 at 60 and above, using age on 31 December 2025 for YA 2026, and it cannot exceed taxable earned income.
// (Disability amounts of $4,000 / $10,000 / $12,000 are not modelled.)
export const SG_EIR_UNDER_55 = 1_000;
export const SG_EIR_55_TO_59 = 6_000;
export const SG_EIR_60_PLUS = 8_000;
// Sleek, 3E Accounting, DBS and NationRules: total personal reliefs are capped at $80,000 per year of assessment.
export const SG_RELIEF_CAP = 80_000;
// Sleek, 3E Accounting and SmartCalculator: CPF cash top-up relief up to $8,000 for your own account and up to $8,000 for family.
export const SG_CPF_TOPUP_SELF_CAP = 8_000;
export const SG_CPF_TOPUP_FAMILY_CAP = 8_000;
// Sleek, 3E Accounting, SmartCalculator and NationRules: SRS contribution relief up to $15,300 (citizens and PRs).
export const SG_SRS_CAP = 15_300;

/* ------------------------------------------------------------------ CPF */

export const SG_CPF_SOURCE = {
	title: 'CPF Board: changes to the CPF contribution rates for senior workers from 1 January 2026',
	url: 'https://www.cpf.gov.sg/service/article/what-are-the-changes-to-the-cpf-contribution-rates-for-senior-workers-from-1-january-2026'
};
export const SG_CPF_OW_SOURCE = {
	title: 'CPF Board: what is the Ordinary Wage (OW) ceiling?',
	url: 'https://cpf.gov.sg/employer/faq/employer-obligations/what-payments-attract-cpf-contributions/what-is-the-ordinary-wage-ceiling'
};
export const SG_CPF_ALLOCATION_SOURCE = {
	title: 'CPF Board: what are the CPF allocation rates for 2026?',
	url: 'https://www.cpf.gov.sg/service/article/what-are-the-cpf-allocation-rates'
};
export const SG_CPF_SOURCE_2 = {
	title: 'Endowus: CPF contribution rates 2026 (what employees and employers pay)',
	url: 'https://endowus.com/insights/how-much-cpf-contribution-rates'
};
export const SG_CPF_SOURCE_3 = {
	title: 'Endowus: how CPF allocation and contribution rates change as you grow older',
	url: 'https://endowus.com/insights/cpf-allocation-rates-how-it-changes-as-you-grow-older'
};
export const SG_CPF_SOURCE_4 = {
	title: 'SmartCalculator.sg: CPF contribution rates 2026 (rounding rules and worked example)',
	url: 'https://www.smartcalculator.sg/articles/cpf-contribution-rates'
};

// CPF Board (OW ceiling FAQ) and Endowus: the monthly OW ceiling is $8,000 from 1 January 2026 ($7,400 in 2025, $6,800 in 2024).
export const SG_CPF_OW_CEILING = 8_000;
// CPF Board: the annual salary ceiling is $102,000; wages for the year that count are $102,000 minus the OW already
// subject to CPF, so the additional wage (bonus) ceiling is $102,000 − 12 × min(OW, $8,000).
export const SG_CPF_ANNUAL_CEILING = 102_000;
// Wages above this monthly amount pay the full rates (CPF Board, Endowus).
export const SG_CPF_FULL_RATE_ABOVE = 750;

export interface SgCpfBand {
	value: string;
	label: string;
	/** Employee share, % of wages. */
	employee: number;
	/** Employer share, % of wages. */
	employer: number;
	/** Allocation, % of wages. `ra` is the Special Account up to 55 and the Retirement Account from 55. */
	oa: number;
	ra: number;
	ma: number;
	/** Name of the second account for this band. */
	raName: 'Special Account' | 'Retirement Account';
}

// CPF Board (senior worker article) and Endowus/SmartCalculator: from 1 January 2026, citizens and PRs in their third year
// or later, wages above $750 a month.
//   55 and below: employee 20%, employer 17% (37%).   Above 55 to 60: 18% + 16% (34%).   Above 60 to 65: 12.5% + 12.5% (25%).
//   Above 65 to 70: 7.5% + 9% (16.5%).                Above 70: 5% + 7.5% (12.5%).
// Allocation: the CPF Board 2026 allocation table gives each account's share of the total contribution (for example, age 35
// and below: OA 0.6217, SA 0.1621, MA 0.2162 of 37%). Multiplied out, these are whole or half percentages of wages, which are
// stored below: 23 / 6 / 8 for 35 and below; 21 / 7 / 9 above 35 to 45; 19 / 8 / 10 above 45 to 50; 15 / 11.5 / 10.5 above
// 50 to 55; 12 / 11.5 / 10.5 above 55 to 60; 3.5 / 11 / 10.5 above 60 to 65; 1 / 5 / 10.5 above 65 to 70; 1 / 1 / 10.5 above 70.
// Endowus' 2026 table independently confirms the two 55 to 65 rows (12 / 11.5 / 10.5 and 3.5 / 11 / 10.5).
export const SG_CPF_BANDS: SgCpfBand[] = [
	{ value: 'u35', label: '35 and below', employee: 20, employer: 17, oa: 23, ra: 6, ma: 8, raName: 'Special Account' },
	{ value: 'a35', label: 'Above 35 to 45', employee: 20, employer: 17, oa: 21, ra: 7, ma: 9, raName: 'Special Account' },
	{ value: 'a45', label: 'Above 45 to 50', employee: 20, employer: 17, oa: 19, ra: 8, ma: 10, raName: 'Special Account' },
	{ value: 'a50', label: 'Above 50 to 55', employee: 20, employer: 17, oa: 15, ra: 11.5, ma: 10.5, raName: 'Special Account' },
	{ value: 'a55', label: 'Above 55 to 60', employee: 18, employer: 16, oa: 12, ra: 11.5, ma: 10.5, raName: 'Retirement Account' },
	{ value: 'a60', label: 'Above 60 to 65', employee: 12.5, employer: 12.5, oa: 3.5, ra: 11, ma: 10.5, raName: 'Retirement Account' },
	{ value: 'a65', label: 'Above 65 to 70', employee: 7.5, employer: 9, oa: 1, ra: 5, ma: 10.5, raName: 'Retirement Account' },
	{ value: 'a70', label: 'Above 70', employee: 5, employer: 7.5, oa: 1, ra: 1, ma: 10.5, raName: 'Retirement Account' }
];

// SmartCalculator.sg (CPF rounding): total contribution is rounded to the nearest dollar, the employee's cents are dropped,
// and the employer's share is the remainder.
