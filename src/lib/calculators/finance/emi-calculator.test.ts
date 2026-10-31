import { beforeEach, describe, expect, it } from 'vitest';
import calc from './emi-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('EMI calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('matches the standard example: ₹10,00,000 at 10% for 20 years', () => {
		// Independent check (node): r = 0.10/12, n = 240, EMI = 9,650.2165, total interest 13,16,051.95
		const r = run({ loan: '1000000', rate: '10', tenure: '20', unit: 'years' });
		expect(r.primaryResult).toBe('₹9,650.22');
		expect(metric(r, 'Total interest')).toBe('₹13,16,052');
		expect(metric(r, 'Total payment')).toBe('₹23,16,052');
		expect(metric(r, 'Number of payments')).toBe('240 monthly payments');
	});

	it('matches a 60-month loan: ₹10,00,000 at 10% for 60 months', () => {
		// Independent check (node): EMI = 21,247.0447, total interest = 2,74,822.68
		const r = run({ loan: '1000000', rate: '10', tenure: '60', unit: 'months' });
		expect(r.primaryResult).toBe('₹21,247.04');
		expect(metric(r, 'Total interest')).toBe('₹2,74,823');
		expect(metric(r, 'Total payment')).toBe('₹12,74,823');
	});

	it('treats 5 years and 60 months as the same loan', () => {
		const years = run({ loan: '1000000', rate: '10', tenure: '5', unit: 'years' });
		const months = run({ loan: '1000000', rate: '10', tenure: '60', unit: 'months' });
		expect(years.primaryResult).toBe(months.primaryResult);
		expect(metric(years, 'Total interest')).toBe(metric(months, 'Total interest'));
	});

	it('uses P ÷ n when the rate is 0%', () => {
		// ₹12,00,000 over 120 months = ₹10,000 a month, no interest
		const r = run({ loan: '1200000', rate: '0', tenure: '10', unit: 'years' });
		expect(r.primaryResult).toBe('₹10,000.00');
		expect(metric(r, 'Total interest')).toBe('₹0');
		expect(metric(r, 'Total payment')).toBe('₹12,00,000');
	});

	it('handles a very large loan in crore grouping', () => {
		// ₹100 crore at 8.5% for 30 years: independent EMI = 76,89,134.84, total interest = 1,76,80,88,540.90
		const r = run({ loan: '1000000000', rate: '8.5', tenure: '30', unit: 'years' });
		expect(r.primaryResult).toBe('₹76,89,134.84');
		expect(metric(r, 'Total interest')).toBe('₹1,76,80,88,541');
	});

	it('the yearly schedule closes at zero', () => {
		const r = run({ loan: '1000000', rate: '10', tenure: '20', unit: 'years' });
		expect(r.table?.rows).toHaveLength(20);
		expect(r.table?.rows[19].balance).toBe('₹0');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ loan: '' }).primaryResult).toBe('—');
		expect(run({ loan: '1000000', tenure: '0' }).primaryResult).toBe('—');
		expect(run({ loan: '1000000', tenure: '51', unit: 'years' }).primaryResult).toBe('—');
	});
});
