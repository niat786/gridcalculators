import type {
	CalculatorInput,
	DurationInput,
	InputValues,
	RowsInput,
	RowValue
} from '../../calculators/types';
import { parseNumber } from '../../calculators/format';

/**
 * Raw form state. Everything the person types stays as text until it is parsed, so typing
 * "1," or "0." never gets rewritten under their cursor. Toggles are booleans.
 * Encodings: duration "1:30:0" (unit order), list "4, 8, 15", rows "a|b;c|d" (cells URI-encoded).
 */
export type RawValues = Record<string, string | boolean>;

const UNIT_SECONDS = { d: 86_400, h: 3_600, m: 60, s: 1 } as const;

// ---------- encoders ----------

export function encodeRows(input: RowsInput, rows: RowValue[]): string {
	return rows
		.map((r) => input.columns.map((c) => encodeURIComponent(String(r[c.id] ?? c.default))).join('|'))
		.join(';');
}

export function decodeRows(input: RowsInput, raw: string): Record<string, string>[] {
	if (!raw) return [];
	return raw.split(';').map((line) => {
		const cells = line.split('|');
		const row: Record<string, string> = {};
		input.columns.forEach((c, i) => {
			let v = cells[i] ?? String(c.default);
			try {
				v = decodeURIComponent(v);
			} catch {
				/* keep as-is */
			}
			row[c.id] = v;
		});
		return row;
	});
}

export function splitDuration(input: DurationInput, raw: string): string[] {
	const parts = raw.split(':');
	return input.units.map((_, i) => parts[i] ?? '0');
}

export function durationSeconds(input: DurationInput, raw: string): number {
	const neg = raw.startsWith('-');
	const parts = splitDuration(input, neg ? raw.slice(1) : raw);
	let total = 0;
	for (let i = 0; i < input.units.length; i++) {
		const n = parts[i].trim() === '' ? 0 : parseNumber(parts[i]);
		if (Number.isNaN(n)) return NaN;
		total += n * UNIT_SECONDS[input.units[i]];
	}
	return neg ? -total : total;
}

export function parseList(raw: string): number[] {
	return raw
		.split(/[\s,;]+/)
		.filter((t) => t !== '')
		.map((t) => Number(t));
}

// ---------- state ----------

export function defaultRaw(inputs: CalculatorInput[], today: string): RawValues {
	const raw: RawValues = {};
	for (const i of inputs) {
		if (i.type === 'toggle') raw[i.id] = i.default;
		else if (i.type === 'date') raw[i.id] = i.default === 'today' ? today : i.default;
		else if (i.type === 'rows') raw[i.id] = encodeRows(i, i.default);
		else raw[i.id] = String(i.default);
	}
	return raw;
}

export function toValues(inputs: CalculatorInput[], raw: RawValues): InputValues {
	const v: InputValues = {};
	for (const i of inputs) {
		const r = raw[i.id];
		switch (i.type) {
			case 'number':
			case 'slider':
				v[i.id] = parseNumber(String(r));
				break;
			case 'toggle':
				v[i.id] = Boolean(r);
				break;
			case 'duration':
				v[i.id] = durationSeconds(i, String(r));
				break;
			case 'list':
				v[i.id] = parseList(String(r));
				break;
			case 'rows':
				v[i.id] = decodeRows(i, String(r)).map((row) => {
					const out: RowValue = {};
					for (const c of i.columns) out[c.id] = c.type === 'number' ? parseNumber(row[c.id]) : row[c.id];
					return out;
				});
				break;
			default:
				v[i.id] = String(r);
		}
	}
	return v;
}

export function isVisible(input: CalculatorInput, values: InputValues): boolean {
	return input.visibleWhen ? input.visibleWhen(values) : true;
}

function rangeError(n: number, min?: number, max?: number): string {
	if (min !== undefined && n < min) return `Enter ${min.toLocaleString('en-US')} or more.`;
	if (max !== undefined && n > max) return `Enter ${max.toLocaleString('en-US')} or less.`;
	return '';
}

/** Returns an error message, or '' when the field is valid. */
export function validate(input: CalculatorInput, raw: string | boolean): string {
	const s = String(raw);
	switch (input.type) {
		case 'number':
		case 'slider': {
			const n = parseNumber(s);
			if (Number.isNaN(n)) return 'Enter a number.';
			if (input.type === 'number' && input.decimal === false && !Number.isInteger(n))
				return 'Enter a whole number.';
			return rangeError(n, input.min, input.max);
		}
		case 'date':
			return /^\d{4}-\d{2}-\d{2}$/.test(s) ? '' : 'Enter a date.';
		case 'time':
			return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? '' : 'Enter a time.';
		case 'text': {
			const max = input.maxLength ?? 5000;
			if (s.length > max) return `Keep it under ${max.toLocaleString('en-US')} characters.`;
			if (input.pattern && !input.pattern.test(s)) return input.patternMessage ?? 'Check the format.';
			return '';
		}
		case 'select':
			return input.options.some((o) => o.value === s) ? '' : 'Pick an option.';
		case 'duration': {
			const body = s.startsWith('-') ? s.slice(1) : s;
			if (s.startsWith('-') && !input.allowNegative) return 'Enter a positive duration.';
			const parts = splitDuration(input, body);
			if (parts.some((p) => p.trim() !== '' && (Number.isNaN(parseNumber(p)) || parseNumber(p) < 0)))
				return 'Use positive numbers only.';
			return '';
		}
		case 'list': {
			const nums = parseList(s);
			if (nums.some((n) => Number.isNaN(n))) return 'Use numbers separated by commas or spaces.';
			if (input.minCount && nums.length < input.minCount) return `Enter at least ${input.minCount} numbers.`;
			if (input.maxCount && nums.length > input.maxCount) return `Enter at most ${input.maxCount} numbers.`;
			return '';
		}
		case 'rows': {
			const rows = decodeRows(input, s);
			if (input.minRows && rows.length < input.minRows) return `Add at least ${input.minRows} rows.`;
			for (const row of rows) {
				for (const c of input.columns) {
					if (c.type !== 'number') continue;
					const n = parseNumber(row[c.id]);
					if (Number.isNaN(n)) return `Check “${c.label}”: enter a number.`;
					const e = rangeError(n, c.min, c.max);
					if (e) return `Check “${c.label}”: ${e.charAt(0).toLowerCase()}${e.slice(1)}`;
				}
			}
			return '';
		}
	}
	return '';
}

/** Read inputs from a query string, ignoring unknown keys and malformed values. */
export function fromQuery(inputs: CalculatorInput[], search: string, base: RawValues): RawValues {
	const params = new URLSearchParams(search);
	const next = { ...base };
	for (const i of inputs) {
		const q = params.get(i.id);
		if (q === null || q.length > 5000) continue;
		if (i.type === 'toggle') next[i.id] = q === '1' || q === 'true';
		else if (validate(i, q) === '') next[i.id] = q;
	}
	return next;
}

/** Only values that differ from the defaults go in the URL, so links stay short. */
export function toQuery(inputs: CalculatorInput[], raw: RawValues, defaults: RawValues): string {
	const params = new URLSearchParams();
	const strip = (x: unknown) => String(x).replace(/,/g, '');
	for (const i of inputs) {
		const r = raw[i.id];
		if (typeof r === 'boolean') {
			if (r !== defaults[i.id]) params.set(i.id, r ? '1' : '0');
			continue;
		}
		if (i.type === 'number' || i.type === 'slider') {
			if (strip(r) !== strip(defaults[i.id])) params.set(i.id, strip(r));
		} else if (r !== defaults[i.id]) {
			params.set(i.id, String(r));
		}
	}
	const s = params.toString();
	return s ? `?${s}` : '';
}
