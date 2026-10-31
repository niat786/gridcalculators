/**
 * Nigerian personal income tax (PAYE) rules under the Nigeria Tax Act 2025, in force from 1 January 2026.
 * The old Personal Income Tax Act (PITA) rules, including the Consolidated Relief Allowance, are NOT used.
 *
 * Every figure has a comment with the source and what it says. Verified on 2026-10-28.
 * Review whenever the National Assembly amends the Act or the Nigeria Revenue Service issues new PAYE regulations.
 *
 * NOT MODELLED (stated on the page): the exact payroll treatment of bonuses and one-off payments, benefits in
 * kind, the pension base set in an employee's own contract (the tool uses basic + housing + transport, the
 * statutory minimum), and income other than employment pay.
 */

export const NG_TAX_YEAR_LABEL = '2026 tax year under the Nigeria Tax Act 2025';

export const NG_PWC_SOURCE = {
	title: 'PwC Worldwide Tax Summaries — Nigeria, individual taxes on personal income',
	url: 'https://taxsummaries.pwc.com/nigeria/individual'
};
export const NG_DEDUCTIONS_SOURCE = {
	title: 'Mondaq — Comprehensive guide: personal income tax deductions under the Nigeria Tax Act 2025',
	url: 'https://www.mondaq.com/nigeria/tax-authorities/1751764/comprehensive-guide-personal-income-tax-deductions-under-the-nigeria-tax-act-2025'
};
export const NG_BANDS_SOURCE = {
	title: 'Adeola Oyinlade & Co — Understanding personal income tax under the Nigeria Tax Act 2025',
	url: 'https://www.adeolaoyinlade.com/en/?p=5551'
};
export const NG_NHF_SOURCE = {
	title: 'National Housing Fund Act, Cap N45 (Laws of the Federation)',
	url: 'https://placng.org/lawsofnigeria/laws/N45.pdf'
};

export interface NgBand {
	/** Width of the band in naira (Infinity for the last). */
	width: number;
	rate: number;
}

/*
 * PwC Worldwide Tax Summaries (Nigeria, effective 2026) and Adeola Oyinlade & Co both list the annual bands:
 *   first N800,000 0%; next N2,200,000 15%; next N9,000,000 18%; next N13,000,000 21%;
 *   next N25,000,000 23%; above N50,000,000 25%.
 * Cumulative limits: 800,000 / 3,000,000 / 12,000,000 / 25,000,000 / 50,000,000.
 */
export const NG_BANDS: NgBand[] = [
	{ width: 800_000, rate: 0 },
	{ width: 2_200_000, rate: 0.15 },
	{ width: 9_000_000, rate: 0.18 },
	{ width: 13_000_000, rate: 0.21 },
	{ width: 25_000_000, rate: 0.23 },
	{ width: Infinity, rate: 0.25 }
];

/*
 * Rent relief, section 30(2)(a)(vi): 20% of annual rent paid, capped at N500,000 (PwC: "20% of annual rent paid,
 * capped at NGN 500,000"; Mondaq and Adeola Oyinlade agree). It replaces the Consolidated Relief Allowance, which the
 * Act removes (PwC: "CRA: Removed").
 */
export const NG_RENT_RELIEF_RATE = 0.2;
export const NG_RENT_RELIEF_CAP = 500_000;

/*
 * Pension, section 30(2)(a)(iii): the employee's 8% contribution is deductible, worked out on basic salary, housing
 * allowance and transport allowance (Mondaq). The Pension Reform Act 2014 sets the minimum employee rate at 8% of
 * monthly emoluments, which must be at least basic + housing + transport (Nairametrics summary of the Act).
 * The employer's 10% is not part of the employee's taxable income.
 */
export const NG_PENSION_RATE = 0.08;

/*
 * National Housing Fund, section 30(2)(a)(i): 2.5% of basic salary, fully deductible (Mondaq). The NHF Act section 4(1)
 * requires workers earning N3,000 or more a year to contribute "2.5 per cent of his basic monthly salary".
 */
export const NG_NHF_RATE = 0.025;

export function ngBandTax(chargeable: number): { tax: number; marginalRate: number } {
	let remaining = Math.max(0, chargeable);
	let tax = 0;
	let marginalRate = 0;
	for (const band of NG_BANDS) {
		const part = Math.min(remaining, band.width);
		if (part > 0) {
			tax += part * band.rate;
			marginalRate = band.rate;
		}
		remaining -= part;
		if (remaining <= 0) break;
	}
	return { tax, marginalRate };
}

export function ngRentRelief(annualRent: number): number {
	return Math.min(Math.max(0, annualRent) * NG_RENT_RELIEF_RATE, NG_RENT_RELIEF_CAP);
}
