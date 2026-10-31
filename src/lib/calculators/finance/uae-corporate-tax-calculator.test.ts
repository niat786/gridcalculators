import { beforeEach, describe, expect, it } from 'vitest';
import calc from './uae-corporate-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return {
		...r,
		primaryResult: r.primaryResult.replace(/ /g, ' '),
		metrics: (r.secondaryMetrics ?? []).map((m) => m.value.replace(/ /g, ' '))
	};
};

// Expected values are hand-computed: 9% x (taxable income - 375,000), never below zero.
// The AED 1,000,000 case reproduces the ClearTax UAE guide example (AED 56,250 = 9% of 625,000).
describe('UAE corporate tax calculator', () => {
	beforeEach(() => setCurrency('AED'));

	it('matches the worked example: AED 1,000,000 taxable income = AED 56,250', () => {
		const r = run({ income: '1000000' });
		expect(r.primaryResult).toBe('AED 56,250.00');
		expect(r.metrics[2]).toBe('5.63%');
	});

	it('0% at and below the AED 375,000 band', () => {
		expect(run({ income: '375000' }).primaryResult).toBe('AED 0.00');
		expect(run({ income: '100000' }).primaryResult).toBe('AED 0.00');
		expect(run({ income: '0' }).primaryResult).toBe('AED 0.00');
	});

	it('9% only on the part above the band: AED 375,001 pays AED 0.09', () => {
		expect(run({ income: '375001' }).primaryResult).toBe('AED 0.09');
	});

	it('very large income: AED 10,000,000 = 9% x 9,625,000 = 866,250', () => {
		expect(run({ income: '10000000' }).primaryResult).toBe('AED 866,250.00');
	});

	it('Small Business Relief: elected and eligible gives zero tax', () => {
		const r = run({ income: '800000', revenue: '2900000', elect: true });
		expect(r.primaryResult).toBe('AED 0.00');
		expect(r.metrics[3]).toContain('Elected');
	});

	it('Small Business Relief limits: AED 3,000,000 revenue is eligible, 3,000,001 is not', () => {
		expect(run({ income: '800000', revenue: '3000000', elect: true }).primaryResult).toBe('AED 0.00');
		// 9% x (800,000 - 375,000) = 38,250
		const r = run({ income: '800000', revenue: '3000001', elect: true });
		expect(r.primaryResult).toBe('AED 38,250.00');
		expect(r.metrics[3]).toContain('not eligible');
	});

	it('Small Business Relief runs to periods ending on or before 31 December 2029 only', () => {
		expect(run({ income: '800000', revenue: '1000000', elect: true, periodEnd: '2029-12-31' }).primaryResult).toBe('AED 0.00');
		expect(run({ income: '800000', revenue: '1000000', elect: true, periodEnd: '2030-12-31' }).primaryResult).toBe('AED 38,250.00');
	});

	it('Small Business Relief is refused for large groups and after an earlier high-revenue period', () => {
		expect(run({ income: '800000', revenue: '1000000', elect: true, mne: true }).primaryResult).toBe('AED 38,250.00');
		expect(run({ income: '800000', revenue: '1000000', elect: true, earlierOk: false }).primaryResult).toBe('AED 38,250.00');
	});

	it('eligible but not elected still pays tax and says so', () => {
		const r = run({ income: '800000', revenue: '1000000' });
		expect(r.primaryResult).toBe('AED 38,250.00');
		expect(r.metrics[3]).toContain('Eligible');
	});

	it('qualifying free zone person: 0% on qualifying income, 9% on non-qualifying with no band', () => {
		// 9% x 200,000 = 18,000
		const r = run({ status: 'qfzp', qualifying: '5000000', nonqualifying: '200000' });
		expect(r.primaryResult).toBe('AED 18,000.00');
		expect(r.metrics[0]).toBe('AED 5,200,000.00');
	});

	it('flags, but does not compute, the 15% top-up tax for large groups', () => {
		const r = run({ income: '1000000', mne: true });
		expect(r.primaryResult).toBe('AED 56,250.00');
		expect(r.metrics[4]).toContain('Not calculated');
	});

	it('rejects negative or blank input', () => {
		expect(run({ income: '-5' }).primaryResult).toBe('—');
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ status: 'qfzp', nonqualifying: '-1' }).primaryResult).toBe('—');
	});
});
