/**
 * Kenyan PAYE and payroll deduction rules in force from February 2026 (NSSF Year 4), shared by the Kenya calculators.
 *
 * Every figure has a comment with the source and what it says. Verified on 2026-10-28.
 * Review each February (NSSF limits step up) and every July (Finance Act). The Finance Act 2026 (effective 1 July 2026)
 * was checked in EY and Legal 500 summaries: neither lists any change to PAYE bands, personal relief, SHIF, the housing
 * levy or NSSF, and the Finance Committee declined to adopt a higher tax-free threshold.
 *
 * NOT MODELLED (stated on the page): insurance relief, post-retirement medical fund, mortgage interest, and registered
 * pension or provident contributions beyond NSSF, benefits in kind, bonuses taxed separately, and the employer's own
 * housing levy and NSSF share.
 */

export const KE_PERIOD_LABEL = 'Kenya payroll rules from February 2026 (NSSF Year 4)';

export const KRA_PAYE_SOURCE = {
	title: 'KRA — PAYE (rates and personal relief)',
	url: 'https://kra.go.ke/individual/filing-paying/types-of-taxes/paye'
};
export const KRA_TLAA_SOURCE = {
	title: 'KRA — Amendments to PAYE computation pursuant to the Tax Laws (Amendment) Act, 2024',
	url: 'https://www.kra.go.ke/news-center/public-notices/2157-amendments-to-paye-computation-pursuant-to-the-tax-laws-amendment-act%2C-2024'
};
export const NSSF_YEAR4_SOURCE = {
	title: 'PwC Kenya — Tax alert: NSSF Year 4 rates (from 1 February 2026)',
	url: 'https://www.pwc.com/ke/en/assets/pdf/tax-alert-year-4nssf-rates-2026.pdf'
};
export const SHA_PREMIUM_SOURCE = {
	title: 'Social Health Authority — Premium rates',
	url: 'https://sha.go.ke/premium-rates'
};
export const KE_PWC_OTHER_TAXES_SOURCE = {
	title: 'PwC Worldwide Tax Summaries — Kenya, other taxes (SHIF and Affordable Housing Levy)',
	url: 'https://taxsummaries.pwc.com/Kenya/Individual/Other-taxes'
};

export interface KeBand {
	/** Width of the band in shillings per month (Infinity for the last). */
	width: number;
	rate: number;
}

/*
 * KRA PAYE page, monthly bands: first 24,000 at 10%; next 8,333 (to 32,333) at 25%; next 467,667 (to 500,000) at 30%;
 * next 300,000 (to 800,000) at 32.5%; above 800,000 at 35%. Monthly personal relief KSh 2,400 (KSh 28,800 a year).
 * The relief is subtracted from the tax worked out across the bands. Unchanged by the Finance Act 2026 (see header).
 */
export const KE_BANDS: KeBand[] = [
	{ width: 24_000, rate: 0.1 },
	{ width: 8_333, rate: 0.25 },
	{ width: 467_667, rate: 0.3 },
	{ width: 300_000, rate: 0.325 },
	{ width: Infinity, rate: 0.35 }
];
export const KE_PERSONAL_RELIEF = 2_400;

/*
 * NSSF Year 4, from 1 February 2026 (PwC Kenya tax alert; Gender and Affirmative Action notice to employers): 6% employee
 * and 6% employer; Lower Earnings Limit KES 9,000 (Tier I, KES 540 each); Upper Earnings Limit KES 108,000 (Tier II is 6% of
 * the band between 9,000 and 108,000, KES 5,940 each). Maximum employee contribution KES 6,480 a month.
 * Pay below the LEL pays 6% of the pay.
 */
export const NSSF_RATE = 0.06;
export const NSSF_LEL = 9_000;
export const NSSF_UEL = 108_000;

/*
 * SHIF (Social Health Authority premium rates page): salaried employees pay 2.75% of gross monthly income, minimum
 * KES 300 a month, no upper limit. Deductible before PAYE from 27 December 2024 (Tax Laws (Amendment) Act 2024,
 * new section 15(2)(ae); KRA public notice 2157 lists SHIF as deductible in working out taxable employment income).
 */
export const SHIF_RATE = 0.0275;
export const SHIF_MIN = 300;

/*
 * Affordable Housing Levy: employee pays 1.5% of gross monthly pay, no cap (PwC Kenya). From 27 December 2024 the 15% relief
 * is replaced by a deduction for the whole employee contribution (section 15(2)(ac); KRA notice 2157).
 */
export const AHL_RATE = 0.015;

export function keNssf(gross: number): { tier1: number; tier2: number; total: number } {
	const g = Math.max(0, gross);
	const tier1 = NSSF_RATE * Math.min(g, NSSF_LEL);
	const tier2 = NSSF_RATE * Math.max(0, Math.min(g, NSSF_UEL) - NSSF_LEL);
	return { tier1, tier2, total: tier1 + tier2 };
}

export function keShif(gross: number): number {
	return Math.max(SHIF_MIN, SHIF_RATE * Math.max(0, gross));
}

export function keBandTax(taxable: number): { tax: number; marginalRate: number } {
	let remaining = Math.max(0, taxable);
	let tax = 0;
	let marginalRate = KE_BANDS[0].rate;
	for (const band of KE_BANDS) {
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
