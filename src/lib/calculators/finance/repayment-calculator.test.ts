import { describe, expect, it } from 'vitest';
import calc from './repayment-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('repayment calculator', () => {
	it('matches the worked example (payment for a 5-year term)', () => {
		const r = run();
		expect(r.primaryLabel).toBe('Monthly payment');
		expect(r.primaryResult).toBe('$489.15');
		expect(metric(r, 'Total interest')).toBe('$4,349.22');
		expect(metric(r, 'Total paid')).toBe('$29,349.22');
		expect(metric(r, 'Number of payments')).toBe('60 payments');
		expect(r.table?.rows).toHaveLength(5);
	});

	it('time to repay a fixed $500 payment on 25,000 at 6.5%', () => {
		const r = run({ mode: 'payment', payment: '500' });
		expect(r.primaryLabel).toBe('Time to repay');
		expect(r.primaryResult).toBe('59 months');
		expect(metric(r, 'Total interest')).toBe('$4,234.89');
		expect(metric(r, 'Total paid')).toBe('$29,234.89');
		expect(metric(r, 'Final payment')).toBe('$234.89');
		expect(r.table?.rows).toHaveLength(5);
	});

	it('zero-rate loan split evenly over one year', () => {
		const r = run({ amount: '12000', rate: '0', years: '1' });
		expect(r.primaryResult).toBe('$1,000.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash when the payment does not cover the first month interest', () => {
		const r = run({ mode: 'payment', payment: '100' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('never repays');
	});

	it('returns a dash for a zero amount', () => {
		expect(run({ amount: '0' }).primaryResult).toBe('—');
	});
});
