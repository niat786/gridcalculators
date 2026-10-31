import { beforeEach, describe, expect, it } from 'vitest';
import calc, { doublingMonths } from './kvp-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
beforeEach(() => setCurrency('INR'));

describe('KVP calculator', () => {
	it('7.5% doubles in 115 months (published figure) and the maths agrees', () => {
		// 12 x ln2 / ln1.075 = 115.012 months
		expect(doublingMonths(7.5)).toBeCloseTo(115.0123, 3);
		const r = run({ amount: '100000', rate: '7.5', months: '115', start: '2026-10-28' });
		expect(r.primaryResult).toBe('₹2,00,000.00');
		expect(metric(r, 'Maturity date')).toBe('28 May 2036');
		expect(metric(r, 'Time to double')).toBe('115 months (9 years 7 months)');
		expect(metric(r, 'Months to double at 7.5%, compounded yearly')).toBe('115');
	});
	it('other rates: 7.2% takes 119.6 months by the formula', () => {
		expect(doublingMonths(7.2)).toBeCloseTo(119.5, 0);
		expect(doublingMonths(10)).toBeCloseTo(87.3, 1);
		expect(doublingMonths(6.9)).toBeCloseTo(124.7, 0);
	});
	it('maturity is twice the amount for any amount', () => {
		expect(run({ amount: '1000' }).primaryResult).toBe('₹2,000.00');
		expect(run({ amount: '12345600' }).primaryResult).toBe('₹2,46,91,200.00');
	});
	it('maturity date clamps to month end', () => {
		expect(metric(run({ start: '2026-08-31', months: '12' }), 'Maturity date')).toBe('31 Aug 2027');
		expect(metric(run({ start: '2026-08-31', months: '18' }), 'Maturity date')).toBe('29 Feb 2028');
	});
	it('rejects invalid input', () => {
		expect(run({ amount: '950' }).primaryResult).toBe('—');
		expect(run({ amount: '1050' }).primaryResult).toBe('—');
		expect(run({ rate: '0' }).primaryResult).toBe('—');
		expect(run({ months: '11' }).primaryResult).toBe('—');
		expect(run({ months: '115.5' }).primaryResult).toBe('—');
		expect(run({ start: 'bad' }).primaryResult).toBe('—');
	});
});
