import { beforeEach, describe, expect, it } from 'vitest';
import calc, { projectKiwiSaver } from './kiwisaver-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { esctRate, govContribution } from '../data/nz-tax-2026-27';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

beforeEach(() => setCurrency('NZD'));

const base = { age: 30, balance: 0, salary: 50000, employeePct: 3.5, employerPct: 3.5, government: true, returnPct: 0, feePct: 0, growthPct: 0, inflationPct: 0 };

// Expected values come from an independent node script applying the same published rules year by year.
describe('kiwisaver calculator (2026-27)', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('NZ$284,010');
		expect(r.secondaryMetrics?.[0].value).toBe('NZ$674,014');
		expect(r.secondaryMetrics?.[4].value).toBe('NZ$8,343'); // 32 years × $260.72 until salary passes $180,000
	});

	it('adds contributions exactly with zero return (one year)', () => {
		// salary 20,000, age 64: you 700; employer 700 less 17.5% ESCT = 577.50; government 25% × 700 = 175 → 1,452.50
		const r = projectKiwiSaver({ ...base, age: 64, salary: 20000 });
		expect(r.nominal).toBeCloseTo(1_452.5, 6);
		expect(r.esct).toBeCloseTo(122.5, 6);
	});

	it('pays no government contribution above $180,000 and applies the 33% ESCT band', () => {
		// age 50, $200,000, you 6%, employer 3.5%, return 6.5%, fees 0.5%, balance 100,000 → 639,616.28 (node)
		const r = projectKiwiSaver({ ...base, age: 50, balance: 100000, salary: 200000, employeePct: 6, returnPct: 6.5, feePct: 0.5 });
		expect(r.nominal).toBeCloseTo(639_616.28, 1);
		expect(r.gov).toBe(0);
		expect(r.esct).toBeCloseTo(34_650, 6); // 7,000 × 33% × 15 years
	});

	it('works with no government contribution, higher rates and inflation', () => {
		// age 40, $50,000, 10% / 3.5%, no government, return 5%, fees 1%, growth 2%, inflation 2% → 331,141.30 nominal, 201,840.84 real
		const r = projectKiwiSaver({ ...base, age: 40, employeePct: 10, government: false, returnPct: 5, feePct: 1, growthPct: 2, inflationPct: 2 });
		expect(r.nominal).toBeCloseTo(331_141.3, 1);
		expect(r.real).toBeCloseTo(201_840.84, 1);
	});

	it('follows the government contribution and ESCT rules at their edges', () => {
		expect(govContribution(1_042.86, 50_000)).toBeCloseTo(260.715, 3);
		expect(govContribution(1_000, 50_000)).toBe(250);
		expect(govContribution(2_000, 50_000)).toBe(260.72);
		expect(govContribution(2_000, 180_000)).toBe(260.72);
		expect(govContribution(2_000, 180_001)).toBe(0);
		expect(esctRate(18_720)).toBe(0.105);
		expect(esctRate(18_721)).toBe(0.175);
		expect(esctRate(64_200)).toBe(0.175);
		expect(esctRate(93_721)).toBe(0.33);
		expect(esctRate(216_001)).toBe(0.39);
	});

	it('supports a custom return and rejects invalid input', () => {
		expect(run({ fund: 'custom', custom: '5.5' }).primaryResult).toBe(run().primaryResult);
		expect(run({ age: '65' }).primaryResult).toBe('—');
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '0' }).primaryResult).not.toBe('—');
	});
});
