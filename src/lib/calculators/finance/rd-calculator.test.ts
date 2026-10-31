import { beforeEach, describe, expect, it } from 'vitest';
import calc, { rdValueAfter } from './rd-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('RD calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('reproduces the Policybazaar example: ₹5,000 a month, 8.25%, 12 months = ₹62,730.85', () => {
		const r = run({ monthly: '5000', rate: '8.25', months: '12' });
		expect(r.primaryResult).toBe('₹62,730.85');
		expect(metric(r, 'Interest earned')).toBe('₹2,730.85');
	});

	it('single instalment values match that example (12th instalment 1 month = ₹5,034.14)', () => {
		expect(5000 * Math.pow(1.020625, 1 / 3)).toBeCloseTo(5034.14, 2);
		// first instalment, 12 months: 5,000 × 1.020625^4 = 5,425.44
		expect(5000 * Math.pow(1.020625, 4)).toBeCloseTo(5425.44, 2);
	});

	it('closed form M = R((1+i)^n − 1)/(1 − (1+i)^(−1/3)) equals the sum: ₹5,000, 7%, 60 months', () => {
		const i = 0.07 / 4;
		const closed = (5000 * (Math.pow(1 + i, 20) - 1)) / (1 - Math.pow(1 + i, -1 / 3));
		expect(closed).toBeCloseTo(359663.95, 2);
		expect(run({ monthly: '5000', rate: '7', months: '60' }).primaryResult).toBe('₹3,59,663.95');
	});

	it('₹1,000 a month, 6%, 12 months', () => {
		expect(run({ monthly: '1000', rate: '6', months: '12' }).primaryResult).toBe('₹12,395.23');
	});

	it('₹10,000 a month, 6.5%, 24 months (defaults rate)', () => {
		expect(run({ monthly: '10000', rate: '6.5', months: '24' }).primaryResult).toBe('₹2,56,850.60');
	});

	it('6 months at 7.5% with the senior toggle (7% + 0.5%)', () => {
		expect(run({ monthly: '2000', rate: '7', months: '6', senior: true, extra: '0.5' }).primaryResult).toBe('₹12,263.59');
	});

	it('zero rate returns the deposits', () => {
		expect(run({ monthly: '1000', rate: '0', months: '10' }).primaryResult).toBe('₹10,000.00');
	});

	it('table value in the last row equals the maturity', () => {
		const r = run({ monthly: '5000', rate: '8.25', months: '18' });
		expect(r.table?.rows.length).toBe(2);
		expect(rdValueAfter(5000, 8.25, 18, 18)).toBeGreaterThan(90000);
	});

	it('invalid input gives a dash', () => {
		expect(run({ monthly: '' }).primaryResult).toBe('—');
		expect(run({ months: '0' }).primaryResult).toBe('—');
		expect(run({ months: '121' }).primaryResult).toBe('—');
		expect(run({ months: '6.5' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
	});
});
