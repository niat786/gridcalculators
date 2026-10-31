import { describe, expect, it } from 'vitest';
import calc from './average-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('average calculator', () => {
	it('finds the mean 22.142857 of the default list', () => {
		const r = run();
		expect(r.primaryResult).toBe('22.142857');
		expect(metric(r, 'Count')).toBe('7');
		expect(metric(r, 'Sum')).toBe('155');
		expect(metric(r, 'Median')).toBe('23');
		expect(metric(r, 'Mode')).toBe('23 and 38');
	});

	it('finds mean 2.5, median 2.5 and no mode for 1, 2, 3, 4', () => {
		const r = run({ values: '1, 2, 3, 4' });
		expect(r.primaryResult).toBe('2.5');
		expect(metric(r, 'Median')).toBe('2.5');
		expect(metric(r, 'Mode')).toBe('none');
	});

	it('finds mean 2.666667 and mode 2 for 2 2 4 (space separated)', () => {
		const r = run({ values: '2 2 4' });
		expect(r.primaryResult).toBe('2.666667');
		expect(metric(r, 'Mode')).toBe('2');
	});

	it('returns the single value itself for one number', () => {
		const r = run({ values: '5' });
		expect(r.primaryResult).toBe('5');
		expect(metric(r, 'Mode')).toBe('none');
	});

	it('returns a dash for an empty list', () => {
		expect(run({ values: '' }).primaryResult).toBe('—');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ values: 'abc' }).primaryResult).toBe('—');
	});
});
