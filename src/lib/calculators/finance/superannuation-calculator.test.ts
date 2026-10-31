import { beforeEach, describe, expect, it } from 'vitest';
import calc, { projectSuper } from './superannuation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

beforeEach(() => setCurrency('AUD'));

// Expected values come from an independent node script that applies the same published rules year by year:
// SG = 12% × salary, contributions tax 15%, balance = B × (1 + r − f) + net contributions × (1 + r − f)^0.5.
describe('superannuation calculator', () => {
	it('matches the worked example (today\'s dollars and future dollars)', () => {
		expect(run().primaryResult).toBe('A$722,306');
		const m = run({ real: false });
		expect(m.primaryResult).toBe('A$1,591,787');
	});

	it('adds concessional and non-concessional contributions with no growth or inflation', () => {
		// 30 years, $60,000 salary flat, +5,000 concessional, +2,000 non-concessional, 6% return, 0.5% fees, no inflation
		const r = projectSuper({ age: 30, retireAge: 60, balance: 0, salary: 60000, extraConcessional: 5000, extraNonConcessional: 2000, returnPct: 6, feePct: 0.5, growthPct: 0, inflationPct: 0 });
		expect(r.nominal).toBeCloseTo(920_337.8, 1);
		expect(r.contributed).toBeCloseTo(426_000, 6);
		expect(r.taxPaid).toBeCloseTo(54_900, 6);
	});

	it('caps the super guarantee at the maximum contribution base', () => {
		// $300,000 salary: SG on 270,830 only. Hand/node result for age 64 → 67
		const r = projectSuper({ age: 64, retireAge: 67, balance: 500000, salary: 300000, extraConcessional: 0, extraNonConcessional: 0, returnPct: 5, feePct: 1, growthPct: 2, inflationPct: 2 });
		expect(r.nominal).toBeCloseTo(652_097.0, 1);
		expect(r.real).toBeCloseTo(614_485.57, 1);
		expect(r.firstYearConcessional).toBeCloseTo(32_499.6, 6);
	});

	it('is exact with zero return, one year', () => {
		// 100,000 + 12% × 100,000 × 0.85 = 110,200
		const r = projectSuper({ age: 40, retireAge: 41, balance: 100000, salary: 100000, extraConcessional: 0, extraNonConcessional: 0, returnPct: 0, feePct: 0, growthPct: 0, inflationPct: 0 });
		expect(r.nominal).toBeCloseTo(110_200, 6);
	});

	it('warns when concessional contributions exceed the $32,500 cap', () => {
		// 12% × 90,000 = 10,800 + 25,000 = 35,800 > 32,500
		expect(run({ extraC: '25000' }).summary).toContain('Warning');
		expect(run({ extraC: '25000' }).summary).toContain('A$32,500');
		expect(run({ extraC: '20000' }).summary).not.toContain('Warning'); // 30,800
		// exactly on the cap: 10,800 + 21,700 = 32,500 → no warning
		expect(run({ extraC: '21700' }).summary).not.toContain('Warning');
		expect(run({ extraN: '131000' }).summary).toContain('non-concessional');
	});

	it('rejects invalid input', () => {
		expect(run({ retire: '30' }).primaryResult).toBe('—');
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ age: '-1' }).primaryResult).toBe('—');
	});
});
