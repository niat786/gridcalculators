import { beforeEach, describe, expect, it } from 'vitest';
import calc from './hra-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Hand-computed: exempt = min(HRA, rent - 10% basic, 50%/40% basic), per rule 279.
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

describe('hra calculator', () => {
	it('matches the worked example (metro): 13,000 exempt, 7,000 taxable', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹13,000');
		expect(metric(r, 'Taxable HRA per month')).toBe('₹7,000');
		expect(metric(r, 'HRA exemption for 12 months')).toBe('₹1,56,000');
	});
	it('non-metro uses 40%: basic 30,000 HRA 15,000 rent 20,000 -> min(15000, 17000, 12000) = 12,000', () => {
		const r = run({ basic: '30000', hra: '15000', rent: '20000', city: 'other' });
		expect(r.primaryResult).toBe('₹12,000');
		expect(metric(r, 'Taxable HRA per month')).toBe('₹3,000');
	});
	it('HRA received is the least: basic 60,000 HRA 10,000 rent 40,000 metro -> 10,000', () => {
		const r = run({ basic: '60000', hra: '10000', rent: '40000' });
		expect(r.primaryResult).toBe('₹10,000');
		expect(metric(r, 'Taxable HRA per month')).toBe('₹0');
	});
	it('rent below 10% of basic gives no exemption', () => {
		expect(run({ rent: '4000' }).primaryResult).toBe('₹0');
		expect(run({ rent: '5000' }).primaryResult).toBe('₹0');
	});
	it('part-year rent: 6 months', () => {
		expect(metric(run({ months: '6' }), 'HRA exemption for 6 months')).toBe('₹78,000');
	});
	it('invalid input returns a dash', () => {
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ months: '13' }).primaryResult).toBe('—');
	});
});
