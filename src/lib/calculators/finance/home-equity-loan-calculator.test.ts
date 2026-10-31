import { describe, expect, it } from 'vitest';
import calc from './home-equity-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('home equity loan calculator', () => {
	it('matches the worked example: $400,000 home, $200,000 owed, $100,000 at 8% for 15 years', () => {
		const r = run({ value: '400000', balance: '200000', ltv: '85', amount: '100000', rate: '8', term: '15' });
		expect(r.primaryResult).toBe('$955.65');
		expect(metric(r, 'Home equity')).toBe('$200,000.00');
		expect(metric(r, 'Maximum combined loan (85% of value)')).toBe('$340,000.00');
		expect(metric(r, 'Available equity (maximum loan)')).toBe('$140,000.00');
		expect(metric(r, 'Total interest')).toBe('$72,017.38');
		expect(metric(r, 'Total of 180 payments')).toBe('$172,017.38');
		expect(r.summary).toBe('You can borrow up to $140,000.00 within a combined loan-to-value limit of 85%.');
	});

	it('warns when the wanted amount is above the maximum, but still shows the payment', () => {
		const r = run({ value: '400000', balance: '200000', ltv: '85', amount: '200000', rate: '8', term: '15' });
		expect(r.primaryResult).toBe('$1,911.30');
		expect(r.summary).toContain('Warning');
		expect(r.summary).toContain('$60,000.00 above your maximum');
		expect(r.summary).toContain('Lower it to $140,000.00 or less');
	});

	it('gives a second known answer at 6.5% over 20 years on a $500,000 home', () => {
		const r = run({ value: '500000', balance: '250000', ltv: '85', amount: '50000', rate: '6.5', term: '20' });
		expect(r.primaryResult).toBe('$372.79');
		expect(metric(r, 'Available equity (maximum loan)')).toBe('$175,000.00');
		expect(metric(r, 'Total interest')).toBe('$39,468.78');
	});

	it('returns a dash when the mortgage already exceeds the combined limit', () => {
		const r = run({ value: '300000', balance: '260000', ltv: '85', amount: '10000' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('no equity to borrow against');
	});

	it('returns a dash for a missing home value', () => {
		expect(run({ value: '' }).primaryResult).toBe('—');
	});
});
