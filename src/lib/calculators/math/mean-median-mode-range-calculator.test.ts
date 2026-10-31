import { describe, expect, it } from 'vitest';
import calc from './mean-median-mode-range-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('mean, median, mode and range calculator', () => {
	it('describes the default list: mean 22.142857, median 23, modes 23 and 38, range 36', () => {
		const r = run();
		expect(r.primaryResult).toBe('22.142857');
		expect(metric(r, 'Median')).toBe('23');
		expect(metric(r, 'Mode(s)')).toBe('23 and 38');
		expect(metric(r, 'Range')).toBe('36');
		expect(metric(r, 'Minimum')).toBe('2');
		expect(metric(r, 'Maximum')).toBe('38');
		expect(metric(r, 'Count')).toBe('7');
		expect(metric(r, 'Sum')).toBe('155');
	});

	it('shows no mode and an even-count median for 1, 2, 3, 4', () => {
		const r = run({ values: '1, 2, 3, 4' });
		expect(r.primaryResult).toBe('2.5');
		expect(metric(r, 'Median')).toBe('2.5');
		expect(metric(r, 'Mode(s)')).toBe('none');
		expect(metric(r, 'Range')).toBe('3');
	});

	it('returns a single mode and zero range for 3, 3, 3', () => {
		const r = run({ values: '3, 3, 3' });
		expect(r.primaryResult).toBe('3');
		expect(metric(r, 'Mode(s)')).toBe('3');
		expect(metric(r, 'Range')).toBe('0');
	});

	it('handles one number: mean, median and extremes all equal it', () => {
		const r = run({ values: '5' });
		expect(r.primaryResult).toBe('5');
		expect(metric(r, 'Median')).toBe('5');
		expect(metric(r, 'Mode(s)')).toBe('none');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ values: 'abc' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty list', () => {
		expect(run({ values: '' }).primaryResult).toBe('—');
	});
});
