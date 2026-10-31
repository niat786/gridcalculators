import { describe, expect, it } from 'vitest';
import calc from './auto-lease-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('auto lease calculator', () => {
	it('matches the worked example (money factor, defaults)', () => {
		const r = run();
		expect(r.primaryResult).toBe('$374.80');
		expect(metric(r, 'Adjusted cap cost')).toBe('$34,000.00');
		expect(metric(r, 'Residual value')).toBe('$24,000.00');
		expect(metric(r, 'Depreciation fee')).toBe('$277.78');
		expect(metric(r, 'Finance fee')).toBe('$72.50');
		expect(metric(r, 'Sales tax per month')).toBe('$24.52');
		expect(metric(r, 'Total of payments')).toBe('$13,492.70');
	});

	it('trade-in and APR mode: APR 4.8% is a money factor of 0.002', () => {
		const r = run({
			msrp: '30000',
			price: '28000',
			down: '0',
			tradeIn: '3000',
			residualPct: '55',
			months: '24',
			moneyMode: 'apr',
			aprRate: '4.8',
			tax: '0'
		});
		expect(r.primaryResult).toBe('$437.17');
		expect(metric(r, 'Adjusted cap cost')).toBe('$25,000.00');
		expect(metric(r, 'Residual value')).toBe('$16,500.00');
		expect(metric(r, 'Depreciation fee')).toBe('$354.17');
		expect(metric(r, 'Finance fee')).toBe('$83.00');
		expect(metric(r, 'Sales tax per month')).toBe('$0.00');
	});

	it('APR of 3% gives the same payment as a money factor of 0.00125', () => {
		expect(run({ moneyMode: 'apr', aprRate: '3' }).primaryResult).toBe(run().primaryResult);
	});

	it('returns a dash when the down payment exceeds the price', () => {
		const r = run({ down: '40000' });
		expect(r.primaryResult).toBe('—');
	});
});
