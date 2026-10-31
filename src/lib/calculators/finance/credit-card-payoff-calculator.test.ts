import { describe, expect, it } from 'vitest';
import calc from './credit-card-payoff-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('credit card payoff calculator', () => {
	it('$5,000 at 24% with $200 a month (default) clears in 36 months', () => {
		const r = run({ mode: 'fixed', balance: '5000', apr: '24', payment: '200' });
		expect(r.primaryResult).toBe('36 months');
		expect(metric(r, 'Total interest')).toBe('$2,000.56');
		expect(metric(r, 'Total paid')).toBe('$7,000.56');
		expect(metric(r, 'Final payment')).toBe('$0.56');
	});

	it('$1,000 at 12% with $100 a month clears in 11 months with $58.98 interest', () => {
		const r = run({ balance: '1000', apr: '12', payment: '100' });
		expect(r.primaryResult).toBe('11 months');
		expect(metric(r, 'Total interest')).toBe('$58.98');
	});

	it('0% APR: $1,200 at $100 a month clears in 12 months with no interest', () => {
		const r = run({ balance: '1200', apr: '0', payment: '100' });
		expect(r.primaryResult).toBe('12 months');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('a payment equal to the first month interest never pays off: $5,000 at 24% with $100', () => {
		const r = run({ balance: '5000', apr: '24', payment: '100' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/never pays off/);
	});

	it('pay off by date: $5,000 at 24% over 24 months needs $264.36 a month', () => {
		const r = run({ mode: 'target', balance: '5000', apr: '24', months: '24' });
		expect(r.primaryResult).toBe('$264.36');
		expect(metric(r, 'Total interest')).toBe('$1,344.53');
		expect(metric(r, 'Total paid')).toBe('$6,344.53');
	});

	it('pay off by date at 0% APR divides the balance evenly', () => {
		expect(run({ mode: 'target', balance: '1200', apr: '0', months: '12' }).primaryResult).toBe('$100.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ balance: 'abc' }).primaryResult).toBe('—');
		expect(run({ apr: '-3' }).primaryResult).toBe('—');
		expect(run({ mode: 'target', months: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'target', months: '2.5' }).primaryResult).toBe('—');
		expect(run({ payment: '0' }).primaryResult).toBe('—');
	});
});
