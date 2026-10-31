/**
 * Canadian tax and money rules for 2026, shared by the Canada calculators:
 * income tax, take-home pay, RRSP, TFSA, land transfer tax, mortgage stress test, sales tax, CPP.
 *
 * Every figure has a comment with the source and what it says. Verified on 2026-10-28.
 * Review each January (tax brackets, CPP, EI, RRSP, TFSA) and whenever a budget changes a rate.
 *
 * NOT MODELLED (stated on the pages): Quebec income tax (the Quebec treatment of QPP, QPIP and EI
 * could not be verified from Revenu Québec), the Yukon employment credit, dependants, spouse and
 * age credits, tax on investment income (dividends, capital gains), refundable credits and benefits.
 */

export const CA_TAX_YEAR = 2026;
export const CA_TAX_YEAR_LABEL = 'tax year 2026';

export const CRA_RATES_SOURCE = {
	title: 'CRA — Personal income tax rates and brackets (current year)',
	url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html'
};
export const CRA_INDEXATION_SOURCE = {
	title: 'CRA — Indexation adjustment for personal income tax and benefit amounts',
	url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html'
};
export const CRA_T4127_SOURCE = {
	title: 'CRA — T4127 Payroll Deductions Formulas, 122nd edition (January 1, 2026)',
	url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan.html'
};
export const CPP_SOURCE = {
	title: 'Canada.ca — Maximum benefit amounts and related figures, CPP 2026 and OAS',
	url: 'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html'
};
export const EI_SOURCE = {
	title: 'Canada.ca — Canada Employment Insurance Commission sets the 2026 EI premium rate',
	url: 'https://www.canada.ca/en/employment-social-development/news/2025/09/canada-employment-insurance-commission-sets-the-2026-employment-insurance-premium-rate.html'
};
export const CRA_LIMITS_SOURCE = {
	title: 'CRA — MP, DB, RRSP, DPSP, ALDA, TFSA limits, YMPE and the YAMPE',
	url: 'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html'
};

// ---------------------------------------------------------------------------------------------
// Federal income tax
// ---------------------------------------------------------------------------------------------

export interface Bracket {
	/** Top of the bracket (taxable income). Infinity for the last one. */
	upTo: number;
	rate: number;
}

/**
 * Source: CRA "Federal rates for 2026": 14% to $58,523; 20.5% to $117,045; 26% to $181,440;
 * 29% to $258,482; 33% above. The lowest rate is 14% for 2026 (it was 14.5% blended for 2025).
 */
export const FEDERAL_BRACKETS: Bracket[] = [
	{ upTo: 58_523, rate: 0.14 },
	{ upTo: 117_045, rate: 0.205 },
	{ upTo: 181_440, rate: 0.26 },
	{ upTo: 258_482, rate: 0.29 },
	{ upTo: Infinity, rate: 0.33 }
];
/** Rate used for federal non-refundable credits (the lowest rate): 14% for 2026 (CRA T4127: K1 = 0.14 × TC). */
export const FEDERAL_CREDIT_RATE = 0.14;

/**
 * Basic personal amount. CRA indexation page: $16,452 where net income is at or below the 29%
 * threshold ($181,440); $14,829 where net income is at or above the 33% threshold ($258,482).
 * T4127: BPAF = 16,452 − (NI − 181,440) × (1,623 / 77,042) in between.
 */
export const FEDERAL_BPA_MAX = 16_452;
export const FEDERAL_BPA_MIN = 14_829;
export const FEDERAL_BPA_PHASE_START = 181_440;
export const FEDERAL_BPA_PHASE_END = 258_482;

/** CRA indexation page: Canada employment amount (maximum) $1,501 for 2026. */
export const CANADA_EMPLOYMENT_AMOUNT = 1_501;

// ---------------------------------------------------------------------------------------------
// CPP and EI (employees, outside Quebec)
// ---------------------------------------------------------------------------------------------

/** Canada.ca CPP table 2: Year's Basic Exemption $3,500; YMPE $74,600; YAMPE $85,000 (2026). */
export const CPP_BASIC_EXEMPTION = 3_500;
export const YMPE = 74_600;
export const YAMPE = 85_000;
/**
 * Canada.ca CPP table 3: employee base + first additional rate 5.95% (max $4,230.45).
 * T4127: base rate 4.95% (the federal credit part), first additional rate 1.00% (a deduction from income).
 */
export const CPP_BASE_RATE = 0.0495;
export const CPP_FIRST_ADDITIONAL_RATE = 0.01;
/** Canada.ca CPP table 3: employee second additional rate (CPP2) 4.00% on earnings between YMPE and YAMPE, max $416.00. */
export const CPP2_RATE = 0.04;

/** Canada.ca EI news release: 2026 employee rate $1.63 per $100; maximum insurable earnings $68,900; maximum premium $1,123.07. */
export const EI_RATE = 0.0163;
export const EI_MAX_INSURABLE = 68_900;
export const EI_MAX_PREMIUM = 1_123.07;

const cents = (x: number) => Math.round(x * 100 + 1e-9) / 100;

export interface PayrollContributions {
	cppBase: number;
	cppFirstAdditional: number;
	cpp2: number;
	cppTotal: number;
	ei: number;
}

/** CPP and EI an employee pays on a year of employment income (outside Quebec). */
export function payrollContributions(employment: number): PayrollContributions {
	const e = Math.max(0, employment);
	const pensionable = Math.max(0, Math.min(e, YMPE) - CPP_BASIC_EXEMPTION);
	const cppBase = cents(pensionable * CPP_BASE_RATE);
	const cppFirstAdditional = cents(pensionable * CPP_FIRST_ADDITIONAL_RATE);
	const cpp2 = cents(Math.max(0, Math.min(e, YAMPE) - YMPE) * CPP2_RATE);
	const ei = Math.min(cents(Math.min(e, EI_MAX_INSURABLE) * EI_RATE), EI_MAX_PREMIUM);
	return { cppBase, cppFirstAdditional, cpp2, cppTotal: cents(cppBase + cppFirstAdditional + cpp2), ei };
}

// ---------------------------------------------------------------------------------------------
// Provinces and territories (Quebec is deliberately missing, see the note at the top)
// ---------------------------------------------------------------------------------------------

export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NT' | 'NS' | 'NU' | 'ON' | 'PE' | 'SK' | 'YT';

export interface ProvinceData {
	name: string;
	brackets: Bracket[];
	/** Basic personal amount (maximum). */
	bpa: number;
}

/**
 * Brackets: CRA "Provincial and territorial rates for 2026", cross-checked with the KPMG 2026 rates PDF.
 * Exceptions, where the sources disagreed:
 *  - British Columbia: the 2026 BC budget raised the lowest rate (and the basic credit rate) from 5.06% to 5.60%
 *    effective January 1, 2026 (CRA page and 2026 BC budget summaries by MNP / Raymond James).
 *  - Manitoba: the CRA rates page shows $47,564 and $101,200, but CRA payroll tables (T4127 and T4008MB, January 2026)
 *    and the Manitoba 2026 budget summary show $47,000 and $100,000 (indexation frozen). The payroll figures are used.
 *  - Prince Edward Island: new 20% rate above $200,000 applies from January 1, 2026 (princeedwardisland.ca).
 * Basic personal amounts: KPMG "Federal and provincial/territorial non-refundable tax credit rates and amounts 2026"
 * and the Encore Business January 2026 table (they agree); Manitoba, PEI, Saskatchewan also match CRA T4127.
 */
export const PROVINCES: Record<ProvinceCode, ProvinceData> = {
	AB: {
		name: 'Alberta',
		bpa: 22_769,
		brackets: [
			{ upTo: 61_200, rate: 0.08 },
			{ upTo: 154_259, rate: 0.1 },
			{ upTo: 185_111, rate: 0.12 },
			{ upTo: 246_813, rate: 0.13 },
			{ upTo: 370_220, rate: 0.14 },
			{ upTo: Infinity, rate: 0.15 }
		]
	},
	BC: {
		name: 'British Columbia',
		bpa: 13_216,
		brackets: [
			{ upTo: 50_363, rate: 0.056 },
			{ upTo: 100_728, rate: 0.077 },
			{ upTo: 115_648, rate: 0.105 },
			{ upTo: 140_430, rate: 0.1229 },
			{ upTo: 190_405, rate: 0.147 },
			{ upTo: 265_545, rate: 0.168 },
			{ upTo: Infinity, rate: 0.205 }
		]
	},
	MB: {
		name: 'Manitoba',
		bpa: 15_780,
		brackets: [
			{ upTo: 47_000, rate: 0.108 },
			{ upTo: 100_000, rate: 0.1275 },
			{ upTo: Infinity, rate: 0.174 }
		]
	},
	NB: {
		name: 'New Brunswick',
		bpa: 13_664,
		brackets: [
			{ upTo: 52_333, rate: 0.094 },
			{ upTo: 104_666, rate: 0.14 },
			{ upTo: 193_861, rate: 0.16 },
			{ upTo: Infinity, rate: 0.195 }
		]
	},
	NL: {
		name: 'Newfoundland and Labrador',
		bpa: 11_188,
		brackets: [
			{ upTo: 44_678, rate: 0.087 },
			{ upTo: 89_354, rate: 0.145 },
			{ upTo: 159_528, rate: 0.158 },
			{ upTo: 223_340, rate: 0.178 },
			{ upTo: 285_319, rate: 0.198 },
			{ upTo: 570_638, rate: 0.208 },
			{ upTo: 1_141_275, rate: 0.213 },
			{ upTo: Infinity, rate: 0.218 }
		]
	},
	NT: {
		name: 'Northwest Territories',
		bpa: 18_198,
		brackets: [
			{ upTo: 53_003, rate: 0.059 },
			{ upTo: 106_009, rate: 0.086 },
			{ upTo: 172_346, rate: 0.122 },
			{ upTo: Infinity, rate: 0.1405 }
		]
	},
	NS: {
		name: 'Nova Scotia',
		bpa: 11_932,
		brackets: [
			{ upTo: 30_995, rate: 0.0879 },
			{ upTo: 61_991, rate: 0.1495 },
			{ upTo: 97_417, rate: 0.1667 },
			{ upTo: 157_124, rate: 0.175 },
			{ upTo: Infinity, rate: 0.21 }
		]
	},
	NU: {
		name: 'Nunavut',
		bpa: 19_659,
		brackets: [
			{ upTo: 55_801, rate: 0.04 },
			{ upTo: 111_602, rate: 0.07 },
			{ upTo: 181_439, rate: 0.09 },
			{ upTo: Infinity, rate: 0.115 }
		]
	},
	ON: {
		name: 'Ontario',
		bpa: 12_989,
		brackets: [
			{ upTo: 53_891, rate: 0.0505 },
			{ upTo: 107_785, rate: 0.0915 },
			{ upTo: 150_000, rate: 0.1116 },
			{ upTo: 220_000, rate: 0.1216 },
			{ upTo: Infinity, rate: 0.1316 }
		]
	},
	PE: {
		name: 'Prince Edward Island',
		bpa: 15_000,
		brackets: [
			{ upTo: 33_928, rate: 0.095 },
			{ upTo: 65_820, rate: 0.1347 },
			{ upTo: 106_890, rate: 0.166 },
			{ upTo: 142_520, rate: 0.1762 },
			{ upTo: 200_000, rate: 0.19 },
			{ upTo: Infinity, rate: 0.2 }
		]
	},
	SK: {
		name: 'Saskatchewan',
		bpa: 20_381,
		brackets: [
			{ upTo: 54_532, rate: 0.105 },
			{ upTo: 155_805, rate: 0.125 },
			{ upTo: Infinity, rate: 0.145 }
		]
	},
	YT: {
		name: 'Yukon',
		// Yukon's basic personal amount equals the federal one, including the phase-down (T4127: BPAYT = BPAF).
		bpa: FEDERAL_BPA_MAX,
		brackets: [
			{ upTo: 58_523, rate: 0.064 },
			{ upTo: 117_045, rate: 0.09 },
			{ upTo: 181_440, rate: 0.109 },
			{ upTo: 500_000, rate: 0.128 },
			{ upTo: Infinity, rate: 0.15 }
		]
	}
};

/** Order for pickers: alphabetical by name. */
export const PROVINCE_ORDER: ProvinceCode[] = ['AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'SK', 'YT'];

/**
 * Manitoba basic personal amount phases out between $200,000 and $400,000 of net income
 * (T4127 BPAMB: 15,780 − (NI − 200,000) × 15,780 / 200,000; nil from $400,000; amounts not indexed).
 */
export const MB_BPA_PHASE_START = 200_000;
export const MB_BPA_PHASE_END = 400_000;

/**
 * Ontario surtax (CRA T4127, V1): 20% of Ontario basic tax above $5,818, plus 36% of the amount above $7,446.
 */
export const ON_SURTAX_1_THRESHOLD = 5_818;
export const ON_SURTAX_1_RATE = 0.2;
export const ON_SURTAX_2_THRESHOLD = 7_446;
export const ON_SURTAX_2_RATE = 0.36;
/** T4127 Ontario tax reduction: S = lesser of (T4 + V1) and 2 × ($300 + Y) − (T4 + V1); Y is $0 with no dependants. */
export const ON_TAX_REDUCTION_BASE = 300;

/**
 * Ontario Health Premium (taxable income). Source: taxtips.ca summary of the Ontario Ministry of Finance schedule,
 * matching the caps in T4127 V2 ($300 / $450 / $600 / $750 / $900). Premium is not reduced by the tax reduction.
 */
export function ontarioHealthPremium(taxable: number): number {
	const t = taxable;
	if (!(t > 20_000)) return 0;
	if (t <= 25_000) return (t - 20_000) * 0.06;
	if (t <= 36_000) return 300;
	if (t <= 38_500) return 300 + (t - 36_000) * 0.06;
	if (t <= 48_000) return 450;
	if (t <= 48_600) return 450 + (t - 48_000) * 0.25;
	if (t <= 72_000) return 600;
	if (t <= 72_600) return 600 + (t - 72_000) * 0.25;
	if (t <= 200_000) return 750;
	if (t <= 200_600) return 750 + (t - 200_000) * 0.25;
	return 900;
}

/**
 * BC tax reduction credit, 2026 (gov.bc.ca "B.C. basic personal income tax credits"): base $690, full below
 * net income $25,570, reduced by 3.56% of net income above that.
 */
export const BC_TAX_REDUCTION_BASE = 690;
export const BC_TAX_REDUCTION_START = 25_570;
export const BC_TAX_REDUCTION_RATE = 0.0356;

// ---------------------------------------------------------------------------------------------
// Income tax engine
// ---------------------------------------------------------------------------------------------

export function bracketTax(taxable: number, brackets: Bracket[]): number {
	let tax = 0;
	let from = 0;
	for (const b of brackets) {
		if (taxable <= from) break;
		tax += (Math.min(taxable, b.upTo) - from) * b.rate;
		from = b.upTo;
	}
	return tax;
}

/** Marginal bracket rate on the next dollar of taxable income. */
export function bracketRate(taxable: number, brackets: Bracket[]): number {
	for (const b of brackets) if (taxable < b.upTo) return b.rate;
	return brackets[brackets.length - 1].rate;
}

export function federalBpa(netIncome: number): number {
	if (netIncome <= FEDERAL_BPA_PHASE_START) return FEDERAL_BPA_MAX;
	if (netIncome >= FEDERAL_BPA_PHASE_END) return FEDERAL_BPA_MIN;
	return (
		FEDERAL_BPA_MAX -
		((netIncome - FEDERAL_BPA_PHASE_START) * (FEDERAL_BPA_MAX - FEDERAL_BPA_MIN)) /
			(FEDERAL_BPA_PHASE_END - FEDERAL_BPA_PHASE_START)
	);
}

export function provincialBpa(code: ProvinceCode, netIncome: number): number {
	if (code === 'YT') return federalBpa(netIncome);
	const base = PROVINCES[code].bpa;
	if (code === 'MB') {
		if (netIncome <= MB_BPA_PHASE_START) return base;
		if (netIncome >= MB_BPA_PHASE_END) return 0;
		return base - ((netIncome - MB_BPA_PHASE_START) * base) / (MB_BPA_PHASE_END - MB_BPA_PHASE_START);
	}
	return base;
}

export interface CanadaTaxInput {
	province: ProvinceCode;
	/** Employment income (T4). CPP and EI are worked out on this. */
	employment: number;
	/** Other taxable income with no CPP or EI (interest, rental, pension). */
	other: number;
	/** RRSP, pension plan or other deduction from income. */
	rrsp: number;
}

export interface CanadaTaxResult {
	totalIncome: number;
	rrsp: number;
	cppDeduction: number;
	netIncome: number;
	taxable: number;
	contributions: PayrollContributions;
	federalBasic: number;
	federalCredits: number;
	federalTax: number;
	provincialBasic: number;
	provincialCredits: number;
	surtax: number;
	provincialReduction: number;
	healthPremium: number;
	provincialTax: number;
	totalTax: number;
	averageRate: number;
	marginalRate: number;
	federalBpaUsed: number;
	provincialBpaUsed: number;
}

function core(i: CanadaTaxInput) {
	const prov = PROVINCES[i.province];
	const c = payrollContributions(i.employment);
	const totalIncome = i.employment + i.other;
	// Enhanced CPP (first additional + CPP2) is deducted from income; the 4.95% base part is a credit.
	const cppDeduction = c.cppFirstAdditional + c.cpp2;
	const netIncome = Math.max(0, totalIncome - i.rrsp - cppDeduction);
	const taxable = netIncome;

	const fedBasic = bracketTax(taxable, FEDERAL_BRACKETS);
	const fedBpa = federalBpa(netIncome);
	const fedCreditBase = fedBpa + Math.min(CANADA_EMPLOYMENT_AMOUNT, i.employment) + c.cppBase + c.ei;
	const federalCredits = fedCreditBase * FEDERAL_CREDIT_RATE;
	const federalTax = Math.max(0, fedBasic - federalCredits);

	const provBpa = provincialBpa(i.province, netIncome);
	const lowest = prov.brackets[0].rate;
	const provBasic = bracketTax(taxable, prov.brackets);
	const provCredits = (provBpa + c.cppBase + c.ei) * lowest;
	let t4 = Math.max(0, provBasic - provCredits);
	let surtax = 0;
	let reduction = 0;
	let healthPremium = 0;
	if (i.province === 'ON') {
		surtax =
			Math.max(0, t4 - ON_SURTAX_1_THRESHOLD) * ON_SURTAX_1_RATE +
			Math.max(0, t4 - ON_SURTAX_2_THRESHOLD) * ON_SURTAX_2_RATE;
		const t = t4 + surtax;
		reduction = Math.max(0, Math.min(t, 2 * ON_TAX_REDUCTION_BASE - t));
		healthPremium = ontarioHealthPremium(taxable);
	} else if (i.province === 'BC') {
		reduction = Math.min(
			t4,
			Math.max(0, BC_TAX_REDUCTION_BASE - Math.max(0, netIncome - BC_TAX_REDUCTION_START) * BC_TAX_REDUCTION_RATE)
		);
	}
	const provincialTax = t4 + surtax - reduction + healthPremium;
	return {
		c,
		totalIncome,
		cppDeduction,
		netIncome,
		taxable,
		fedBasic,
		fedBpa,
		federalCredits,
		federalTax,
		provBpa,
		provBasic,
		provCredits,
		surtax,
		reduction,
		healthPremium,
		provincialTax
	};
}

export function canadaIncomeTax(i: CanadaTaxInput): CanadaTaxResult {
	const r = core(i);
	const total = r.federalTax + r.provincialTax;
	// Marginal rate: tax on the next dollar of other income (no CPP or EI on it).
	const next = core({ ...i, other: i.other + 1 });
	const marginal = next.federalTax + next.provincialTax - total;
	return {
		totalIncome: r.totalIncome,
		rrsp: i.rrsp,
		cppDeduction: r.cppDeduction,
		netIncome: r.netIncome,
		taxable: r.taxable,
		contributions: r.c,
		federalBasic: r.fedBasic,
		federalCredits: r.federalCredits,
		federalTax: r.federalTax,
		provincialBasic: r.provBasic,
		provincialCredits: r.provCredits,
		surtax: r.surtax,
		provincialReduction: r.reduction,
		healthPremium: r.healthPremium,
		provincialTax: r.provincialTax,
		totalTax: total,
		averageRate: r.totalIncome > 0 ? total / r.totalIncome : 0,
		marginalRate: marginal,
		federalBpaUsed: r.fedBpa,
		provincialBpaUsed: r.provBpa
	};
}

// ---------------------------------------------------------------------------------------------
// RRSP and TFSA
// ---------------------------------------------------------------------------------------------

/**
 * CRA "MP, DB, RRSP, DPSP, ALDA, TFSA limits, YMPE and the YAMPE": RRSP dollar limit $33,810 for 2026.
 * The deduction limit is 18% of the previous year's earned income up to that dollar limit (taxtips.ca summary of the rule),
 * less any pension adjustment, plus unused room carried forward.
 */
export const RRSP_DOLLAR_LIMIT_2026 = 33_810;
export const RRSP_EARNED_INCOME_RATE = 0.18;

/**
 * CRA limits table (same page): annual TFSA dollar limit by year. 2009–2012 $5,000; 2013–2014 $5,500; 2015 $10,000;
 * 2016–2018 $5,500; 2019–2022 $6,000; 2023 $6,500; 2024–2026 $7,000.
 */
export const TFSA_LIMITS: Record<number, number> = {
	2009: 5_000,
	2010: 5_000,
	2011: 5_000,
	2012: 5_000,
	2013: 5_500,
	2014: 5_500,
	2015: 10_000,
	2016: 5_500,
	2017: 5_500,
	2018: 5_500,
	2019: 6_000,
	2020: 6_000,
	2021: 6_000,
	2022: 6_000,
	2023: 6_500,
	2024: 7_000,
	2025: 7_000,
	2026: 7_000
};
export const TFSA_FIRST_YEAR = 2009;
export const TFSA_LAST_YEAR = 2026;

export function tfsaCumulativeRoom(startYear: number): number {
	let total = 0;
	for (let y = Math.max(TFSA_FIRST_YEAR, startYear); y <= TFSA_LAST_YEAR; y++) total += TFSA_LIMITS[y];
	return total;
}

// ---------------------------------------------------------------------------------------------
// Land transfer tax
// ---------------------------------------------------------------------------------------------

export const LTT_SOURCES = [
	{ title: 'Ontario — Calculating land transfer tax', url: 'https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax' },
	{
		title: 'City of Toronto — Municipal land transfer tax rates and fees',
		url: 'https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/'
	},
	{ title: 'Government of British Columbia — Property transfer tax', url: 'https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax' }
];

/**
 * Ontario: 0.5% to $55,000; 1% to $250,000; 1.5% to $400,000; 2% above $400,000; 2.5% above $2,000,000 only for land
 * with one or two single-family residences (ontario.ca "Calculating land transfer tax").
 */
export const ON_LTT_BRACKETS: Bracket[] = [
	{ upTo: 55_000, rate: 0.005 },
	{ upTo: 250_000, rate: 0.01 },
	{ upTo: 400_000, rate: 0.015 },
	{ upTo: 2_000_000, rate: 0.02 },
	{ upTo: Infinity, rate: 0.025 }
];
/** Other property: 2% applies to everything above $400,000 (same page). */
export const ON_LTT_BRACKETS_OTHER: Bracket[] = [
	{ upTo: 55_000, rate: 0.005 },
	{ upTo: 250_000, rate: 0.01 },
	{ upTo: 400_000, rate: 0.015 },
	{ upTo: Infinity, rate: 0.02 }
];
/** ontario.ca "Land transfer tax refunds for first-time homebuyers": maximum refund $4,000 (no tax on the first $368,000). */
export const ON_FTB_MAX = 4_000;

/**
 * Toronto municipal land transfer tax (toronto.ca MLTT rates page): same rates as Ontario to $3,000,000 for one or two
 * single-family residences, then 4.40% ($3M–$4M), 5.45% ($4M–$5M), 6.5% ($5M–$10M), 7.55% ($10M–$20M), 8.6% above
 * $20M, "rates as of April 1, 2026". Other residences: 0.5% / 1% / 1.5% / 2% above $400,000.
 */
export const TORONTO_MLTT_BRACKETS: Bracket[] = [
	{ upTo: 55_000, rate: 0.005 },
	{ upTo: 250_000, rate: 0.01 },
	{ upTo: 400_000, rate: 0.015 },
	{ upTo: 2_000_000, rate: 0.02 },
	{ upTo: 3_000_000, rate: 0.025 },
	{ upTo: 4_000_000, rate: 0.044 },
	{ upTo: 5_000_000, rate: 0.0545 },
	{ upTo: 10_000_000, rate: 0.065 },
	{ upTo: 20_000_000, rate: 0.0755 },
	{ upTo: Infinity, rate: 0.086 }
];
export const TORONTO_MLTT_BRACKETS_OTHER: Bracket[] = ON_LTT_BRACKETS_OTHER;
/** toronto.ca MLTT rebate page: first-time buyer rebate "up to $4,475" (the full MLTT on $400,000). */
export const TORONTO_FTB_MAX = 4_475;

/**
 * British Columbia property transfer tax (gov.bc.ca): 1% to $200,000, 2% to $2,000,000, 3% above;
 * plus a further 2% on the residential portion above $3,000,000.
 */
export const BC_PTT_BRACKETS: Bracket[] = [
	{ upTo: 200_000, rate: 0.01 },
	{ upTo: 2_000_000, rate: 0.02 },
	{ upTo: Infinity, rate: 0.03 }
];
export const BC_PTT_EXTRA_THRESHOLD = 3_000_000;
export const BC_PTT_EXTRA_RATE = 0.02;
/**
 * BC first time home buyers' exemption (gov.bc.ca, amounts for registrations on or after April 1, 2024): full tax
 * exemption up to $500,000; $8,000 from $500,000 to $835,000; between $835,000 and $860,000 the exemption is
 * $8,000 × ($860,000 − price) ÷ $25,000 (gov.bc.ca "Calculation examples"); none from $860,000.
 */
export const BC_FTB_FULL_UP_TO = 500_000;
export const BC_FTB_MAX_EXEMPTION = 8_000;
export const BC_FTB_FLAT_UP_TO = 835_000;
export const BC_FTB_NONE_FROM = 860_000;
/**
 * BC newly built home exemption (gov.bc.ca, amounts for registrations on or after April 1, 2024): full tax exemption
 * below $1,100,000; reduced proportionally to nil at $1,150,000 (exemption = tax × ($1,150,000 − price) ÷ $50,000,
 * which reproduces the $419.60 the page shows at $1,149,000).
 */
export const BC_NEW_BUILD_FULL_UP_TO = 1_100_000;
export const BC_NEW_BUILD_NONE_FROM = 1_150_000;

/** Manitoba (gov.mb.ca "Land transfer tax"): 0% to $30,000; 0.5% to $90,000; 1% to $150,000; 1.5% to $200,000; 2% above. */
export const MB_LTT_BRACKETS: Bracket[] = [
	{ upTo: 30_000, rate: 0 },
	{ upTo: 90_000, rate: 0.005 },
	{ upTo: 150_000, rate: 0.01 },
	{ upTo: 200_000, rate: 0.015 },
	{ upTo: Infinity, rate: 0.02 }
];
/**
 * Quebec welcome tax (quebec.ca "Droits sur les mutations immobilières", exercice 2026): 0.5% on the first $62,900,
 * 1% to $315,000, 1.5% above. Thresholds are indexed yearly ($64,400 and $322,600 for 2027). A municipality may set a
 * higher rate (up to 3%, more in Montréal) on the part above $500,000.
 */
export const QC_WELCOME_TAX_THRESHOLDS = { first: 62_900, second: 315_000 };
export const QC_WELCOME_TAX_RATES = { first: 0.005, second: 0.01, third: 0.015 };
export const QC_HIGH_VALUE_THRESHOLD = 500_000;
export const QC_MUNICIPAL_MAX_RATE = 0.03;
/** New Brunswick real property transfer tax (snb.ca): 1% of the greater of the price and the assessed value. */
export const NB_RPTT_RATE = 0.01;
/**
 * Prince Edward Island real property transfer tax (princeedwardisland.ca): 1% of the greater of the price and the
 * assessed value; waived when that value does not exceed $30,000 (low-cost real property exemption).
 */
export const PE_RPTT_RATE = 0.01;
export const PE_RPTT_EXEMPT_UP_TO = 30_000;
/**
 * Nova Scotia deed transfer tax is set by each municipality: 1.0% to 1.5% (novascotia.ca "Deed transfer tax rates",
 * July 2026; Halifax Regional Municipality 1.5%). The calculator takes the rate as an input.
 */
export const NS_DEED_TAX_DEFAULT = 1.5;
export const NS_DEED_TAX_MIN = 1.0;
export const NS_DEED_TAX_MAX = 1.5;
/**
 * Newfoundland and Labrador registration fees (gov.nl.ca "Schedule of fees"): deeds and mortgages $100 plus $0.40 for
 * each $100 (or part of $100) above $500; mortgage fee capped at $5,000; no cap on deeds.
 */
export const NL_FEE_BASE = 100;
export const NL_FEE_PER_100 = 0.4;
export const NL_FEE_FREE_AMOUNT = 500;
export const NL_MORTGAGE_FEE_CAP = 5_000;

export function nlRegistrationFee(value: number, cap = Infinity): number {
	if (!(value > 0)) return 0;
	const fee = value <= NL_FEE_FREE_AMOUNT ? NL_FEE_BASE : NL_FEE_BASE + NL_FEE_PER_100 * Math.ceil((value - NL_FEE_FREE_AMOUNT) / 100);
	return Math.min(fee, cap);
}

// ---------------------------------------------------------------------------------------------
// Mortgage qualifying (stress test) and CMHC
// ---------------------------------------------------------------------------------------------

export const OSFI_SOURCE = {
	title: 'OSFI — Minimum qualifying rate for uninsured mortgages',
	url: 'https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages'
};
export const CMHC_SOURCE = {
	title: 'CMHC — Mortgage loan insurance and premiums',
	url: 'https://cmhc-schl.gc.ca/en/finance-and-investing/mortgage-loan-insurance/the-resource/mortgage-loan-insurance-and-premiums'
};
export const FINANCE_CANADA_SOURCE = {
	title: 'Department of Finance Canada — Delivering the boldest mortgage reforms in decades',
	url: 'https://www.canada.ca/en/department-finance/news/2024/09/delivering-the-boldest-mortgage-reforms-in-decades.html'
};

/** OSFI: qualify at the greater of the contract rate plus 2 percentage points or 5.25%. */
export const QUALIFY_BUFFER = 2;
export const QUALIFY_FLOOR = 5.25;
/** CMHC: maximum gross debt service 39% and total debt service 44% (GDS includes 50% of condo fees and heating). */
export const MAX_GDS = 0.39;
export const MAX_TDS = 0.44;
/** CMHC premiums on the total loan, owner-occupied (premium table): LTV 80.01–85% 2.80%; 85.01–90% 3.10%; 90.01–95% 4.00%. */
export const CMHC_PREMIUMS: { ltvUpTo: number; rate: number }[] = [
	{ ltvUpTo: 0.85, rate: 0.028 },
	{ ltvUpTo: 0.9, rate: 0.031 },
	{ ltvUpTo: 0.95, rate: 0.04 }
];
/** Premium surcharge for a 30-year amortization: 20 basis points (Canada Guaranty lender update on the December 15, 2024 rules). */
export const CMHC_30YR_SURCHARGE = 0.002;
/**
 * Since December 15, 2024 (Finance Canada): insured mortgages for homes under $1,500,000; minimum down payment 5% of the
 * first $500,000 plus 10% of the part from $500,000 to $1,500,000; 30-year amortization for first-time buyers and for
 * newly built homes. Other insured mortgages: maximum 25 years.
 */
export const INSURED_PRICE_CAP = 1_500_000;
export const MIN_DOWN_FIRST_TIER = 500_000;
export const MIN_DOWN_FIRST_RATE = 0.05;
export const MIN_DOWN_SECOND_RATE = 0.1;

// ---------------------------------------------------------------------------------------------
// Sales tax
// ---------------------------------------------------------------------------------------------

export const SALES_TAX_SOURCE = {
	title: 'CRA — GST/HST calculator (and rates)',
	url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html'
};

export type SalesTaxKind = 'GST+PST' | 'GST+QST' | 'HST' | 'GST';
export interface SalesTaxData {
	name: string;
	kind: SalesTaxKind;
	/** Federal part (GST or the federal part of HST). */
	federal: number;
	/** Provincial part (PST, QST or the provincial part of HST). */
	provincial: number;
	provincialLabel: string;
}
/**
 * CRA GST/HST calculator page: AB, NT, NU, YT 5% GST; BC 5% + 7% PST; MB 5% + 7% PST; SK 5% + 6% PST; QC 5% + 9.975% QST;
 * ON 13% HST; NB, NL, PE 15% HST; NS 14% HST ("As of April 1, 2025, the HST rate has decreased to 14% in Nova Scotia").
 * HST is 5% federal plus the provincial part (total − 5). PST and QST are charged on the pre-tax price (not on the GST).
 */
export const SALES_TAX: Record<string, SalesTaxData> = {
	AB: { name: 'Alberta', kind: 'GST', federal: 5, provincial: 0, provincialLabel: '' },
	BC: { name: 'British Columbia', kind: 'GST+PST', federal: 5, provincial: 7, provincialLabel: 'PST' },
	MB: { name: 'Manitoba', kind: 'GST+PST', federal: 5, provincial: 7, provincialLabel: 'RST' },
	NB: { name: 'New Brunswick', kind: 'HST', federal: 5, provincial: 10, provincialLabel: 'Provincial part of HST' },
	NL: { name: 'Newfoundland and Labrador', kind: 'HST', federal: 5, provincial: 10, provincialLabel: 'Provincial part of HST' },
	NT: { name: 'Northwest Territories', kind: 'GST', federal: 5, provincial: 0, provincialLabel: '' },
	NS: { name: 'Nova Scotia', kind: 'HST', federal: 5, provincial: 9, provincialLabel: 'Provincial part of HST' },
	NU: { name: 'Nunavut', kind: 'GST', federal: 5, provincial: 0, provincialLabel: '' },
	ON: { name: 'Ontario', kind: 'HST', federal: 5, provincial: 8, provincialLabel: 'Provincial part of HST' },
	PE: { name: 'Prince Edward Island', kind: 'HST', federal: 5, provincial: 10, provincialLabel: 'Provincial part of HST' },
	QC: { name: 'Quebec', kind: 'GST+QST', federal: 5, provincial: 9.975, provincialLabel: 'QST' },
	SK: { name: 'Saskatchewan', kind: 'GST+PST', federal: 5, provincial: 6, provincialLabel: 'PST' },
	YT: { name: 'Yukon', kind: 'GST', federal: 5, provincial: 0, provincialLabel: '' }
};

// ---------------------------------------------------------------------------------------------
// CPP retirement pension (estimate)
// ---------------------------------------------------------------------------------------------

/** Canada.ca CPP table 1 (maximum new benefits, January 2026): maximum retirement pension at age 65 $1,507.65 a month. */
export const CPP_MAX_PENSION_AT_65 = 1_507.65;
/**
 * Canada.ca "When to start your pension": payments fall 0.6% per month before 65 (36% at 60) and rise 0.7% per month
 * after 65 (42% at 70).
 */
export const CPP_EARLY_REDUCTION_PER_MONTH = 0.006;
export const CPP_LATE_INCREASE_PER_MONTH = 0.007;
/** The maximum pension needs about 39 years of maximum contributions (general drop-out of 17% of a 47-year period). */
export const CPP_FULL_YEARS = 39;
export const CPP_PENSION_SOURCES = [
	CPP_SOURCE,
	{ title: 'Canada.ca — CPP retirement pension: when to start your pension', url: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/when-start.html' }
];
