import { describe, expect, it } from 'vitest';
import calc from './loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('loan calculator', () => {
	it('matches the worked example: $20,000 at 7% for 5 years', () => {
		const r = run({ amount: '20000', rate: '7', years: '5', months: '0' });
		expect(r.primaryResult).toBe('$396.02');
		expect(metric(r, 'Total interest')).toBe('$3,761.44');
		expect(metric(r, 'Total paid')).toBe('$23,761.44');
		expect(metric(r, 'Number of payments')).toBe('60 payments');
	});

	it('uses P ÷ n when the rate is 0%', () => {
		const r = run({ amount: '10000', rate: '0', years: '2', months: '0' });
		expect(r.primaryResult).toBe('$416.67');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('adds years and months together for the term', () => {
		// 1 year 6 months = 18 payments; independently solved by bisection: 693.3664
		const r = run({ amount: '12000', rate: '5', years: '1', months: '6' });
		expect(r.primaryResult).toBe('$693.37');
		expect(metric(r, 'Total interest')).toBe('$480.60');
		expect(metric(r, 'Loan term')).toBe('1 year 6 months');
	});

	it('handles a months-only term', () => {
		// 12 payments at 6%: 860.6643 per month, total interest 327.97
		const r = run({ amount: '10000', rate: '6', years: '0', months: '12' });
		expect(r.primaryResult).toBe('$860.66');
		expect(metric(r, 'Total interest')).toBe('$327.97');
	});

	it('closes the yearly schedule at zero', () => {
		const r = run({ amount: '20000', rate: '7', years: '5', months: '0' });
		expect(r.table?.rows).toHaveLength(5);
		expect(r.table?.rows[4].balance).toBe('$0');
	});

	it('returns a dash for an invalid amount or term', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ amount: '20000', years: '0', months: '0' }).primaryResult).toBe('—');
	});
});
