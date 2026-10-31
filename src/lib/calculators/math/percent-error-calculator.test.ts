import { describe, expect, it } from 'vitest';
import calc from './percent-error-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('percent error calculator', () => {
	it('gives 0.1019% for 9.8 measured against 9.81 true', () => {
		const r = run();
		expect(r.primaryResult).toBe('0.1019%');
		expect(r.secondaryMetrics?.[0].value).toBe('0.01');
		expect(r.secondaryMetrics?.[2].value).toBe('Measured value is lower');
	});

	it('gives 10% for 45 measured against 50 true', () => {
		expect(run({ measured: '45', accepted: '50' }).primaryResult).toBe('10%');
	});

	it('gives 4% for 52 measured against 50 true, and reads the error as above', () => {
		const r = run({ measured: '52', accepted: '50' });
		expect(r.primaryResult).toBe('4%');
		expect(r.secondaryMetrics?.[2].value).toBe('Measured value is higher');
	});

	it('uses the absolute value of a negative true value: -4 against -5 is 20%', () => {
		expect(run({ measured: '-4', accepted: '-5' }).primaryResult).toBe('20%');
	});

	it('returns a dash when the true value is zero', () => {
		expect(run({ accepted: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty measured value', () => {
		expect(run({ measured: '' }).primaryResult).toBe('—');
	});
});
