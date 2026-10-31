/**
 * Pakistan: salaried-individual income tax slabs and property transaction taxes for tax year 2027
 * (1 July 2026 to 30 June 2027), as set by the Finance Act, 2026 (assent late June 2026, in force 1 July 2026).
 * The previous year, tax year 2026 (1 July 2025 to 30 June 2026, Finance Act 2025), is kept for side-by-side use.
 *
 * Verified 2026-10-28. fbr.gov.pk could not be reached from the build environment (the egress proxy refuses it), so
 * every figure below is confirmed in at least two independent reputable sources, the main one being KPMG Taseer Hadi's
 * "A Brief of Finance Act 2026" (July 2026), which reproduces the First Schedule changes of the Act.
 *
 * NOT VERIFIED, so NOT MODELLED:
 *  - rates for persons NOT on the Active Taxpayers List (non-filers) under sections 236C and 236K. KPMG only says the
 *    general 100% increase applies; secondary sites give conflicting figures (5.5% vs 11.5% for 236C).
 *  - capital gains tax (section 37) for sellers not on the ATL (normal slab rates with a 15% floor, per the sources).
 *  - any marginal relief on the old 9% surcharge (section 4AB) for tax year 2026 just above Rs 10 million.
 *  - provincial stamp duty, capital value tax, registration fees (they vary by province).
 */

export const PK_TAX_YEAR_LABEL = 'tax year 2027';
export const PK_TAX_YEAR_PERIOD = '1 July 2026 to 30 June 2027';
export const PK_PREV_TAX_YEAR_LABEL = 'tax year 2026';
export const PK_PREV_TAX_YEAR_PERIOD = '1 July 2025 to 30 June 2026';

export const PK_KPMG_SOURCE = {
	title: 'KPMG Taseer Hadi & Co.: A Brief of Finance Act 2026 (July 2026)',
	url: 'https://assets.kpmg.com/content/dam/kpmgsites/pk/pdf/2026/07/A%20Brief%20of%20Finance%20Act%202026.pdf.coredownload.inline.pdf'
};
export const PK_PWC_SOURCE = {
	title: 'PwC Worldwide Tax Summaries: Pakistan, taxes on personal income',
	url: 'https://taxsummaries.pwc.com/pakistan/individual/taxes-on-personal-income'
};
export const PK_VIALTO_SOURCE = {
	title: 'Vialto Partners: Pakistan Finance Bill 2026-27 employment tax summary',
	url: 'https://vialtopartners.com/regional-alerts/pakistan-employment-tax-finance-bill-2026-27-summary'
};
export const PK_PREV_YEAR_SOURCE = {
	title: 'Mercans: Pakistan Finance Act 2025, changes to tax rates and surcharge rate',
	url: 'https://mercans.com/resources/statutory-alerts/pakistan-finance-act-2025-changes-to-tax-rates-and-surcharge-rate'
};
export const PK_PREV_YEAR_SOURCE_2 = {
	title: 'Business Recorder: Budget 2025-26, tax relief for the salaried class',
	url: 'https://www.brecorder.com/news/amp/40367015'
};

export interface PkSlab {
	/** Upper limit of the slab in rupees (inclusive), or null for the top slab. */
	upTo: number | null;
	/** Marginal rate as a fraction. */
	rate: number;
}

/**
 * Salaried individuals, First Schedule Part I Division I, tax year 2027 (Finance Act 2026).
 * KPMG (Act brief): "Up to 600,000 nil; 600,001-1,200,000 1% of excess over 600,000; 1,200,001-2,200,000 Rs 6,000 + 11%
 * of excess over 1,200,000; 2,200,001-3,200,000 Rs 116,000 + 20%; 3,200,001-4,100,000 Rs 316,000 + 25%;
 * 4,100,001-5,600,000 Rs 541,000 + 29%; 5,600,001-7,000,000 Rs 976,000 + 32%; above 7,000,000 Rs 1,424,000 + 35%".
 * PwC Pakistan and Vialto show the same table. The table applies where salary is more than 75% of taxable income.
 */
export const PK_SALARIED_SLABS_2027: PkSlab[] = [
	{ upTo: 600_000, rate: 0 },
	{ upTo: 1_200_000, rate: 0.01 },
	{ upTo: 2_200_000, rate: 0.11 },
	{ upTo: 3_200_000, rate: 0.2 },
	{ upTo: 4_100_000, rate: 0.25 },
	{ upTo: 5_600_000, rate: 0.29 },
	{ upTo: 7_000_000, rate: 0.32 },
	{ upTo: null, rate: 0.35 }
];

/**
 * Tax year 2026 (Finance Act 2025). Mercans: "Rs 6,000 + 11% over 1.2m; Rs 116,000 + 23% over 2.2m; Rs 346,000 + 30% over
 * 3.2m; Rs 616,000 + 35% over 4.1m". Business Recorder (Finance Bill 2025 report) shows the same table. Written here
 * with the same slab edges as tax year 2027 (35% applies from 4.1m, so the 4.1m-5.6m, 5.6m-7m and top slabs are all 35%).
 */
export const PK_SALARIED_SLABS_2026: PkSlab[] = [
	{ upTo: 600_000, rate: 0 },
	{ upTo: 1_200_000, rate: 0.01 },
	{ upTo: 2_200_000, rate: 0.11 },
	{ upTo: 3_200_000, rate: 0.23 },
	{ upTo: 4_100_000, rate: 0.3 },
	{ upTo: 5_600_000, rate: 0.35 },
	{ upTo: 7_000_000, rate: 0.35 },
	{ upTo: null, rate: 0.35 }
];

/**
 * Section 4AB surcharge on salaried individuals.
 * Tax year 2027: withdrawn. KPMG: "The Act exempts salaried persons from this surcharge" (it was 9% under the Finance Act 2025).
 * Vialto: "9% surcharge ... on taxable income above Rs 10 million is withdrawn for salaried individuals".
 */
export const PK_SURCHARGE_2027 = { rate: 0, threshold: 10_000_000 };
/**
 * Tax year 2026: 9% of the tax for salaried individuals with taxable income above Rs 10 million (cut from 10%).
 * Mercans: "taxable income over Rs 10,000,000 pay a surcharge of 9%". Business Recorder: "reduced from 10% to 9%".
 */
export const PK_SURCHARGE_2026 = { rate: 0.09, threshold: 10_000_000 };

/**
 * Advance tax on property, tax year 2027 (Finance Act 2026), people on the Active Taxpayers List (ATL).
 * KPMG: "Section 236C (sale or transfer), Division X: single rate of 2.75%, irrespective of consideration. Section 236K
 * (purchase), Division XVIII: single rate of 1.25%, irrespective of fair market value." The Bill's 236K figure was
 * reported as 1.5% in early budget papers; the Act figure is 1.25%.
 * KPMG: "Rule 1A of the Tenth Schedule is omitted. Late filers now face the same rates" as other ATL filers.
 */
export const PK_RATE_236C_ATL = 0.0275;
export const PK_RATE_236K_ATL = 0.0125;

export const PK_PROPERTY_SOURCES = [
	PK_KPMG_SOURCE,
	{
		title: 'Profit (Pakistan Today): Government slashes property transfer taxes in Finance Bill 2026-27',
		url: 'https://profit.pakistantoday.com.pk/2026/06/12/government-slashes-property-transfer-taxes-in-finance-bill-2026-27'
	}
];

/**
 * Capital gain on immovable property, section 37(1A) and First Schedule Part I Division VIII, for sellers on the ATL.
 * Property acquired on or after 1 July 2024: flat 15% of the gain, holding period no longer matters.
 * Source: Profit, "FBR removes holding period for property capital gains tax" (31 July 2024): "a flat rate of 15% for those
 * listed on the Active Taxpayers List at the time of disposal"; confirmed by paktaxcalculatorr.pk and bacoconsultants.com.
 * The Finance Act 2026 made no change to these rates (KPMG describes no Act-stage change).
 */
export const PK_CGT_AFTER_JULY_2024 = 0.15;

/**
 * Property acquired on or before 30 June 2024: rate falls with the holding period.
 * Index 0 = up to 1 year, 1 = over 1 to 2 years, ... 5 = over 5 to 6 years, then 0% over 6 years.
 * KPMG table (open plots / constructed property / flats): up to 1y 15 / 15 / 15; 1-2y 12.5 / 10 / 7.5;
 * 2-3y 10 / 7.5 / 0; 3-4y 7.5 / 5 / 0; 4-5y 5 / 0 / 0; 5-6y 2.5 / 0 / 0; over 6y 0. Matches bacoconsultants.com and paktaxcalculatorr.pk.
 */
export const PK_CGT_BEFORE_JULY_2024: Record<'plot' | 'house' | 'flat', number[]> = {
	plot: [0.15, 0.125, 0.1, 0.075, 0.05, 0.025],
	house: [0.15, 0.1, 0.075, 0.05, 0, 0],
	flat: [0.15, 0.075, 0, 0, 0, 0]
};
export const PK_CGT_SOURCES = [
	PK_KPMG_SOURCE,
	{
		title: 'Profit (Pakistan Today): FBR removes holding period for property capital gains tax',
		url: 'https://profit.pakistantoday.com.pk/2024/07/31/fbr-removes-holding-period-for-property-capital-gains-tax'
	}
];
