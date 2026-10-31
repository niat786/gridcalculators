import { describe, expect, it } from 'vitest';
import calc from './annuity-payout-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('annuity payout calculator', () => {
	it('payout amount: $500,000 at 5% over 25 years is $2,922.95 a month', () => {
		const r = run();
		expect(r.primaryResult).toBe('$2,922.95');
		expect(r.secondaryMetrics?.[0].value).toBe('300');
		expect(r.secondaryMetrics?.[1].value).toBe('$876,885.06');
		expect(r.secondaryMetrics?.[2].value).toBe('$376,885.06');
	});

	it('how long it lasts: $500,000 at 5% with $3,000 a month lasts 23 years, 9 months', () => {
		const r = run({ mode: 'length', payout: '3000' });
		expect(r.primaryResult).toBe('23 years, 9 months');
		expect(r.secondaryMetrics?.[2].value).toBe('$427.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$855,427.00');
	});

	it('zero rate: $12,000 paid out at $1,000 a month in the amount mode', () => {
		const r = run({ principal: '12000', rate: '0', years: '1' });
		expect(r.primaryResult).toBe('$1,000.00');
	});

	it('zero rate: $12,000 at $1,000 a month lasts exactly 1 year', () => {
		const r = run({ mode: 'length', principal: '12000', rate: '0', payout: '1000' });
		expect(r.primaryResult).toBe('1 year');
	});

	it('never runs out when the payout is below the monthly interest', () => {
		// 100,000 × 5% ÷ 12 = 416.67 interest a month, which is more than a $300 payout
		const r = run({ mode: 'length', principal: '100000', rate: '5', payout: '300' });
		expect(r.primaryResult).toBe('Never runs out');
		expect(r.secondaryMetrics?.[2].value).toBe('$118,116.27');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ principal: '' }).primaryResult).toBe('—');
		expect(run({ mode: 'length', payout: 'abc' }).primaryResult).toBe('—');
	});
});
