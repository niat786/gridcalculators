import { describe, expect, it } from 'vitest';
import calc from './salary-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const cell = (r: ReturnType<typeof run>, period: string, col: 'unadjusted' | 'adjusted') =>
	r.table?.rows.find((row) => row.period === period)?.[col];

describe('salary calculator', () => {
	it('matches the worked example: $25 an hour, 40 hours, 5 days, no days off', () => {
		// 25 × 40 × 52 = 52,000; monthly 52,000 ÷ 12 = 4,333.33
		const r = run();
		expect(r.primaryResult).toBe('$52,000.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$25.00');
		expect(r.secondaryMetrics?.[2].value).toBe('260');
		expect(cell(r, 'Monthly', 'unadjusted')).toBe('$4,333.33');
		expect(cell(r, 'Weekly', 'unadjusted')).toBe('$1,000.00');
	});

	it('removes 10 unpaid days off from $25 an hour', () => {
		// 52,000 × 250 ÷ 260 = 50,000.00
		const r = run({ off: '10' });
		expect(r.primaryResult).toBe('$52,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$50,000.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$2,000.00');
		expect(cell(r, 'Annual', 'adjusted')).toBe('$50,000.00');
	});

	it('converts an annual salary of $60,000 with 37.5 hours, 5 days and 15 days off', () => {
		// Hourly = 60,000 ÷ (37.5 × 52) = 30.77; adjusted = 60,000 × 245 ÷ 260 = 56,538.46
		const r = run({ amount: '60000', period: 'annual', hours: '37.5', off: '15' });
		expect(r.primaryResult).toBe('$60,000.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$30.77');
		expect(r.secondaryMetrics?.[1].value).toBe('$56,538.46');
		expect(r.secondaryMetrics?.[2].value).toBe('245');
	});

	it('scales bi-weekly and monthly pay to the same annual figure', () => {
		// 2,000 × 26 = 52,000; 4,500 × 12 = 54,000
		expect(run({ amount: '2000', period: 'biweekly' }).primaryResult).toBe('$52,000.00');
		expect(run({ amount: '4500', period: 'monthly' }).primaryResult).toBe('$54,000.00');
	});

	it('returns a dash for zero working hours', () => {
		expect(run({ hours: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when there is no pay amount', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
	});
});
