/**
 * Formatting helpers. The locale is fixed so prerendered HTML and the browser agree
 * (no hydration flicker). Localisation can come later per market.
 */
const LOCALE = 'en-US';

/**
 * Currencies people can pick on universal money calculators (loan, savings, mortgage maths work
 * the same everywhere). Country-specific tools fix their own currency instead.
 */
export const CURRENCIES = [
	{ code: 'USD', label: 'US dollar' },
	{ code: 'EUR', label: 'Euro' },
	{ code: 'GBP', label: 'British pound' },
	{ code: 'CAD', label: 'Canadian dollar' },
	{ code: 'AUD', label: 'Australian dollar' },
	{ code: 'NZD', label: 'New Zealand dollar' },
	{ code: 'INR', label: 'Indian rupee' },
	{ code: 'PKR', label: 'Pakistani rupee' },
	{ code: 'BDT', label: 'Bangladeshi taka' },
	{ code: 'AED', label: 'UAE dirham' },
	{ code: 'SAR', label: 'Saudi riyal' },
	{ code: 'QAR', label: 'Qatari riyal' },
	{ code: 'KWD', label: 'Kuwaiti dinar' },
	{ code: 'OMR', label: 'Omani rial' },
	{ code: 'BHD', label: 'Bahraini dinar' },
	{ code: 'SGD', label: 'Singapore dollar' },
	{ code: 'MYR', label: 'Malaysian ringgit' },
	{ code: 'PHP', label: 'Philippine peso' },
	{ code: 'JPY', label: 'Japanese yen' },
	{ code: 'CNY', label: 'Chinese yuan' },
	{ code: 'KRW', label: 'South Korean won' },
	{ code: 'CHF', label: 'Swiss franc' },
	{ code: 'ZAR', label: 'South African rand' },
	{ code: 'NGN', label: 'Nigerian naira' },
	{ code: 'KES', label: 'Kenyan shilling' },
	{ code: 'EGP', label: 'Egyptian pound' },
	{ code: 'TRY', label: 'Turkish lira' },
	{ code: 'BRL', label: 'Brazilian real' },
	{ code: 'MXN', label: 'Mexican peso' }
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

/** Currencies whose readers group digits in lakhs and crores (₹12,34,567). */
const LAKH_GROUPING = new Set(['INR']);

const formatters = new Map<string, { full: Intl.NumberFormat; whole: Intl.NumberFormat; compact: Intl.NumberFormat }>();
function fmtFor(code: string) {
	let f = formatters.get(code);
	if (!f) {
		const locale = LAKH_GROUPING.has(code) ? 'en-IN' : LOCALE;
		f = {
			full: new Intl.NumberFormat(locale, { style: 'currency', currency: code }),
			whole: new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 }),
			compact: new Intl.NumberFormat(locale, { style: 'currency', currency: code, notation: 'compact', maximumFractionDigits: 1 })
		};
		formatters.set(code, f);
	}
	return f;
}

let current = 'USD';

/** Set before calling calculate() so money() uses the person's currency. Unknown codes fall back to USD. */
export function setCurrency(code: string): void {
	current = CURRENCIES.some((c) => c.code === code) ? code : 'USD';
}

export function getCurrency(): string {
	return current;
}

/** The symbol Intl uses for a currency, e.g. "$", "€", "£", "PKR". */
export function currencySymbol(code: string = current): string {
	return fmtFor(code).full.formatToParts(0).find((p) => p.type === 'currency')?.value ?? code;
}

export const DASH = '—';

export function money(n: number, wholeDollars = false): string {
	if (!Number.isFinite(n)) return DASH;
	const f = fmtFor(current);
	return (wholeDollars ? f.whole : f.full).format(n);
}

/** Format in a specific currency, ignoring the page's current one (e.g. a GCC country picker). */
export function moneyIn(code: string, n: number, whole = false): string {
	if (!Number.isFinite(n)) return DASH;
	const f = fmtFor(code);
	return (whole ? f.whole : f.full).format(n);
}

export function moneyCompact(n: number): string {
	if (!Number.isFinite(n)) return DASH;
	return fmtFor(current).compact.format(n);
}

export function num(n: number, maxDecimals = 2, minDecimals = 0): string {
	if (!Number.isFinite(n)) return DASH;
	return n.toLocaleString(LOCALE, {
		maximumFractionDigits: maxDecimals,
		minimumFractionDigits: minDecimals
	});
}

export function pct(n: number, maxDecimals = 2): string {
	if (!Number.isFinite(n)) return DASH;
	return `${num(n, maxDecimals)}%`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
	return `${num(n, 0)} ${n === 1 ? word : pluralWord}`;
}

/** Parse user text like "1,250.50" to a number; NaN when empty or invalid. */
export function parseNumber(raw: string): number {
	const cleaned = raw.replace(/[,\s$%]/g, '');
	if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
	return Number(cleaned);
}
