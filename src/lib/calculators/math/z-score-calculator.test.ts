import { describe, expect, it } from 'vitest';
import calc from './z-score-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('z-score calculator', () => {
	it('gives z = -1 and 15.8655% below for 85 with mean 100 and sd 15 (the default)', () => {
		const r = run();
		expect(r.primaryResult).toBe('-1');
		expect(metric(r, 'Percentile, P(X < x)')).toBe('15.8655%');
		expect(metric(r, 'P(X > x)')).toBe('84.1345%');
	});

	it('matches the table value Φ(1.96) = 0.975002', () => {
		const r = run({ x: '1.96', mean: '0', sd: '1' });
		expect(r.primaryResult).toBe('1.96');
		expect(metric(r, 'Percentile, P(X < x)')).toBe('97.5002%');
	});

	it('matches the table value Φ(−1) = 0.158655', () => {
		expect(metric(run({ x: '-1', mean: '0', sd: '1' }), 'Percentile, P(X < x)')).toBe('15.8655%');
	});

	it('gives the value 124.672804 for the 95th percentile with mean 100 and sd 15', () => {
		const r = run({ mode: 'fromPercentile', percentile: '95' });
		expect(r.primaryResult).toBe('124.672804');
		expect(metric(r, 'Z-score')).toBe('1.644854');
	});

	it('matches the table value Φ⁻¹(0.995) = 2.575829', () => {
		const r = run({ mode: 'fromPercentile', percentile: '99.5', mean: '0', sd: '1' });
		expect(r.primaryResult).toBe('2.575829');
	});

	it('gives 95.0004% between −1.96 and 1.96', () => {
		const r = run({ mode: 'between', zLow: '-1.96', zHigh: '1.96' });
		expect(r.primaryResult).toBe('95.0004%');
	});

	it('keeps digits for a far-tail probability: Φ(−5) = 2.866516e-7', () => {
		const r = run({ x: '-5', mean: '0', sd: '1' });
		expect(r.primaryResult).toBe('-5');
		expect(metric(r, 'Percentile, P(X < x)')).toBe('0.0000286652%');
	});

	it('returns a dash for a zero standard deviation', () => {
		expect(run({ sd: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a percentile of 100', () => {
		expect(run({ mode: 'fromPercentile', percentile: '100' }).primaryResult).toBe('—');
	});

	it('returns a dash for a value that is not a number', () => {
		expect(run({ x: 'abc' }).primaryResult).toBe('—');
	});
});
