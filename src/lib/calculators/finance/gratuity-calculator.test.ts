import { beforeEach, describe, expect, it } from 'vitest';
import calc from './gratuity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values: wages x 15 / 26 x years, computed by hand / node (50000*15/26 = 28,846.1538...).
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

describe('gratuity calculator (India)', () => {
	it('10 years 7 months rounds up to 11: 50,000 x 15 / 26 x 11 = 3,17,307.69', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹3,17,307.69');
		expect(metric(r, 'Years counted')).toBe('11');
		expect(metric(r, 'Taxable part')).toBe('₹0.00');
	});
	it('exactly 6 extra months does not round up (needs MORE than six months)', () => {
		expect(run({ months: '6' }).primaryResult).toBe('₹2,88,461.54');
	});
	it('not covered uses 15/30 on completed years: 30,000 x 12 / 2 = 1,80,000', () => {
		expect(run({ wages: '30000', years: '12', months: '8', coverage: 'not' }).primaryResult).toBe('₹1,80,000.00');
	});
	it('payable is capped at 20 lakh', () => {
		const r = run({ wages: '200000', years: '40', months: '0' });
		expect(r.primaryResult).toBe('₹20,00,000.00');
	});
	it('received above the limit leaves the excess taxable', () => {
		const r = run({ wages: '200000', years: '40', months: '0', received: '2500000' });
		expect(metric(r, 'Tax-free part')).toBe('₹20,00,000.00');
		expect(metric(r, 'Taxable part')).toBe('₹5,00,000.00');
	});
	it('under 5 years is not eligible, but death waives it and fixed-term needs 1 year', () => {
		expect(run({ years: '4', months: '11' }).primaryResult).toBe('₹0.00');
		expect(run({ years: '2', months: '0', death: true }).primaryResult).toBe('₹57,692.31');
		expect(run({ years: '1', months: '0', employment: 'fixed' }).primaryResult).toBe('₹28,846.15');
	});
	it('invalid input returns a dash', () => {
		expect(run({ wages: '' }).primaryResult).toBe('—');
		expect(run({ years: '0', months: '0' }).primaryResult).toBe('—');
		expect(run({ months: '12' }).primaryResult).toBe('—');
	});
});
