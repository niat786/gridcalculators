/**
 * Australian income tax, Medicare levy, super and HELP figures for the 2026-27 income year
 * (1 July 2026 – 30 June 2027). Every figure below was checked against ato.gov.au on 2026-10-28.
 * Review each July (and each 1 June for the HELP indexation rate).
 */
export const AU_TAX_YEAR = '2026-27';
export const AU_TAX_YEAR_LONG = '1 July 2026 – 30 June 2027';

export const ATO_RATES_SOURCE = {
	title: 'ATO — Tax rates, Australian residents',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents'
};
export const ATO_CUTS_SOURCE = {
	title: 'ATO — Personal income tax: new tax cuts for every Australian taxpayer',
	url: 'https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer'
};
export const ATO_FOREIGN_SOURCE = {
	title: 'ATO — Tax rates, foreign residents',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents'
};
export const ATO_WHM_SOURCE = {
	title: 'ATO — Schedule 15: tax table for working holiday makers',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers'
};
export const ATO_MEDICARE_SOURCE = {
	title: 'ATO — Medicare levy reduction for low-income earners',
	url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners'
};
export const ATO_LITO_SOURCE = {
	title: 'ATO — Low income tax offset',
	url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset'
};
export const ATO_SG_SOURCE = {
	title: 'ATO — Super guarantee rates and maximum contribution base',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee'
};
export const ATO_CAPS_SOURCE = {
	title: 'ATO — Contributions caps',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps'
};
export const ATO_CONTRIB_TAX_SOURCE = {
	title: 'ATO — Caps, limits and tax on super contributions',
	url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/concessional-contributions-cap'
};
export const ATO_HELP_SOURCE = {
	title: 'ATO — HELP, TSL and SFSS repayment thresholds and rates',
	url: 'https://www.ato.gov.au/rates/HELP,-TSL-and-SFSS-repayment-thresholds-and-rates/'
};
export const ATO_INDEXATION_SOURCE = {
	title: 'ATO — Study and training support loans indexation rates',
	url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-indexation-rates'
};
export const APRA_BUFFER_SOURCE = {
	title: 'APRA — Strengthening residential mortgage lending assessments',
	url: 'https://www.apra.gov.au/news-and-publications/strengthening-residential-mortgage-lending-assessments'
};

export interface Bracket {
	/** Upper edge of the bracket (income up to and including this is taxed at `rate`). */
	upTo: number;
	rate: number;
}

/**
 * Resident rates 2026-27. ATO "Tax rates – Australian residents" lists 0–$18,200 nil, then 15c per $1 over
 * $18,200 up to $45,000 ($4,020 at $45,000), $4,020 + 30c to $135,000, $31,020 + 37c to $190,000,
 * $51,370 + 45c above. The ATO's tax-cuts page says: "From 1 July 2026, the 16 per cent rate will be reduced to 15 per cent."
 */
export const AU_RESIDENT_BRACKETS: Bracket[] = [
	{ upTo: 18_200, rate: 0 },
	{ upTo: 45_000, rate: 0.15 },
	{ upTo: 135_000, rate: 0.3 },
	{ upTo: 190_000, rate: 0.37 },
	{ upTo: Infinity, rate: 0.45 }
];

/**
 * Foreign resident rates. ATO "Tax rates – foreign residents" (latest table it shows is 2025-26):
 * 0–$135,000 30c per $1; $40,500 + 37c to $190,000; $60,850 + 45c above. The 15% cut applies to the resident
 * 16% rate only, so the ATO has not changed this table for 2026-27.
 */
export const AU_FOREIGN_BRACKETS: Bracket[] = [
	{ upTo: 135_000, rate: 0.3 },
	{ upTo: 190_000, rate: 0.37 },
	{ upTo: Infinity, rate: 0.45 }
];

/**
 * Working holiday maker (visa subclass 417 and 462) 2026-27, ATO Schedule 15: $0–$45,000 15%;
 * $45,001–$135,000 30%; $135,001–$190,000 37%; $190,001+ 45%.
 */
export const AU_WHM_BRACKETS: Bracket[] = [
	{ upTo: 45_000, rate: 0.15 },
	{ upTo: 135_000, rate: 0.3 },
	{ upTo: 190_000, rate: 0.37 },
	{ upTo: Infinity, rate: 0.45 }
];

/** Medicare levy rate. ATO: "These rates exclude the Medicare levy of 2%." */
export const MEDICARE_RATE = 0.02;
/**
 * Medicare levy low-income thresholds, single person, not entitled to SAPTO. ATO page (2025-26, last updated
 * 30 June 2026): lower threshold $28,011, upper threshold $35,013. The ATO had not published 2026-27
 * thresholds when this was checked, so these are the latest published.
 * Phase-in: 10c per $1 over the lower threshold (ATO example: $29,000 income gives a levy of $98.90).
 */
export const MEDICARE_LOW_LOWER = 28_011;
export const MEDICARE_LOW_UPPER = 35_013;
export const MEDICARE_PHASE_IN = 0.1;
export const MEDICARE_THRESHOLD_YEAR = '2025-26';

/**
 * Low income tax offset (resident). ATO: $700 at $37,500 or less; $700 less 5c per $1 over $37,500 up to $45,000;
 * $325 less 1.5c per $1 over $45,000 up to $66,667.
 */
export const LITO_MAX = 700;
export const LITO_FULL_TO = 37_500;
export const LITO_STEP1_RATE = 0.05;
export const LITO_STEP1_TO = 45_000;
export const LITO_STEP1_BASE = 325;
export const LITO_STEP2_RATE = 0.015;
export const LITO_END = 66_667;

/** Super guarantee 2026-27: 12.00% (ATO super guarantee page; stays at 12% from 1 July 2027). */
export const SG_RATE = 0.12;
/** Maximum contribution base 2026-27: $270,830 a year (ATO super guarantee page, under Payday Super). */
export const MAX_CONTRIBUTION_BASE = 270_830;

/** Concessional contributions cap 2026-27 $32,500 and non-concessional cap $130,000 (ATO contributions caps page). */
export const CONCESSIONAL_CAP = 32_500;
export const NON_CONCESSIONAL_CAP = 130_000;
/** ATO: "Concessional contributions are taxed in your super fund at the rate of 15%." */
export const CONTRIBUTIONS_TAX_RATE = 0.15;
/** Division 293 (ATO): extra 15% on concessional contributions when income plus contributions exceed $250,000. */
export const DIV293_THRESHOLD = 250_000;

/**
 * HELP compulsory repayment 2026-27 (ATO, marginal system). Repayment income up to $69,528: nil;
 * $69,529–$129,717: 15c per $1 over $69,528; $129,718–$186,050: $9,028 + 17c per $1 over $129,717;
 * $186,051 and over: 10% of total repayment income.
 */
export const HELP_NIL_TO = 69_528;
export const HELP_BAND2_TO = 129_717;
export const HELP_BAND2_RATE = 0.15;
export const HELP_BAND3_BASE = 9_028;
export const HELP_BAND3_TO = 186_050;
export const HELP_BAND3_RATE = 0.17;
export const HELP_TOP_RATE = 0.1;
/** Indexation applied on 1 June 2026 (ATO indexation page): 2.8%. 1 June 2025 was 3.2%. */
export const HELP_INDEXATION = 2.8;
export const HELP_INDEXATION_DATE = '1 June 2026';

/** APRA (6 Oct 2021): "All ADIs should be operating with a buffer of at least 3.0 percentage points over the loan interest rate." */
export const SERVICEABILITY_BUFFER = 3;

// ---------- shared maths ----------

export function bracketTax(income: number, brackets: Bracket[]): number {
	let tax = 0;
	let lower = 0;
	for (const b of brackets) {
		if (income > lower) tax += (Math.min(income, b.upTo) - lower) * b.rate;
		if (income <= b.upTo) break;
		lower = b.upTo;
	}
	return tax;
}

export function lito(taxable: number): number {
	if (taxable <= LITO_FULL_TO) return LITO_MAX;
	if (taxable <= LITO_STEP1_TO) return LITO_MAX - LITO_STEP1_RATE * (taxable - LITO_FULL_TO);
	if (taxable <= LITO_END) return LITO_STEP1_BASE - LITO_STEP2_RATE * (taxable - LITO_STEP1_TO);
	return 0;
}

/** Resident income tax after LITO (offset cannot make tax negative). */
export function residentTax(taxable: number): number {
	return Math.max(0, bracketTax(taxable, AU_RESIDENT_BRACKETS) - lito(taxable));
}

/** Medicare levy for a single resident (no SAPTO, no dependants). */
export function medicareLevy(taxable: number): number {
	if (taxable <= MEDICARE_LOW_LOWER) return 0;
	if (taxable <= MEDICARE_LOW_UPPER) return Math.min(MEDICARE_PHASE_IN * (taxable - MEDICARE_LOW_LOWER), MEDICARE_RATE * taxable);
	return MEDICARE_RATE * taxable;
}

export function helpRepayment(repaymentIncome: number): number {
	if (repaymentIncome <= HELP_NIL_TO) return 0;
	if (repaymentIncome <= HELP_BAND2_TO) return HELP_BAND2_RATE * (repaymentIncome - HELP_NIL_TO);
	if (repaymentIncome <= HELP_BAND3_TO) return HELP_BAND3_BASE + HELP_BAND3_RATE * (repaymentIncome - HELP_BAND2_TO);
	return HELP_TOP_RATE * repaymentIncome;
}
