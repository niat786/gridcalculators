import { describe, expect, it } from 'vitest';
import calc from './business-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('business loan calculator', () => {
	it('matches the worked example (monthly, defaults)', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,050.09');
		expect(metric(r, 'Effective APR')).toBe('10.37%');
		expect(metric(r, 'Total interest')).toBe('$13,005.58');
		expect(metric(r, 'Origination fee')).toBe('$1,000.00');
		expect(metric(r, 'Total cost')).toBe('$14,005.58');
		expect(metric(r, 'Total of payments')).toBe('$63,005.58');
		expect(metric(r, 'Number of payments')).toBe('60 payments');
	});

	it('weekly payments over the same term: 260 weekly payments', () => {
		const r = run({ frequency: 'weekly' });
		expect(r.primaryLabel).toBe('Weekly payment');
		expect(r.primaryResult).toBe('$241.76');
		expect(metric(r, 'Number of payments')).toBe('260 payments');
		expect(metric(r, 'Effective APR')).toBe('10.38%');
		expect(metric(r, 'Total interest')).toBe('$12,856.40');
	});

	it('interest-free loan with no fee', () => {
		const r = run({ amount: '12000', rate: '0', months: '12', feePct: '0' });
		expect(r.primaryResult).toBe('$1,000.00');
		expect(metric(r, 'Effective APR')).toBe('0.00%');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash for a zero loan amount', () => {
		expect(run({ amount: '0' }).primaryResult).toBe('—');
	});
});
