import { describe, expect, it } from 'vitest';
import calc from './canadian-mortgage-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('canadian mortgage calculator', () => {
	it('matches the worked example: $500,000 home, 20% down, 5% over 25 years, monthly', () => {
		const r = run({ price: '500000', down: '20', rate: '5', amort: '25', frequency: 'monthly' });
		expect(r.primaryResult).toBe('$2,326.42');
		expect(r.primaryLabel).toBe('Monthly payment');
		expect(metric(r, 'Loan amount (CAD)')).toBe('$400,000.00');
		expect(metric(r, 'Total interest')).toBe('$297,925.98');
		expect(metric(r, 'Number of payments')).toBe('300');
		expect(metric(r, 'Effective annual rate')).toBe('5.06%');
	});

	it('pays half the monthly amount every two weeks when accelerated, and finishes sooner', () => {
		const r = run({ price: '500000', down: '20', rate: '5', amort: '25', frequency: 'accel-biweekly' });
		expect(r.primaryResult).toBe('$1,163.21');
		expect(r.primaryLabel).toBe('Accelerated bi-weekly payment');
		expect(metric(r, 'Number of payments')).toBe('559');
		expect(metric(r, 'Total interest')).toBe('$249,577.30');
	});

	it('uses principal divided by payments at 0% and flags CMHC when down is under 20%', () => {
		const r = run({ price: '200000', down: '10', rate: '0', amort: '20', frequency: 'monthly' });
		expect(r.primaryResult).toBe('$750.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
		expect(metric(r, 'Mortgage insurance (CMHC)')).toBe('Required, not included');
	});

	it('reports no CMHC requirement at 20% down or more', () => {
		const r = run({ price: '200000', down: '20', rate: '0', amort: '20', frequency: 'monthly' });
		expect(metric(r, 'Mortgage insurance (CMHC)')).toBe('Not required');
	});

	it('returns a dash for an invalid home price or a 100% down payment', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ down: '100' }).primaryResult).toBe('—');
	});
});
