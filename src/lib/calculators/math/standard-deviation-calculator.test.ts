import { describe, expect, it } from 'vitest';
import calc from './standard-deviation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('standard deviation calculator', () => {
	it('gives the sample standard deviation 13.284434 for the default list', () => {
		const r = run();
		expect(r.primaryResult).toBe('13.284434');
		expect(r.primaryLabel).toBe('Standard deviation (sample)');
		expect(metric(r, 'Variance')).toBe('176.47619');
		expect(metric(r, 'Mean')).toBe('22.142857');
		expect(metric(r, 'Count')).toBe('7');
		expect(metric(r, 'Sum')).toBe('155');
		expect(metric(r, 'Standard error of the mean')).toBe('5.021044');
	});

	it('gives the population standard deviation 12.298996 for the default list', () => {
		const r = run({ kind: 'population' });
		expect(r.primaryResult).toBe('12.298996');
		expect(metric(r, 'Variance')).toBe('151.265306');
	});

	it('gives exactly 2 for the population 2, 4, 4, 4, 5, 5, 7, 9', () => {
		expect(run({ values: '2, 4, 4, 4, 5, 5, 7, 9', kind: 'population' }).primaryResult).toBe('2');
	});

	it('gives 2.13809 for the same list as a sample', () => {
		expect(run({ values: '2, 4, 4, 4, 5, 5, 7, 9' }).primaryResult).toBe('2.13809');
	});

	it('gives 1.581139 and a standard error of 0.707107 for 1, 2, 3, 4, 5 as a sample', () => {
		const r = run({ values: '1, 2, 3, 4, 5' });
		expect(r.primaryResult).toBe('1.581139');
		expect(metric(r, 'Standard error of the mean')).toBe('0.707107');
	});

	it('gives 0 when all values are equal', () => {
		expect(run({ values: '5, 5' }).primaryResult).toBe('0');
	});

	it('returns a dash for a single number as a sample', () => {
		expect(run({ values: '7' }).primaryResult).toBe('—');
	});

	it('gives 0 for a single number as a population', () => {
		expect(run({ values: '7', kind: 'population' }).primaryResult).toBe('0');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ values: 'abc' }).primaryResult).toBe('—');
	});
});
