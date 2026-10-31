/**
 * US federal income tax figures for tax year 2026 (returns filed in 2027).
 * Source: IRS newsroom, "IRS releases tax inflation adjustments for tax year 2026, including
 * amendments from the One, Big, Beautiful Bill" (Rev. Proc. 2025-32), plus SSA 2026 figures.
 * Review every October when the IRS publishes the next year's numbers.
 */
export const TAX_YEAR = 2026;
export const IRS_TAX_SOURCE = {
	title: 'IRS — Tax inflation adjustments for tax year 2026',
	url: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill'
};

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';
export const FILING_OPTIONS = [
	{ label: 'Single', value: 'single' },
	{ label: 'Married filing jointly', value: 'mfj' },
	{ label: 'Married filing separately', value: 'mfs' },
	{ label: 'Head of household', value: 'hoh' }
];
export const FILING_LABEL: Record<FilingStatus, string> = {
	single: 'Single',
	mfj: 'Married filing jointly',
	mfs: 'Married filing separately',
	hoh: 'Head of household'
};

const RATES = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
/** Lower edge of each bracket (taxable income), matching RATES. */
const THRESHOLDS: Record<FilingStatus, number[]> = {
	single: [0, 12_400, 50_400, 105_700, 201_775, 256_225, 640_600],
	mfj: [0, 24_800, 100_800, 211_400, 403_550, 512_450, 768_700],
	mfs: [0, 12_400, 50_400, 105_700, 201_775, 256_225, 384_350],
	hoh: [0, 17_700, 67_450, 105_700, 201_750, 256_200, 640_600]
};

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
	single: 16_100,
	mfj: 32_200,
	mfs: 16_100,
	hoh: 24_150
};
/** Extra standard deduction per person aged 65+ (or blind). */
export const EXTRA_65: Record<FilingStatus, number> = { single: 2_050, hoh: 2_050, mfj: 1_650, mfs: 1_650 };

/** OBBBA "senior deduction" 2025–2028: $6,000 per person 65+, reduced 6% of MAGI above the threshold. */
export const SENIOR_DEDUCTION = 6_000;
const SENIOR_THRESHOLD: Record<FilingStatus, number> = { single: 75_000, hoh: 75_000, mfj: 150_000, mfs: 0 };

/** Child tax credit (OBBBA): $2,200 per child under 17, $1,700 refundable, phase-out $50 per $1,000. */
export const CTC_PER_CHILD = 2_200;
export const CTC_REFUNDABLE = 1_700;
const CTC_PHASEOUT: Record<FilingStatus, number> = { single: 200_000, hoh: 200_000, mfs: 200_000, mfj: 400_000 };

/** Payroll (FICA) 2026. */
export const SS_WAGE_BASE = 184_500;
export const SS_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;
export const ADDL_MEDICARE_RATE = 0.009;
export const ADDL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
	single: 200_000,
	hoh: 200_000,
	mfj: 250_000,
	mfs: 125_000
};

export interface BracketSlice {
	rate: number;
	from: number;
	to: number;
	taxed: number;
	tax: number;
}

export function brackets(status: FilingStatus): { rate: number; from: number; to: number }[] {
	const t = THRESHOLDS[status];
	return RATES.map((rate, i) => ({ rate, from: t[i], to: i + 1 < t.length ? t[i + 1] : Infinity }));
}

/** Tax on ordinary taxable income, with the slice taxed in each bracket. */
export function incomeTax(taxable: number, status: FilingStatus): { tax: number; slices: BracketSlice[]; marginal: number } {
	const slices: BracketSlice[] = [];
	let tax = 0;
	let marginal = RATES[0];
	for (const b of brackets(status)) {
		const taxed = Math.max(0, Math.min(taxable, b.to) - b.from);
		const t = taxed * b.rate;
		slices.push({ ...b, taxed, tax: t });
		tax += t;
		if (taxable > b.from) marginal = b.rate;
	}
	return { tax, slices, marginal };
}

export function seniorDeduction(status: FilingStatus, seniors: number, magi: number): number {
	if (seniors <= 0 || status === 'mfs') return 0; // MFS filers can't claim it
	const reduce = Math.max(0, magi - SENIOR_THRESHOLD[status]) * 0.06;
	return Math.max(0, SENIOR_DEDUCTION * seniors - reduce);
}

export interface FederalInput {
	status: FilingStatus;
	/** Gross income (wages + other ordinary income). */
	income: number;
	/** Pre-tax adjustments: traditional 401(k)/IRA, HSA, etc. */
	adjustments: number;
	/** Itemized total, or 0 to take the standard deduction (the larger is used). */
	itemized: number;
	/** People on the return aged 65+ (0–2). */
	seniors: number;
	/** Qualifying children under 17. */
	children: number;
	/** Earned income, for the refundable part of the child credit (defaults to income). */
	earned?: number;
}

export interface FederalResult {
	agi: number;
	deduction: number;
	usedStandard: boolean;
	senior: number;
	taxable: number;
	taxBeforeCredits: number;
	ctc: number;
	/** Refundable part paid even when there's no tax left (negative tax). */
	refundableCtc: number;
	tax: number;
	marginal: number;
	slices: BracketSlice[];
}

export function federalTax(i: FederalInput): FederalResult {
	const agi = Math.max(0, i.income - i.adjustments);
	const people = i.status === 'mfj' ? 2 : 1;
	const seniors = Math.min(Math.max(0, i.seniors), people);
	const standard = STANDARD_DEDUCTION[i.status] + EXTRA_65[i.status] * seniors;
	const usedStandard = standard >= i.itemized;
	const deduction = usedStandard ? standard : i.itemized;
	const senior = seniorDeduction(i.status, seniors, agi);
	const taxable = Math.max(0, agi - deduction - senior);
	const { tax: before, slices, marginal } = incomeTax(taxable, i.status);

	// Child tax credit with phase-out ($50 per $1,000 or part of $1,000 over the threshold).
	const over = Math.max(0, agi - CTC_PHASEOUT[i.status]);
	const fullCtc = Math.max(0, CTC_PER_CHILD * i.children - Math.ceil(over / 1000) * 50);
	const nonRefundable = Math.min(fullCtc, before);
	const earned = i.earned ?? i.income;
	const refundCap = Math.min(CTC_REFUNDABLE * i.children, Math.max(0, earned - 2_500) * 0.15);
	const refundableCtc = Math.min(fullCtc - nonRefundable, refundCap);
	return {
		agi,
		deduction,
		usedStandard,
		senior,
		taxable,
		taxBeforeCredits: before,
		ctc: nonRefundable + refundableCtc,
		refundableCtc,
		tax: before - nonRefundable - refundableCtc,
		marginal,
		slices
	};
}

export function fica(wages: number, status: FilingStatus): { ss: number; medicare: number; addl: number; total: number } {
	const w = Math.max(0, wages);
	const ss = Math.min(w, SS_WAGE_BASE) * SS_RATE;
	const medicare = w * MEDICARE_RATE;
	// Employers withhold above $200k regardless; the true liability uses the filing-status threshold.
	const addl = Math.max(0, w - ADDL_MEDICARE_THRESHOLD[status]) * ADDL_MEDICARE_RATE;
	return { ss, medicare, addl, total: ss + medicare + addl };
}
