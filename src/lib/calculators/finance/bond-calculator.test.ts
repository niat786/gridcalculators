import { describe, expect, it } from 'vitest';
import calc from './bond-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('bond calculator', () => {
	it('matches the worked example: $1,000, 5% coupon, 6% yield, 10 years, semiannual', () => {
		const r = run();
		expect(r.primaryResult).toBe('$925.61');
		expect(r.secondaryMetrics?.[2].value).toBe('$371.94');
		expect(r.secondaryMetrics?.[3].value).toBe('$553.68');
		expect(r.secondaryMetrics?.[4].value).toBe('5.40%');
		expect(r.secondaryMetrics?.[5].value).toBe('At a discount');
	});

	it('trades at par when the coupon equals the yield', () => {
		const r = run({ coupon: '6', ytm: '6', years: '10', freq: '2' });
		expect(r.primaryResult).toBe('$1,000.00');
		expect(r.summary).toMatch(/par/);
	});

	it('trades at a premium when the coupon is above the yield: 8% coupon, 6% yield', () => {
		const r = run({ coupon: '8', ytm: '6', years: '10', freq: '2' });
		expect(r.primaryResult).toBe('$1,148.77');
		expect(r.secondaryMetrics?.[5].value).toBe('At a premium');
	});

	it('quarterly discount: 3% coupon, 6% yield, 5 years, paid four times a year', () => {
		expect(run({ coupon: '3', ytm: '6', years: '5', freq: '4' }).primaryResult).toBe('$871.24');
	});

	it('zero yield: the price is the sum of all coupons plus face value', () => {
		// 10 × $50 + $1,000 = $1,500
		expect(run({ coupon: '5', ytm: '0', years: '10', freq: '1' }).primaryResult).toBe('$1,500.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ years: '0' }).primaryResult).toBe('—');
	});
});
