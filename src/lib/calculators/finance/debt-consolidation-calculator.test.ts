import { describe, expect, it } from 'vitest';
import calc from './debt-consolidation-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { CalculationResult, RowsInput } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('debt consolidation calculator', () => {
	it('matches the worked example (defaults): a saving', () => {
		const r = run();
		expect(r.primaryLabel).toBe('Total saved');
		expect(r.primaryResult).toBe('$2,239.08');
		expect(metric(r, 'Current monthly payments')).toBe('$360.00');
		expect(metric(r, 'New monthly payment')).toBe('$268.74');
		expect(metric(r, 'Current payoff time')).toBe('64 months');
		expect(metric(r, 'New loan term')).toBe('60 months');
		expect(metric(r, 'Current total interest')).toBe('$6,363.26');
		expect(metric(r, 'New loan total cost')).toBe('$4,124.18');
		expect(metric(r, 'Consolidation fee')).toBe('$360.00');
	});

	it('shows an extra cost honestly when the new loan is expensive', () => {
		const r = run({ newRate: '30', newMonths: '120', feePct: '0' });
		expect(r.primaryLabel).toBe('Extra cost');
		expect(r.primaryResult).toBe('$19,597.72');
		expect(metric(r, 'New monthly payment')).toBe('$316.34');
	});

	it('returns a dash when a payment never covers its interest', () => {
		const debts = encodeRows(calc.inputs[0] as RowsInput, [
			{ name: 'Card', balance: 5000, apr: 24, payment: 90 }
		]);
		const r = run({ debts });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('never be paid off');
	});

	it('returns a dash for a zero-month new loan', () => {
		expect(run({ newMonths: '0' }).primaryResult).toBe('—');
	});
});
