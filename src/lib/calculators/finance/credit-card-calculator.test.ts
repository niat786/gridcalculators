import { describe, expect, it } from 'vitest';
import calc from './credit-card-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('credit card calculator', () => {
	it('matches the worked example (fixed payment, defaults)', () => {
		const r = run();
		expect(r.primaryResult).toBe('50 months');
		expect(metric(r, 'Total interest')).toBe('$2,685.39');
		expect(metric(r, 'Total paid')).toBe('$7,485.39');
		expect(metric(r, 'Final payment')).toBe('$135.39');
		expect(r.table?.rows).toHaveLength(12);
		expect(r.table?.rows[0]).toMatchObject({ month: '1', payment: '$150.00', interest: '$91.60' });
	});

	it('percentage minimum with a $25 floor on 5,000 at 18%', () => {
		const r = run({ payType: 'percent', balance: '5000', apr: '18', percent: '2', floor: '25' });
		expect(r.primaryResult).toBe('354 months');
		expect(metric(r, 'Total interest')).toBe('$11,688.88');
		expect(metric(r, 'First payment')).toBe('$101.50');
		expect(r.table?.rows[1]).toMatchObject({ month: '2', payment: '$100.96' });
	});

	it('returns a dash when a fixed payment never covers the interest', () => {
		const r = run({ balance: '5000', apr: '24', payment: '90' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('never clears');
	});

	it('returns a dash for a zero balance', () => {
		expect(run({ balance: '0' }).primaryResult).toBe('—');
	});
});
