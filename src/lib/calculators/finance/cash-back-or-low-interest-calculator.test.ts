import { describe, expect, it } from 'vitest';
import calc from './cash-back-or-low-interest-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('cash back or low interest calculator', () => {
	it('matches the worked example: $35,000 car, $2,000 rebate, 1.9% vs 6.5%', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,649.70');
		expect(r.secondaryMetrics?.[0].value).toBe('$586.98');
		expect(r.secondaryMetrics?.[1].value).toBe('$559.49');
		expect(r.secondaryMetrics?.[2].value).toBe('$38,219.07');
		expect(r.secondaryMetrics?.[3].value).toBe('$36,569.37');
		expect(r.secondaryMetrics?.[4].value).toBe('Low APR');
	});

	it('picks cash back when the rebate beats a 0% dealer rate', () => {
		// Cash back loan 27,000 at 0% = 450 × 60; low APR loan 30,000 at 0% = 500 × 60
		const r = run({ price: '30000', rebate: '3000', lowApr: '0', bankApr: '0', term: '60', down: '0' });
		expect(r.primaryResult).toBe('$3,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$27,000.00');
		expect(r.secondaryMetrics?.[4].value).toBe('Cash back');
	});

	it('matches a known 12-month case at 0% dealer rate', () => {
		// Cash back loan 19,000 at 12% = 1,688.13 a month; low APR loan 20,000 at 0% = 1,666.67
		const r = run({ price: '20000', rebate: '1000', lowApr: '0', bankApr: '12', term: '12', down: '0' });
		expect(r.secondaryMetrics?.[0].value).toBe('$1,688.13');
		expect(r.secondaryMetrics?.[1].value).toBe('$1,666.67');
		expect(r.primaryResult).toBe('$257.52');
		expect(r.secondaryMetrics?.[4].value).toBe('Low APR');
	});

	it('reports a tie when the rebate is zero and both rates are the same', () => {
		const r = run({ rebate: '0', lowApr: '6', bankApr: '6' });
		expect(r.primaryResult).toBe('$0.00');
		expect(r.secondaryMetrics?.[4].value).toBe('Same cost');
	});

	it('returns a dash when the rebate is larger than the price less the down payment', () => {
		expect(run({ price: '20000', rebate: '25000' }).primaryResult).toBe('—');
	});

	it('returns a dash for a non-numeric term', () => {
		expect(run({ term: 'abc' }).primaryResult).toBe('—');
	});
});
