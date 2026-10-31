import { beforeEach, describe, expect, it } from 'vitest';
import calc from './lumpsum-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('lumpsum calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('matches Bajaj AMC’s example: ₹1,00,000 for 5 years at 12%', () => {
		// Bajaj AMC states "approximately ₹1.76 lakh"; 1,00,000 × 1.12^5 = 1,76,234.17
		const r = run({ amount: '100000', rate: '12', years: '5' });
		expect(r.primaryResult).toBe('₹1,76,234');
		expect(metric(r, 'Estimated gain')).toBe('₹76,234');
		expect(metric(r, 'Growth multiple')).toBe('1.76×');
	});

	it('matches Bajaj AMC’s calculator output: ₹20,000 for 10 years at 12% gives ₹62,117', () => {
		// 20,000 × 1.12^10 = 62,116.96
		expect(run({ amount: '20000', rate: '12', years: '10' }).primaryResult).toBe('₹62,117');
	});

	it('compounds once a year, so year 1 is exactly principal × 1.12', () => {
		const r = run({ amount: '100000', rate: '12', years: '10' });
		expect(r.primaryResult).toBe('₹3,10,585');
		expect(r.table?.rows[0].value).toBe('₹1,12,000');
		expect(r.table?.rows[9].value).toBe('₹3,10,585');
	});

	it('handles a 0% return: the value equals the amount invested', () => {
		const r = run({ amount: '50000', rate: '0', years: '3' });
		expect(r.primaryResult).toBe('₹50,000');
		expect(metric(r, 'Estimated gain')).toBe('₹0');
	});

	it('handles very large values in crore grouping', () => {
		// ₹1 crore at 10% for 25 years: 1,00,00,000 × 1.1^25 = 10,83,47,059.4
		const r = run({ amount: '10000000', rate: '10', years: '25' });
		expect(r.primaryResult).toBe('₹10,83,47,059');
		expect(metric(r, 'Estimated gain')).toBe('₹9,83,47,059');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ amount: '100000', years: '0' }).primaryResult).toBe('—');
		expect(run({ amount: '0' }).primaryResult).toBe('—');
	});
});
