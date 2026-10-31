import { beforeEach, describe, expect, it } from 'vitest';
import calc from './kenya-paye-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { keBandTax, keNssf, keShif } from '../data/ke-2026';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const K = (s: string) => `KES ${s}`;

beforeEach(() => setCurrency('KES'));

// Expected values were worked out separately with node from the KRA bands, NSSF Year 4, SHIF and housing levy rules.
describe('kenya paye calculator', () => {
	it('matches the worked example: KES 100,000 a month', () => {
		const r = run({ gross: '100000' });
		expect(r.primaryResult).toBe(K('70,441.65'));
		expect(metric(r, 'NSSF (employee, Year 4)')).toBe(K('6,000.00'));
		expect(metric(r, 'SHIF (2.75%)')).toBe(K('2,750.00'));
		expect(metric(r, 'Affordable Housing Levy (1.5%)')).toBe(K('1,500.00'));
		expect(metric(r, 'Taxable pay')).toBe(K('89,750.00'));
		expect(metric(r, 'PAYE (after personal relief)')).toBe(K('19,308.35'));
	});

	it('caps NSSF at the upper earnings limit', () => {
		const r = run({ gross: '200000' });
		expect(metric(r, 'NSSF (employee, Year 4)')).toBe(K('6,480.00'));
		expect(metric(r, 'PAYE (after personal relief)')).toBe(K('47,889.35'));
		expect(r.primaryResult).toBe(K('137,130.65'));
		expect(run({ gross: '108000' }).primaryResult).toBe(K('75,467.65'));
		expect(run({ gross: '600000' }).primaryResult).toBe(K('403,530.15'));
		expect(run({ gross: '1000000' }).primaryResult).toBe(K('658,279.65'));
	});

	it('personal relief removes PAYE on low pay; SHIF has a KES 300 minimum', () => {
		const low = run({ gross: '26000' });
		expect(metric(low, 'PAYE (after personal relief)')).toBe(K('0.00'));
		expect(low.primaryResult).toBe(K('23,335.00'));
		const tiny = run({ gross: '8000' });
		expect(metric(tiny, 'SHIF (2.75%)')).toBe(K('300.00'));
		expect(tiny.primaryResult).toBe(K('7,100.00'));
		expect(run({ gross: '9000' }).primaryResult).toBe(K('8,025.00'));
		expect(run({ gross: '50000' }).primaryResult).toBe(K('39,029.15'));
	});

	it('band tax is right at every band edge (before relief)', () => {
		expect(keBandTax(24000).tax).toBeCloseTo(2400, 6);
		expect(keBandTax(24001).tax).toBeCloseTo(2400.25, 6);
		expect(keBandTax(32333).tax).toBeCloseTo(4483.25, 6);
		expect(keBandTax(500000).tax).toBeCloseTo(144783.35, 6);
		expect(keBandTax(500001).tax).toBeCloseTo(144783.675, 6);
		expect(keBandTax(800000).tax).toBeCloseTo(242283.35, 6);
		expect(keBandTax(1000000).tax).toBeCloseTo(312283.35, 6);
		expect(keBandTax(800001).marginalRate).toBe(0.35);
		expect(keBandTax(500000).marginalRate).toBe(0.3);
	});

	it('NSSF tiers and SHIF helper values', () => {
		expect(keNssf(9000).total).toBeCloseTo(540, 6);
		expect(keNssf(108000).total).toBeCloseTo(6480, 6);
		expect(keNssf(500000).total).toBeCloseTo(6480, 6);
		expect(keShif(10000)).toBe(300);
		expect(keShif(100000)).toBeCloseTo(2750, 6);
	});

	it('returns a dash for invalid input', () => {
		expect(run({ gross: '0' }).primaryResult).toBe('—');
		expect(run({ gross: '' }).primaryResult).toBe('—');
		expect(run({ gross: '-100' }).primaryResult).toBe('—');
	});
});
