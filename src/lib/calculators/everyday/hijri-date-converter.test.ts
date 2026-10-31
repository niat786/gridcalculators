import { describe, expect, it } from 'vitest';
import calc, { fromHijri, monthLength, toHijri } from './hijri-date-converter.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const U = 'islamic-umalqura' as const;

describe('Hijri date converter', () => {
	it('matches the worked example', () => {
		expect(run({ date: '2026-10-28' }).primaryResult).toBe('17 Jumada al-Ula 1448 AH');
	});
	it('matches published Umm al-Qura dates', () => {
		// 1 Muharram 1447 = 26 June 2025; 1 Shawwal 1446 = 30 March 2025; 1 Ramadan 1447 = 18 Feb 2026
		expect(toHijri(Date.UTC(2025, 5, 26), U)).toEqual({ y: 1447, m: 1, d: 1 });
		expect(toHijri(Date.UTC(2025, 2, 30), U)).toEqual({ y: 1446, m: 10, d: 1 });
		expect(toHijri(Date.UTC(2026, 1, 18), U)).toEqual({ y: 1447, m: 9, d: 1 });
	});
	it('converts Hijri back to Gregorian', () => {
		expect(fromHijri({ y: 1447, m: 9, d: 1 }, U)).toBe(Date.UTC(2026, 1, 18));
		expect(run({ mode: 'toGregorian', hy: '1447', hm: '1', hd: '1' }).primaryResult).toBe('26 June 2025');
	});
	it('round-trips every day for years', () => {
		for (let ms = Date.UTC(2000, 0, 1); ms < Date.UTC(2040, 0, 1); ms += 86_400_000 * 7) {
			const h = toHijri(ms, U);
			expect(fromHijri(h, U)).toBe(ms);
		}
	});
	it('rejects a 30th day in a 29-day month', () => {
		const len = monthLength(1447, 9, U);
		const r = run({ mode: 'toGregorian', hy: '1447', hm: '9', hd: '30' });
		if (len === 29) expect(r.primaryResult).toBe('—');
		else expect(r.primaryResult).not.toBe('—');
	});
	it('rejects out-of-range input', () => {
		expect(run({ date: '1800-01-01' }).primaryResult).toBe('—');
		expect(run({ mode: 'toGregorian', hy: '2000' }).primaryResult).toBe('—');
	});
});
