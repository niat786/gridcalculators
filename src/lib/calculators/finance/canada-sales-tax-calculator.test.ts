import { beforeEach, describe, expect, it } from 'vitest';
import calc from './canada-sales-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Rates from the CRA GST/HST calculator page; amounts worked out by hand.
describe('canada sales tax calculator', () => {
	it('matches the worked example: $200 in Quebec', () => {
		const r = run({ province: 'QC', amount: '200' });
		expect(r.primaryResult).toBe('CA$229.95');
		expect(metric(r, 'GST (5%)')).toBe('CA$10.00');
		expect(metric(r, 'QST (9.975%)')).toBe('CA$19.95');
		expect(metric(r, 'Combined rate')).toBe('14.975%');
	});

	it('HST provinces: Ontario 13%, Nova Scotia 14%, Atlantic 15%', () => {
		expect(run({ province: 'ON', amount: '100' }).primaryResult).toBe('CA$113.00');
		expect(run({ province: 'NS', amount: '100' }).primaryResult).toBe('CA$114.00');
		expect(run({ province: 'NB', amount: '100' }).primaryResult).toBe('CA$115.00');
		const ns = run({ province: 'NS', amount: '100' });
		expect(metric(ns, 'Federal part of HST (5%)')).toBe('CA$5.00');
		expect(metric(ns, 'Provincial part of HST (9%)')).toBe('CA$9.00');
	});

	it('PST provinces and GST-only territories', () => {
		expect(run({ province: 'BC', amount: '1000' }).primaryResult).toBe('CA$1,120.00');
		expect(run({ province: 'SK', amount: '1000' }).primaryResult).toBe('CA$1,110.00');
		expect(run({ province: 'MB', amount: '1000' }).primaryResult).toBe('CA$1,120.00');
		expect(run({ province: 'AB', amount: '1000' }).primaryResult).toBe('CA$1,050.00');
		expect(run({ province: 'AB', amount: '1000' }).secondaryMetrics?.length).toBe(4);
	});

	it('removing tax returns the pre-tax price', () => {
		const r = run({ province: 'QC', mode: 'remove', amount: '229.95' });
		expect(r.primaryResult).toBe('CA$200.00');
		expect(metric(r, 'Total tax')).toBe('CA$29.95');
		expect(run({ province: 'NS', mode: 'remove', amount: '114' }).primaryResult).toBe('CA$100.00');
		expect(run({ province: 'ON', mode: 'remove', amount: '113' }).primaryResult).toBe('CA$100.00');
	});

	it('zero is allowed; invalid input returns a dash', () => {
		expect(run({ amount: '0' }).primaryResult).toBe('CA$0.00');
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ amount: '-5' }).primaryResult).toBe('—');
	});
});
