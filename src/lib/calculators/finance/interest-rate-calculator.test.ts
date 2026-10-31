import { describe, expect, it } from 'vitest';
import calc from './interest-rate-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('interest rate calculator', () => {
	it('recovers the 7% rate behind the defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('7.00%');
		expect(metric(r, 'Total of payments')).toBe('$23,761.20');
		expect(metric(r, 'Total interest')).toBe('$3,761.20');
	});

	it('10,000 repaid as 12 payments of $1,000', () => {
		const r = run({ amount: '10000', months: '12', payment: '1000' });
		expect(r.primaryResult).toBe('35.074%');
		expect(metric(r, 'Total interest')).toBe('$2,000.00');
	});

	it('5,000 repaid as 24 payments of $250', () => {
		const r = run({ amount: '5000', months: '24', payment: '250' });
		expect(r.primaryResult).toBe('18.157%');
		expect(metric(r, 'Total interest')).toBe('$1,000.00');
	});

	it('interest-free when the payments equal the loan', () => {
		const r = run({ amount: '12000', months: '12', payment: '1000' });
		expect(r.primaryResult).not.toBe('—');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash when the payments add up to less than the loan', () => {
		const r = run({ amount: '20000', months: '12', payment: '1000' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('no interest rate fits');
	});

	it('returns a dash when the implied rate is above 100%', () => {
		const r = run({ amount: '1000', months: '1', payment: '5000' });
		expect(r.primaryResult).toBe('—');
	});
});
