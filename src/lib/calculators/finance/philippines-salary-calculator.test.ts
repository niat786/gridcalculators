import { beforeEach, describe, expect, it } from 'vitest';
import calc from './philippines-salary-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently with a separate node script (SSS salary-credit bands, PhilHealth 5%
// with floor/ceiling, Pag-IBIG 2% of at most 10,000, annualised TRAIN table), not by calling the code under test.
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('PHP'));

describe('philippines salary calculator', () => {
	it('matches the worked example: basic 30,000', () => {
		const r = run();
		expect(r.primaryResult).toBe('₱26,542.50');
		expect(metric(r, 'SSS (employee share)')).toBe('₱1,500.00');
		expect(metric(r, 'PhilHealth (employee share)')).toBe('₱750.00');
		expect(metric(r, 'Pag-IBIG (employee share)')).toBe('₱200.00');
		expect(metric(r, 'Withholding tax per month')).toBe('₱1,007.50');
		expect(metric(r, 'Total deductions per month')).toBe('₱3,457.50');
		expect(metric(r, 'Tax on bonuses above the exemption')).toBe('₱0.00');
		expect(metric(r, 'Take-home for the year, bonuses included')).toBe('₱348,510.00');
	});

	it('basic 20,000: taxable pay is under 250,000 a year so no withholding tax', () => {
		const r = run({ basic: '20000' });
		expect(r.primaryResult).toBe('₱18,300.00');
		expect(metric(r, 'Withholding tax per month')).toBe('₱0.00');
	});

	it('basic 100,000: SSS and PhilHealth at their caps, 25% bracket', () => {
		const r = run({ basic: '100000' });
		expect(metric(r, 'SSS (employee share)')).toBe('₱1,750.00');
		expect(metric(r, 'PhilHealth (employee share)')).toBe('₱2,500.00');
		expect(metric(r, 'Withholding tax per month')).toBe('₱15,762.50');
		expect(r.primaryResult).toBe('₱79,787.50');
		// 13th month of 100,000 is 10,000 over the 90,000 exemption: 25% of it is 2,500 extra tax
		expect(metric(r, 'Tax on bonuses above the exemption')).toBe('₱2,500.00');
		expect(metric(r, 'Take-home for the year, bonuses included')).toBe('₱1,054,950.00');
	});

	it('PhilHealth floor and SSS minimum credit at 5,000; Pag-IBIG at 2%', () => {
		const r = run({ basic: '5000' });
		expect(metric(r, 'SSS (employee share)')).toBe('₱250.00');
		expect(metric(r, 'PhilHealth (employee share)')).toBe('₱250.00');
		expect(metric(r, 'Pag-IBIG (employee share)')).toBe('₱100.00');
		expect(r.primaryResult).toBe('₱4,400.00');
	});

	it('SSS salary credit steps at 5,250 (MSC 5,500) and Pag-IBIG is 1% at 1,500 or less', () => {
		expect(metric(run({ basic: '5250' }), 'SSS (employee share)')).toBe('₱275.00');
		expect(metric(run({ basic: '5249.99' }), 'SSS (employee share)')).toBe('₱250.00');
		expect(metric(run({ basic: '34750' }), 'SSS (employee share)')).toBe('₱1,750.00');
		expect(metric(run({ basic: '34749.99' }), 'SSS (employee share)')).toBe('₱1,725.00');
		expect(metric(run({ basic: '1500' }), 'Pag-IBIG (employee share)')).toBe('₱15.00');
		expect(metric(run({ basic: '1500.01' }), 'Pag-IBIG (employee share)')).toBe('₱30.00');
	});

	it('other bonuses: 30,000 13th month plus 100,000 gives 40,000 taxable, 6,000 extra tax', () => {
		const r = run({ bonus: '100000' });
		expect(metric(r, 'Tax on bonuses above the exemption')).toBe('₱6,000.00');
		expect(metric(r, 'Take-home for the year, bonuses included')).toBe('₱442,510.00');
		// 13th month off: the 100,000 other bonus is 10,000 over the limit, taxed at 15% (taxable pay stays in the 15% bracket)
		const off = run({ bonus: '100000', thirteenth: false });
		expect(metric(off, 'Tax on bonuses above the exemption')).toBe('₱1,500.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ basic: '0' }).primaryResult).toBe('—');
		expect(run({ bonus: '-5' }).primaryResult).toBe('—');
	});
});
