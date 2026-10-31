import { describe, expect, it } from 'vitest';
import calc from './payment-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('payment calculator, fixed term', () => {
	it('matches the worked example: $250,000 at 6.5% over 30 years', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,580.17');
		expect(metric(r, 'Total paid')).toBe('$568,861.22');
		expect(metric(r, 'Total interest')).toBe('$318,861.22');
		expect(metric(r, 'Number of payments')).toBe('360 payments');
	});

	it('finds the payment for a 15-year term, checked by bisection', () => {
		// $200,000 at 5% over 180 payments: 1,581.5873 per month, interest 84,685.71
		const r = run({ amount: '200000', rate: '5', years: '15' });
		expect(r.primaryResult).toBe('$1,581.59');
		expect(metric(r, 'Total interest')).toBe('$84,685.71');
	});

	it('divides evenly at a 0% rate', () => {
		expect(run({ amount: '12000', rate: '0', years: '1' }).primaryResult).toBe('$1,000.00');
	});

	it('returns a dash for an empty term', () => {
		expect(run({ years: '' }).primaryResult).toBe('—');
	});
});

describe('payment calculator, fixed payment', () => {
	it('finds the months to pay off, rounding up to a whole payment', () => {
		// $100,000 at 6% with $800 a month: 196.66 exact, so 197 payments; final payment 525.14
		const r = run({ mode: 'payment', amount: '100000', rate: '6', payment: '800' });
		expect(r.primaryResult).toBe('197 months');
		expect(metric(r, 'Final payment')).toBe('$525.14');
		expect(metric(r, 'Total paid')).toBe('$157,325.14');
		expect(metric(r, 'Total interest')).toBe('$57,325.14');
	});

	it('counts payments exactly at a 0% rate', () => {
		expect(run({ mode: 'payment', amount: '12000', rate: '0', payment: '1000' }).primaryResult).toBe('12 months');
	});

	it('returns a dash when the payment only covers interest', () => {
		// $100,000 at 6% charges $500 interest a month, so a $500 payment never reduces the balance
		const r = run({ mode: 'payment', amount: '100000', rate: '6', payment: '500' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/never goes down/);
	});

	it('returns a dash when the payment is below the monthly interest', () => {
		expect(run({ mode: 'payment', amount: '100000', rate: '6', payment: '400' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty payment', () => {
		expect(run({ mode: 'payment', payment: '' }).primaryResult).toBe('—');
	});
});
