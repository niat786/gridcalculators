import { beforeEach, describe, expect, it } from 'vitest';
import calc from './sip-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('SIP calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('matches the standard example: ₹10,000 a month, 12% a year, 10 years', () => {
		// Hand check: i = 0.01, n = 120, FV = 10000 × ((1.01^120 − 1)/0.01) × 1.01 = 23,23,390.76
		const r = run({ monthly: '10000', rate: '12', years: '10' });
		expect(r.primaryResult).toBe('₹23,23,391');
		expect(metric(r, 'Amount invested')).toBe('₹12,00,000');
		expect(metric(r, 'Estimated returns')).toBe('₹11,23,391');
		expect(metric(r, 'Number of instalments')).toBe('120 instalments');
	});

	it('matches Bajaj AMC’s published example: ₹15,000 a month, 12%, 15 years', () => {
		// Bajaj AMC knowledge centre states the corpus is ₹75,68,640 (formula evaluated: 75,68,639.99)
		const r = run({ monthly: '15000', rate: '12', years: '15' });
		expect(r.primaryResult).toBe('₹75,68,640');
		expect(metric(r, 'Amount invested')).toBe('₹27,00,000');
	});

	it('uses the year-by-year table and it ends at the maturity value', () => {
		// ₹5,000 a month, 12%, 5 years: 5000 × ((1.01^60 − 1)/0.01) × 1.01 = 4,12,431.83
		const r = run({ monthly: '5000', rate: '12', years: '5' });
		expect(r.primaryResult).toBe('₹4,12,432');
		expect(r.table?.rows).toHaveLength(5);
		expect(r.table?.rows[4].value).toBe('₹4,12,432');
		expect(r.table?.rows[0].invested).toBe('₹60,000');
	});

	it('handles a 0% return: maturity is just the amount invested', () => {
		const r = run({ monthly: '10000', rate: '0', years: '2' });
		expect(r.primaryResult).toBe('₹2,40,000');
		expect(metric(r, 'Estimated returns')).toBe('₹0');
	});

	it('handles very large values in lakh and crore grouping', () => {
		// ₹10 lakh a month, 12%, 30 years. FV = 3,52,99,13,774 (hand formula)
		const r = run({ monthly: '1000000', rate: '12', years: '30' });
		expect(r.primaryResult).toBe('₹3,52,99,13,774');
		expect(metric(r, 'Amount invested')).toBe('₹36,00,00,000');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ monthly: '' }).primaryResult).toBe('—');
		expect(run({ monthly: '10000', years: '0' }).primaryResult).toBe('—');
		expect(run({ monthly: '10000', rate: '-1' }).primaryResult).toBe('—');
	});
});
