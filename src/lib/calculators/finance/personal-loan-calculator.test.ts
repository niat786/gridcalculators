import { describe, expect, it } from 'vitest';
import calc from './personal-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('personal loan calculator', () => {
	it('matches the worked example: $10,000 at 11.5% for 36 months with a 3% fee', () => {
		const r = run();
		expect(r.primaryResult).toBe('$329.76');
		expect(metric(r, 'Origination fee')).toBe('$300.00');
		expect(metric(r, 'Net amount received')).toBe('$9,700.00');
		expect(metric(r, 'Total interest')).toBe('$1,871.36');
		expect(metric(r, 'Total paid')).toBe('$11,871.36');
	});

	it('uses P ÷ n when the rate is 0%', () => {
		const r = run({ amount: '15000', rate: '0', months: '12', fee: '0' });
		expect(r.primaryResult).toBe('$1,250.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
		expect(metric(r, 'Net amount received')).toBe('$15,000.00');
	});

	it('solves a longer term independently', () => {
		// $25,000 at 8.5% for 84 months: payment 395.9121 (bisection check), interest 8,256.62
		const r = run({ amount: '25000', rate: '8.5', months: '84', fee: '0' });
		expect(r.primaryResult).toBe('$395.91');
		expect(metric(r, 'Total interest')).toBe('$8,256.62');
	});

	it('returns a dash for an empty amount or a zero-month term', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ months: '0' }).primaryResult).toBe('—');
	});
});
