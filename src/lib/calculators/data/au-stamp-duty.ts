/**
 * Australian state transfer (stamp) duty rates and first-home / home concessions, as in force on 2026-10-28.
 * Every table is from the state revenue office unless a comment says otherwise. Review each 1 July (NSW indexes
 * its table every year) and whenever a state budget changes concessions.
 * Left out because they could not be verified on the revenue office site: ACT (2026-27 rate table not published on
 * the pages reachable), NSW first-home concession between $800,000 and $1m (formula not published on the page),
 * QLD first-home concession between $700,000 and $800,000 (formula not published), Tasmania first-home relief
 * (the State Revenue Office lists it only to 30 June 2026), Victoria's concession formula is reproduced from the
 * SRO's published worked examples.
 */
export const STAMP_DUTY_AS_AT = '28 October 2026';

export interface Band {
	/** The band applies to the part of the value above `from`. */
	from: number;
	/** Duty at `from`. */
	base: number;
	/** Rate on the amount above `from` (a fraction, e.g. 0.045). */
	rate: number;
}

export const SOURCES = {
	nsw: {
		title: 'Revenue NSW — How to calculate transfer duty (2026/27 rates)',
		url: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty'
	},
	nswFhb: {
		title: 'Revenue NSW — First Home Buyers Assistance Scheme',
		url: 'https://www.revenue.nsw.gov.au/grants-schemes/assistance-scheme'
	},
	vic: {
		title: 'State Revenue Office Victoria — Land transfer (stamp) duty',
		url: 'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/understanding-land-transfer-stamp-duty'
	},
	vicFhb: {
		title: 'SRO Victoria — First home buyer duty exemption or concession',
		url: 'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession'
	},
	vicAfad: {
		title: 'SRO Victoria — Understanding foreign purchaser additional duty',
		url: 'https://sro.vic.gov.au/buying-property/foreign-purchasers-property/understanding-foreign-purchaser-additional-duty'
	},
	qld: {
		title: 'Queensland Revenue Office — Transfer duty rates',
		url: 'https://qro.qld.gov.au/duties/transfer-duty/calculating/rates/'
	},
	qldHome: {
		title: 'Queensland Revenue Office — Home concession rates',
		url: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/'
	},
	qldFirst: {
		title: 'Queensland Revenue Office — First home concession',
		url: 'https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home/'
	},
	qldChanges: {
		title: 'Queensland Revenue Office — Changes to home concessions (from 1 August 2026)',
		url: 'https://qro.qld.gov.au/event/changes-to-home-concessions/'
	},
	wa: {
		title: 'WA Department of Finance — Duties fact sheet: residential land',
		url: 'https://www.wa.gov.au/government/publications/duties-fact-sheet-residential-land'
	},
	waFhor: {
		title: 'WA Department of Finance — First home owner rate of duty',
		url: 'https://wa.gov.au/government/publications/first-home-owner-duty-fs'
	},
	waForeign: {
		title: 'WA Department of Finance — Foreign transfer duty',
		url: 'https://www.wa.gov.au/government/publications/foreign-transfer-duty'
	},
	sa: {
		title: 'RevenueSA — Rate of stamp duty',
		url: 'https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty'
	},
	saFhb: {
		title: 'RevenueSA — First home buyer relief available',
		url: 'https://revenuesa.sa.gov.au/stampduty/first-home-buyer-relief/relief-available'
	},
	tas: {
		title: 'State Revenue Office Tasmania — Rates of duty',
		url: 'https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty'
	},
	tasSurcharge: {
		title: 'State Revenue Office Tasmania — Foreign investor duty surcharge rates',
		url: 'https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/rates-of-surcharge'
	},
	nt: {
		title: 'Territory Revenue Office NT — Stamp duty on property (information sheet I-SD-006)',
		url: 'https://treasury.nt.gov.au/pms/tro/information/I-SD-006.docx'
	}
};

/** NSW 2026/27 (Revenue NSW): $1.25 per $100 (min $20) to $18,000; $225 + $1.50 to $38,000; $525 + $1.75 to $103,000; $1,662 + $3.50 to $387,000; $11,602 + $4.50 to $1,290,000; $52,237 + $5.50 above. Premium rate $194,137 + $7.00 per $100 over $3,870,000. */
export const NSW_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.0125 },
	{ from: 18_000, base: 225, rate: 0.015 },
	{ from: 38_000, base: 525, rate: 0.0175 },
	{ from: 103_000, base: 1_662, rate: 0.035 },
	{ from: 387_000, base: 11_602, rate: 0.045 },
	{ from: 1_290_000, base: 52_237, rate: 0.055 },
	{ from: 3_870_000, base: 194_137, rate: 0.07 }
];
export const NSW_MIN_DUTY = 20;
/** Revenue NSW FHBAS, homes from 1 July 2023: no duty up to $800,000; a concessional rate over $800,000 and under $1 million. */
export const NSW_FHB_EXEMPT_TO = 800_000;
export const NSW_FHB_CONCESSION_TO = 1_000_000;
/** Revenue NSW: surcharge purchaser duty is a flat 9% of dutiable value. */
export const NSW_FOREIGN = 0.09;

/**
 * Victoria, general rates (SRO, via Finder's reproduction of the SRO table): 1.4% to $25,000; $350 + 2.4% to $130,000;
 * $2,870 + 6% to $960,000; 5.5% of the whole value from $960,001 to $2m; $110,000 + 6.5% over $2m.
 * (5.5% × $2m = $110,000 confirms "of the whole value".)
 */
export const VIC_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.014 },
	{ from: 25_000, base: 350, rate: 0.024 },
	{ from: 130_000, base: 2_870, rate: 0.06 }
];
export const VIC_WHOLE_VALUE_FROM = 960_000;
export const VIC_WHOLE_VALUE_RATE = 0.055;
export const VIC_TOP_FROM = 2_000_000;
export const VIC_TOP_BASE = 110_000;
export const VIC_TOP_RATE = 0.065;
/** Principal place of residence concession (up to $550,000): 1.4%; $350 + 2.4% to $130,000; $2,870 + 5% to $440,000; $18,370 + 6% to $550,000. */
export const VIC_PPR_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.014 },
	{ from: 25_000, base: 350, rate: 0.024 },
	{ from: 130_000, base: 2_870, rate: 0.05 },
	{ from: 440_000, base: 18_370, rate: 0.06 }
];
export const VIC_PPR_MAX = 550_000;
/** SRO: first home buyers pay no duty up to $600,000; a concession applies up to $750,000. Concession = general duty × (value − 600,000) ÷ 150,000, which reproduces the SRO examples ($625,000 → $5,428, $650,000 → $11,356, $700,000 → $24,713, $725,000 → $32,141). */
export const VIC_FHB_EXEMPT_TO = 600_000;
export const VIC_FHB_CONCESSION_TO = 750_000;
/** SRO: foreign purchasers pay 8% extra duty on residential property. */
export const VIC_FOREIGN = 0.08;

/** Queensland general rates (QRO): nil to $5,000; $1.50 per $100 to $75,000; $1,050 + $3.50 to $540,000; $17,325 + $4.50 to $1m; $38,025 + $5.75 above. "Per $100 or part of $100". */
export const QLD_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0 },
	{ from: 5_000, base: 0, rate: 0.015 },
	{ from: 75_000, base: 1_050, rate: 0.035 },
	{ from: 540_000, base: 17_325, rate: 0.045 },
	{ from: 1_000_000, base: 38_025, rate: 0.0575 }
];
/** QRO home concession rates: $1.00 per $100 to $350,000; $3,500 + $3.50 to $540,000; $10,150 + $4.50 to $1m; $30,850 + $5.75 above. */
export const QLD_HOME_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.01 },
	{ from: 350_000, base: 3_500, rate: 0.035 },
	{ from: 540_000, base: 10_150, rate: 0.045 },
	{ from: 1_000_000, base: 30_850, rate: 0.0575 }
];
/** QRO first home concession (established homes): under $800,000; homes valued $700,000 or under pay no duty. First home (new home) concession: full, no price cap (contracts from 1 May 2025). */
export const QLD_FHB_NIL_TO = 700_000;
export const QLD_FHB_LIMIT = 800_000;
/** QRO: additional foreign acquirer duty 8%; from 1 August 2026 temporary residents get no home concessions. */
export const QLD_FOREIGN = 0.08;

/** Western Australia residential/general rates (WA Department of Finance): $1.90 per $100 to $120,000; $2,280 + $2.85 to $150,000; $3,135 + $3.80 to $360,000; $11,115 + $4.75 to $725,000; $28,453 + $5.15 above. */
export const WA_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.019 },
	{ from: 120_000, base: 2_280, rate: 0.0285 },
	{ from: 150_000, base: 3_135, rate: 0.038 },
	{ from: 360_000, base: 11_115, rate: 0.0475 },
	{ from: 725_000, base: 28_453, rate: 0.0515 }
];
/** WA first home owner rate, agreements from 7 May 2026: home value up to $800,000; no duty up to $600,000; $16.15 per $100 over $600,000. */
export const WA_FHB_EXEMPT_TO = 600_000;
export const WA_FHB_LIMIT = 800_000;
export const WA_FHB_RATE = 0.1615;
/** WA: foreign transfer duty of 7% is additional, and still applies when the first home owner rate is used. */
export const WA_FOREIGN = 0.07;

/** South Australia (RevenueSA): $1 per $100 to $12,000; $120 + $2 to $30,000; $480 + $3 to $50,000; $1,080 + $3.50 to $100,000; $2,830 + $4 to $200,000; $6,830 + $4.25 to $250,000; $8,955 + $4.75 to $300,000; $11,330 + $5 to $500,000; $21,330 + $5.50 above. "Per $100 or part". */
export const SA_BANDS: Band[] = [
	{ from: 0, base: 0, rate: 0.01 },
	{ from: 12_000, base: 120, rate: 0.02 },
	{ from: 30_000, base: 480, rate: 0.03 },
	{ from: 50_000, base: 1_080, rate: 0.035 },
	{ from: 100_000, base: 2_830, rate: 0.04 },
	{ from: 200_000, base: 6_830, rate: 0.0425 },
	{ from: 250_000, base: 8_955, rate: 0.0475 },
	{ from: 300_000, base: 11_330, rate: 0.05 },
	{ from: 500_000, base: 21_330, rate: 0.055 }
];
/** RevenueSA: first home buyers get full relief on new homes (contracts on or after 13 February 2025, no price cap). Established homes are not listed. */

/** Tasmania (SRO): $50 to $3,000; $50 + $1.75 per $100 to $25,000; $435 + $2.25 to $75,000; $1,560 + $3.50 to $200,000; $5,935 + $4 to $375,000; $12,935 + $4.25 to $725,000; $27,810 + $4.50 above. */
export const TAS_BANDS: Band[] = [
	{ from: 0, base: 50, rate: 0 },
	{ from: 3_000, base: 50, rate: 0.0175 },
	{ from: 25_000, base: 435, rate: 0.0225 },
	{ from: 75_000, base: 1_560, rate: 0.035 },
	{ from: 200_000, base: 5_935, rate: 0.04 },
	{ from: 375_000, base: 12_935, rate: 0.0425 },
	{ from: 725_000, base: 27_810, rate: 0.045 }
];
/** SRO Tasmania: 8% foreign investor duty surcharge on residential property (agreements from 1 April 2020). */
export const TAS_FOREIGN = 0.08;

/**
 * Northern Territory (TRO): up to $525,000, D = 0.06571441 × V² + 15 × V with V = value ÷ 1,000; above that 4.95% of the
 * whole value to under $3m, 5.75% from $3m to under $5m, 5.95% from $5m. Rounded down to 5 cents.
 * First home owner discount: up to $23,928.60 off for established homes valued at $650,000 or less.
 */
export const NT_QUAD = 0.06571441;
export const NT_LINEAR = 15;
export const NT_FORMULA_TO = 525_000;
export const NT_FLAT: { from: number; rate: number }[] = [
	{ from: 525_000, rate: 0.0495 },
	{ from: 3_000_000, rate: 0.0575 },
	{ from: 5_000_000, rate: 0.0595 }
];
export const NT_FHOD_MAX = 23_928.6;
export const NT_FHOD_LIMIT = 650_000;

// ---------- shared maths ----------

/** Duty from a band table. `perHundredCeil` rounds the amount over `from` up to the next $100 ("or part of $100"). */
export function bandDuty(value: number, bands: Band[], perHundredCeil = false): number {
	let b = bands[0];
	for (const x of bands) if (value > x.from) b = x;
	let over = Math.max(0, value - b.from);
	if (perHundredCeil) over = Math.ceil(over / 100) * 100;
	return b.base + over * b.rate;
}

export function nswDuty(value: number): number {
	return Math.max(NSW_MIN_DUTY, bandDuty(value, NSW_BANDS));
}

export function vicDuty(value: number): number {
	if (value > VIC_TOP_FROM) return VIC_TOP_BASE + (value - VIC_TOP_FROM) * VIC_TOP_RATE;
	if (value > VIC_WHOLE_VALUE_FROM) return value * VIC_WHOLE_VALUE_RATE;
	return bandDuty(value, VIC_BANDS);
}

export function ntDuty(value: number): number {
	let d: number;
	if (value <= NT_FORMULA_TO) {
		const v = value / 1000;
		d = NT_QUAD * v * v + NT_LINEAR * v;
	} else {
		let rate = NT_FLAT[0].rate;
		for (const f of NT_FLAT) if (value >= f.from) rate = f.rate;
		d = value * rate;
	}
	return Math.floor(d * 20 + 1e-9) / 20;
}
