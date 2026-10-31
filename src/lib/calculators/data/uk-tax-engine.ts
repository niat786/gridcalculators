/**
 * Pure UK payroll-tax maths shared by the UK calculators. Every rate comes from uk-tax-2026-27.ts.
 * Annual basis throughout (pay-period rounding in real PAYE can differ by a few pence to pounds).
 */
import {
	APPRENTICESHIP_LEVY_RATE,
	CODE_FLAT_RATES,
	CT_LOWER_LIMIT,
	CT_MAIN_RATE,
	CT_MARGINAL_FRACTION,
	CT_SMALL_RATE,
	CT_UPPER_LIMIT,
	DIVIDEND_ALLOWANCE,
	DIVIDEND_RATES,
	LOAN_PLANS,
	NI_EMPLOYER_RATE,
	NI_MAIN_RATE,
	NI_PRIMARY_THRESHOLD,
	NI_SECONDARY_THRESHOLD,
	NI_UPPER_EARNINGS_LIMIT,
	NI_UPPER_RATE,
	PA_TAPER_START,
	PERSONAL_ALLOWANCE,
	RUK_BANDS,
	SCOTTISH_BANDS,
	STANDARD_TAX_CODE,
	type LoanPlan,
	type PriceBand,
	type TaxBand
} from './uk-tax-2026-27';

export type TaxRegion = 'rest' | 'scotland';

export interface ParsedCode {
	kind: 'allowance' | 'flat' | 'k';
	/** Allowance in £ (kind allowance), or £ added to income (kind k). */
	amount: number;
	/** Flat rate (kind flat). */
	rate: number;
	/** True only for the standard 1257L code: the £100k taper then applies. */
	taper: boolean;
}

/**
 * Reads a PAYE tax code. Supports 1257L-style codes (L, M, N, T; the number × 10 is the allowance), 0T,
 * K codes (number × 10 is added to income), BR, D0, D1 and NT. An S or C prefix is ignored.
 * Returns null for anything else.
 */
export function parseTaxCode(raw: string): ParsedCode | null {
	const code = raw.trim().toUpperCase().replace(/^[SC](?=\d|BR|D0|D1|NT|K)/, '');
	if (code === 'NT') return { kind: 'flat', amount: 0, rate: 0, taper: false };
	if (code === 'BR' || code === 'D0' || code === 'D1')
		return { kind: 'flat', amount: 0, rate: CODE_FLAT_RATES[code], taper: false };
	const k = /^K(\d{1,4})$/.exec(code);
	if (k) return { kind: 'k', amount: Number(k[1]) * 10, rate: 0, taper: false };
	const m = /^(\d{1,4})([LMNT])$/.exec(code);
	if (m) {
		return { kind: 'allowance', amount: Number(m[1]) * 10, rate: 0, taper: code === STANDARD_TAX_CODE };
	}
	return null;
}

export interface TaxLine {
	label: string;
	amount: number;
	rate: number;
	tax: number;
}

export interface IncomeTaxResult {
	tax: number;
	allowance: number;
	taxable: number;
	lines: TaxLine[];
}

/** Personal allowance after the £100,000 taper (£1 lost for every £2 of adjusted net income above £100,000). */
export function taperedAllowance(adjustedNetIncome: number, allowance = PERSONAL_ALLOWANCE): number {
	return Math.max(0, allowance - Math.max(0, (adjustedNetIncome - PA_TAPER_START) / 2));
}

function bandTax(taxable: number, bands: TaxBand[]): TaxLine[] {
	const lines: TaxLine[] = [];
	let lower = 0;
	for (const b of bands) {
		const amount = Math.max(0, Math.min(taxable, b.upTo) - lower);
		lines.push({ label: b.label, amount, rate: b.rate, tax: amount * b.rate });
		lower = b.upTo;
	}
	return lines;
}

/** Income tax on non-savings, non-dividend income (salary). `income` = taxable pay after pension deductions. */
export function incomeTax(income: number, region: TaxRegion, code: ParsedCode): IncomeTaxResult {
	const bands = region === 'scotland' ? SCOTTISH_BANDS : RUK_BANDS;
	if (code.kind === 'flat') {
		return { tax: income * code.rate, allowance: 0, taxable: income, lines: [{ label: 'Flat rate', amount: income, rate: code.rate, tax: income * code.rate }] };
	}
	let allowance = code.kind === 'k' ? 0 : code.amount;
	let taxable = income;
	if (code.kind === 'k') taxable = income + code.amount;
	else {
		if (code.taper) allowance = taperedAllowance(income, code.amount);
		taxable = Math.max(0, income - allowance);
	}
	const lines = bandTax(taxable, bands);
	return { tax: lines.reduce((s, l) => s + l.tax, 0), allowance, taxable, lines };
}

export const STANDARD_CODE: ParsedCode = parseTaxCode(STANDARD_TAX_CODE)!;

/** Employee Class 1 NI (category A), annual. Pass `aboveStatePensionAge` for category C (nil). */
export function employeeNI(pay: number, aboveStatePensionAge = false): { main: number; upper: number; total: number } {
	if (aboveStatePensionAge) return { main: 0, upper: 0, total: 0 };
	const main = Math.max(0, Math.min(pay, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD) * NI_MAIN_RATE;
	const upper = Math.max(0, pay - NI_UPPER_EARNINGS_LIMIT) * NI_UPPER_RATE;
	return { main, upper, total: main + upper };
}

/** Employer Class 1 NI (15% above the £5,000 secondary threshold), annual. */
export function employerNI(pay: number): number {
	return Math.max(0, pay - NI_SECONDARY_THRESHOLD) * NI_EMPLOYER_RATE;
}

/** Student / postgraduate loan deduction on NI-able pay. */
export function loanRepayment(niPay: number, plan: LoanPlan): number {
	const p = LOAN_PLANS[plan];
	return Math.max(0, niPay - p.threshold) * p.rate;
}

/** Corporation tax with marginal relief (no associated companies, 12-month period). */
export function corporationTax(profit: number): number {
	if (!(profit > 0)) return 0;
	if (profit <= CT_LOWER_LIMIT) return profit * CT_SMALL_RATE;
	if (profit >= CT_UPPER_LIMIT) return profit * CT_MAIN_RATE;
	return profit * CT_MAIN_RATE - CT_MARGINAL_FRACTION * (CT_UPPER_LIMIT - profit);
}

/**
 * Income tax due on dividends for an England/Wales/NI taxpayer whose other income is `nonDividend` (taxed
 * first). The personal allowance is tapered on total income, used against non-dividend income first, and
 * the £500 allowance is taxed at 0% but still uses up band space.
 */
export function dividendTax(nonDividend: number, dividends: number): { tax: number; allowance: number } {
	const total = nonDividend + dividends;
	const allowance = taperedAllowance(total);
	const nonDivTaxable = Math.max(0, nonDividend - allowance);
	const divTaxable = Math.max(0, total - allowance) - nonDivTaxable;
	let allowanceLeft = Math.min(DIVIDEND_ALLOWANCE, divTaxable);
	const tops = [RUK_BANDS[0].upTo, RUK_BANDS[1].upTo, Infinity];
	const rates = [DIVIDEND_RATES.basic, DIVIDEND_RATES.higher, DIVIDEND_RATES.additional];
	let pos = nonDivTaxable;
	let remaining = divTaxable;
	let tax = 0;
	for (let i = 0; i < 3 && remaining > 0; i++) {
		if (pos >= tops[i]) continue;
		const chunk = Math.min(remaining, tops[i] - pos);
		const free = Math.min(allowanceLeft, chunk);
		allowanceLeft -= free;
		tax += (chunk - free) * rates[i];
		pos += chunk;
		remaining -= chunk;
	}
	return { tax, allowance };
}

export { APPRENTICESHIP_LEVY_RATE };

export interface BandRow {
	from: number;
	to: number;
	rate: number;
	amount: number;
	tax: number;
}

/** Slice-by-slice tax on a purchase price. Bands list upper limits; `extra` is added to every rate. */
export function priceBandTax(price: number, bands: PriceBand[], extra = 0): { rows: BandRow[]; total: number } {
	const rows: BandRow[] = [];
	let lower = 0;
	for (const b of bands) {
		const amount = Math.max(0, Math.min(price, b.upTo) - lower);
		const rate = b.rate + extra;
		if (amount > 0) rows.push({ from: lower, to: b.upTo, rate, amount, tax: amount * rate });
		lower = b.upTo;
		if (price <= b.upTo) break;
	}
	return { rows, total: rows.reduce((s, r) => s + r.tax, 0) };
}
