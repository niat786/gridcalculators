import { beforeEach, describe, expect, it } from 'vitest';
import calc from './fd-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

// Reference values: A = P(1 + r/n)^(nt) evaluated independently in node.
describe('FD calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('defaults / worked example: ₹1,00,000, 7%, 5 years, quarterly', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹1,41,477.82');
		expect(metric(r, 'Interest earned')).toBe('₹41,477.82');
		expect(metric(r, 'Effective yearly return')).toBe('7.186%');
	});

	it('monthly, half-yearly and yearly compounding', () => {
		expect(run({ compounding: 'monthly' }).primaryResult).toBe('₹1,41,762.53');
		expect(run({ compounding: 'halfyearly' }).primaryResult).toBe('₹1,41,059.88');
		expect(run({ compounding: 'yearly' }).primaryResult).toBe('₹1,40,255.17');
	});

	it('simple interest: 1,00,000 × (1 + 0.07 × 5) = 1,35,000', () => {
		const r = run({ compounding: 'simple' });
		expect(r.primaryResult).toBe('₹1,35,000.00');
		expect(metric(r, 'Effective yearly return')).toBe('7%');
	});

	it('tenure with years, months and days: 3y 6m 15d, ₹2,50,000 at 6.5% quarterly', () => {
		// t = 3.5 + 15/365
		expect(run({ deposit: '250000', rate: '6.5', years: '3', months: '6', days: '15' }).primaryResult).toBe('₹3,14,122.18');
	});

	it('months only: 18 months equals 1.5 years', () => {
		// 100000 × 1.0175^6
		expect(run({ years: '0', months: '18' }).primaryResult).toBe('₹1,10,970.24');
	});

	it('senior citizen extra rate is added and editable', () => {
		// 7% + 0.5% = 7.5% for 1 year quarterly
		expect(run({ years: '1', senior: true, extra: '0.5' }).primaryResult).toBe('₹1,07,713.59');
		// extra field is ignored when the toggle is off
		expect(run({ years: '1', senior: false, extra: '3' }).primaryResult).toBe('₹1,07,185.90');
	});

	it('zero rate returns the deposit', () => {
		expect(run({ rate: '0' }).primaryResult).toBe('₹1,00,000.00');
	});

	it('invalid input gives a dash', () => {
		expect(run({ deposit: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
		expect(run({ years: '0', months: '0', days: '0' }).primaryResult).toBe('—');
		expect(run({ years: '31' }).primaryResult).toBe('—');
		expect(run({ days: '1.5' }).primaryResult).toBe('—');
	});
});
