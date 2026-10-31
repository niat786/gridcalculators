import { describe, expect, it } from 'vitest';
import calc from './rental-property-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('rental property calculator', () => {
	it('matches the worked example: $300,000 property, 25% down, $2,400 rent, 6.5% over 30 years', () => {
		const r = run({
			price: '300000',
			down: '25',
			rate: '6.5',
			term: '30',
			closing: '6000',
			rent: '2400',
			vacancy: '5',
			tax: '3600',
			insurance: '1200',
			maint: '5',
			mgmt: '8',
			hoa: '100'
		});
		expect(r.primaryResult).toBe('$61.45');
		expect(metric(r, 'Monthly mortgage payment')).toBe('$1,422.15');
		expect(metric(r, 'Net operating income (yearly)')).toBe('$17,803.20');
		expect(metric(r, 'Cap rate')).toBe('5.93%');
		expect(metric(r, 'Cash invested')).toBe('$81,000.00');
		expect(metric(r, 'Cash-on-cash return')).toBe('0.91%');
		expect(metric(r, 'Loan amount')).toBe('$225,000.00');
	});

	it('gives a second known answer with no HOA or management: $200,000 at 6% over 30 years', () => {
		const r = run({
			price: '200000',
			down: '20',
			rate: '6',
			term: '30',
			closing: '4000',
			rent: '1800',
			vacancy: '0',
			tax: '2000',
			insurance: '900',
			maint: '0',
			mgmt: '0',
			hoa: '0'
		});
		expect(r.primaryResult).toBe('$599.05');
		expect(metric(r, 'Net operating income (yearly)')).toBe('$18,700.00');
		expect(metric(r, 'Cap rate')).toBe('9.35%');
		expect(metric(r, 'Cash-on-cash return')).toBe('16.34%');
		expect(metric(r, 'Cash invested')).toBe('$44,000.00');
	});

	it('handles an all-cash purchase with no loan payment', () => {
		const r = run({
			price: '150000',
			down: '100',
			rate: '5',
			term: '15',
			closing: '0',
			rent: '1000',
			vacancy: '10',
			tax: '0',
			insurance: '0',
			maint: '0',
			mgmt: '0',
			hoa: '0'
		});
		expect(r.primaryResult).toBe('$900.00');
		expect(metric(r, 'Monthly mortgage payment')).toBe('$0.00');
		expect(metric(r, 'Cap rate')).toBe('7.2%');
		expect(metric(r, 'Cash-on-cash return')).toBe('7.2%');
	});

	it('returns a dash for a missing price, and when the down payment is over 100%', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ down: '101' }).primaryResult).toBe('—');
	});
});
