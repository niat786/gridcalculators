import { describe, expect, it } from 'vitest';
import calc from './auto-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('auto loan calculator', () => {
	it('matches the worked example: $35,000 car, 60 months at 6.9%', () => {
		const r = run();
		expect(r.primaryResult).toBe('$584.72');
		expect(metric(r, 'Loan amount')).toBe('$29,600.00');
		expect(metric(r, 'Sales tax')).toBe('$2,100.00');
		expect(metric(r, 'Total interest')).toBe('$5,483.20');
		expect(metric(r, 'Total cost')).toBe('$38,083.20');
	});

	it('taxes the price after trade-in and adds fees to the loan', () => {
		// Loan = 25,000 − 2,000 + 6% × 25,000 + 300 = 24,800; 48 months at 5.5% (576.7606, interest 2,884.51)
		const r = run({ price: '25000', down: '2000', trade: '0', tax: '6', fees: '300', rate: '5.5', term: '48' });
		expect(r.primaryResult).toBe('$576.76');
		expect(metric(r, 'Loan amount')).toBe('$24,800.00');
		expect(metric(r, 'Total interest')).toBe('$2,884.51');
	});

	it('shortens the term and raises the payment', () => {
		// Same $29,600 loan over 36 months at 6.9% (912.6093)
		expect(run({ term: '36' }).primaryResult).toBe('$912.61');
	});

	it('uses P ÷ n when the rate is 0%', () => {
		const r = run({ price: '20000', down: '0', trade: '0', tax: '0', fees: '0', rate: '0', term: '36' });
		expect(r.primaryResult).toBe('$555.56');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash when the down payment and trade-in cover the whole cost', () => {
		expect(run({ price: '10000', down: '9000', trade: '2000', tax: '0', fees: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty price', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
