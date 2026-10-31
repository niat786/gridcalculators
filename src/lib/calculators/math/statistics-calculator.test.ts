import { describe, expect, it } from 'vitest';
import calc from './statistics-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const row = (r: ReturnType<typeof run>, measure: string) => r.table?.rows.find((x) => x.measure === measure)?.value;

describe('statistics calculator', () => {
	it('gives mean 18 and the full table for 4, 8, 15, 16, 23, 42', () => {
		const r = run();
		expect(r.primaryResult).toBe('18');
		expect(r.primaryLabel).toBe('Mean');
		expect(row(r, 'Sum')).toBe('108');
		expect(row(r, 'Median')).toBe('15.5');
		expect(row(r, 'Mode')).toBe('None (every value occurs once)');
		expect(row(r, 'Minimum')).toBe('4');
		expect(row(r, 'Maximum')).toBe('42');
		expect(row(r, 'Range (max − min)')).toBe('38');
		expect(row(r, 'Q1 (lower quartile)')).toBe('8');
		expect(row(r, 'Q3 (upper quartile)')).toBe('23');
		expect(row(r, 'Interquartile range (Q3 − Q1)')).toBe('15');
		expect(row(r, 'Sample variance (n − 1)')).toBe('182');
		expect(row(r, 'Sample standard deviation')).toBe('13.490738');
		expect(row(r, 'Population variance (n)')).toBe('151.666667');
		expect(row(r, 'Population standard deviation')).toBe('12.315302');
		expect(row(r, 'Standard error of the mean')).toBe('5.507571');
		expect(row(r, 'Skewness (sample, adjusted)')).toBe('1.242611');
		expect(row(r, 'Excess kurtosis (sample, adjusted)')).toBe('1.799746');
	});

	it('finds the mode and the odd-count quartiles for 1, 2, 2, 3, 5', () => {
		const r = run({ values: '1, 2, 2, 3, 5' });
		expect(row(r, 'Mode')).toBe('2');
		expect(row(r, 'Median')).toBe('2');
		expect(row(r, 'Q1 (lower quartile)')).toBe('2');
		expect(row(r, 'Q3 (upper quartile)')).toBe('3');
	});

	it('gives the mean 2.5 and median 2.5 for 1, 2, 3, 4 with no skewness', () => {
		const r = run({ values: '1, 2, 3, 4' });
		expect(r.primaryResult).toBe('2.5');
		expect(row(r, 'Skewness (sample, adjusted)')).toBe('0');
	});

	it('returns a dash for skewness and sample spread with a single value', () => {
		const r = run({ values: '7' });
		expect(r.primaryResult).toBe('7');
		expect(row(r, 'Sample standard deviation')).toBe('—');
		expect(row(r, 'Skewness (sample, adjusted)')).toBe('—');
		expect(row(r, 'Population standard deviation')).toBe('0');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ values: 'abc' }).primaryResult).toBe('—');
	});
});
