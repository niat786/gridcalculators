import { describe, expect, it } from 'vitest';
import calc from './apr-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('apr calculator', () => {
	it('matches the worked example (defaults)', () => {
		const r = run();
		expect(r.primaryResult).toBe('8.07%');
		expect(metric(r, 'Monthly payment')).toBe('$396.02');
		expect(metric(r, 'Total fees')).toBe('$500.00');
		expect(metric(r, 'Cash you receive')).toBe('$19,500.00');
		expect(metric(r, 'Paid at closing')).toBe('$0.00');
		expect(metric(r, 'Total of payments')).toBe('$23,761.44');
		expect(metric(r, 'Total cost')).toBe('$4,261.44');
	});

	it('equals the stated rate when there are no fees and the rate is zero', () => {
		const r = run({ amount: '10000', rate: '0', months: '12', fees: '0' });
		expect(r.primaryResult).toBe('0.00%');
		expect(metric(r, 'Monthly payment')).toBe('$833.33');
		expect(metric(r, 'Total cost')).toBe('$0.00');
	});

	it('deducted fees on a 5,000 loan at 12% over 24 months', () => {
		const r = run({ amount: '5000', rate: '12', months: '24', fees: '250', feeMode: 'deducted' });
		expect(r.primaryResult).toBe('17.23%');
		expect(metric(r, 'Monthly payment')).toBe('$235.37');
		expect(metric(r, 'Cash you receive')).toBe('$4,750.00');
		expect(metric(r, 'Total of payments')).toBe('$5,648.82');
		expect(metric(r, 'Total cost')).toBe('$898.82');
	});

	it('fees paid upfront on a 10,000 loan at 6% over 36 months', () => {
		const r = run({ amount: '10000', rate: '6', months: '36', fees: '100', feeMode: 'upfront' });
		expect(r.primaryResult).toBe('6.68%');
		expect(metric(r, 'Monthly payment')).toBe('$304.22');
		expect(metric(r, 'Cash you receive')).toBe('$10,000.00');
		expect(metric(r, 'Paid at closing')).toBe('$100.00');
		expect(metric(r, 'Total of payments')).toBe('$10,951.90');
		expect(metric(r, 'Total cost')).toBe('$1,051.90');
	});

	it('returns a dash when the fees are not below the loan amount', () => {
		const r = run({ amount: '20000', fees: '20000' });
		expect(r.primaryResult).toBe('—');
	});
});
