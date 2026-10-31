import { describe, expect, it } from 'vitest';
import calc from './mortgage-payoff-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('mortgage payoff calculator', () => {
	it('matches the worked example: $300,000 at 6.25%, 5 years paid, $200 extra', () => {
		const r = run();
		expect(r.primaryResult).toBe('$280,011.72');
		expect(metric(r, 'Monthly payment')).toBe('$1,847.15');
		expect(metric(r, 'Original payoff time')).toBe('25 years');
		expect(metric(r, 'Payoff time with extra')).toBe('20 years');
		expect(metric(r, 'Time saved')).toBe('5 years');
		expect(metric(r, 'Interest left, no extra')).toBe('$274,133.76');
		expect(metric(r, 'Interest saved')).toBe('$63,051.35');
	});

	it('finds the balance after 10 years on a 15-year loan, checked by bisection', () => {
		// $200,000 at 5%, 15 years, 10 paid: balance 83,809.43; $150 extra pays off in 55 months, saving 5 months
		const r = run({ amount: '200000', rate: '5', term: '15', paid: '10', extra: '150' });
		expect(r.primaryResult).toBe('$83,809.43');
		expect(metric(r, 'Payoff time with extra')).toBe('4 years 7 months');
		expect(metric(r, 'Time saved')).toBe('5 months');
		expect(metric(r, 'Interest saved')).toBe('$1,098.21');
	});

	it('shows the full loan as the balance when no years are paid', () => {
		const r = run({ amount: '200000', rate: '6', paid: '0', extra: '0' });
		expect(r.primaryResult).toBe('$200,000.00');
		expect(metric(r, 'Interest saved')).toBe('$0.00');
		expect(metric(r, 'Time saved')).toBe('0 months');
	});

	it('subtracts payments evenly at a 0% rate', () => {
		// $12,000 over 2 years at 0%: $500 a month; after 12 payments $6,000 remains
		expect(run({ amount: '12000', rate: '0', term: '2', paid: '0', extra: '0' }).primaryResult).toBe('$12,000.00');
		expect(run({ amount: '12000', rate: '0', term: '2', paid: '1', extra: '0' }).primaryResult).toBe('$6,000.00');
	});

	it('returns a dash when the years paid reach the full term', () => {
		expect(run({ term: '30', paid: '30' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty loan amount', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
	});
});
