import { describe, expect, it } from 'vitest';
import calc from './rent-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('rent calculator', () => {
	it('matches the worked example: $75,000 income and $400 of debts', () => {
		// 75,000 ÷ 12 = 6,250; 30% = 1,875.00; 36% = 2,250 − 400 = 1,850.00 (safest)
		const r = run();
		expect(r.primaryResult).toBe('$1,875.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$1,850.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,850.00');
		expect(r.secondaryMetrics?.[3].value).toBe('6.4%');
	});

	it('uses the 30% figure when there are no debts', () => {
		// 60,000 ÷ 12 = 5,000; 30% = 1,500; 36% = 1,800 (above 1,500, so 30% is the limit)
		const r = run({ income: '60000', debts: '0' });
		expect(r.primaryResult).toBe('$1,500.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,500.00');
	});

	it('uses the debt limit when debts are high', () => {
		// 48,000 ÷ 12 = 4,000; 36% = 1,440 − 600 = 840 (below 30% of 1,200)
		const r = run({ income: '48000', debts: '600' });
		expect(r.primaryResult).toBe('$1,200.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$840.00');
		expect(r.summary).toContain('debt limit');
	});

	it('income needed for $2,500 rent is $100,000 a year (the 40× rule)', () => {
		// 2,500 ÷ 0.30 = 8,333.33 a month; × 12 = 100,000; 40 × 2,500 = 100,000
		const r = run({ mode: 'needed', rent: '2500' });
		expect(r.primaryResult).toBe('$100,000.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$8,333.33');
		expect(r.secondaryMetrics?.[1].value).toBe('$100,000.00');
	});

	it('returns a dash for a negative income', () => {
		expect(run({ income: '-5' }).primaryResult).toBe('—');
	});

	it('returns a dash when no rent is entered for income needed', () => {
		expect(run({ mode: 'needed', rent: '' }).primaryResult).toBe('—');
	});
});
