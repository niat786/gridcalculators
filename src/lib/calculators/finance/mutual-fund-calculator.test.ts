import { describe, expect, it } from 'vitest';
import calc from './mutual-fund-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const free = { monthly: '0', years: '10', gross: '7', expense: '0', front: '0', back: '0', initial: '10000' };

describe('mutual fund calculator', () => {
	it('matches the worked example: 10,000 start, 300 a month, 20 years, 7% gross, 0.75% expenses, 5.75% load', () => {
		const r = run();
		expect(r.primaryResult).toBe('$167,372.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$82,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$196,665.39');
		expect(r.secondaryMetrics?.[2].value).toBe('$15,525.44');
		expect(r.secondaryMetrics?.[3].value).toBe('$29,293.39');
		expect(r.secondaryMetrics?.[4].value).toBe('6.25%');
	});

	it('compounds 10,000 at 7% for 10 years with no fees to $20,096.61', () => {
		// 10,000 × (1 + 7 ÷ 1200)^120 = 20,096.61, so nothing is lost
		const r = run(free);
		expect(r.primaryResult).toBe('$20,096.61');
		expect(r.secondaryMetrics?.[2].value).toBe('$0.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$0.00');
	});

	it('takes 5% off a 10,000 purchase up front: 9,500 invested and 500 in fees', () => {
		const r = run({ ...free, years: '1', gross: '0', front: '5' });
		expect(r.primaryResult).toBe('$9,500.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$10,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$500.00');
	});

	it('takes a 10% back-end load from the final value of 10,000: 9,000 left and 1,000 in fees', () => {
		const r = run({ ...free, years: '1', gross: '0', back: '10' });
		expect(r.primaryResult).toBe('$9,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,000.00');
	});

	it('charges a 1% expense ratio on the balance: 10,000 falls to 9,900.46 over one year at 0% gross', () => {
		// (1 − 1 ÷ 1200)^12 × 10,000 = 9,900.46
		const r = run({ ...free, years: '1', gross: '0', expense: '1' });
		expect(r.primaryResult).toBe('$9,900.46');
		expect(r.secondaryMetrics?.[2].value).toBe('$99.54');
	});

	it('returns a dash when years is zero', () => {
		expect(run({ years: '0' }).primaryResult).toBe('—');
	});
});
