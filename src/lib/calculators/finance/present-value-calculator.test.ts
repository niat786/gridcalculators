import { describe, expect, it } from 'vitest';
import calc from './present-value-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('present value calculator', () => {
	it('matches the worked example: $10,000 in 120 periods at 0.5%', () => {
		const r = run();
		expect(r.primaryResult).toBe('$5,496.33');
		expect(r.secondaryMetrics?.[2].value).toBe('0.549633');
	});

	it('with payments: $10,000 goal, $50 a period at 0.5% for 120 periods', () => {
		const r = run({ pmt: '50' });
		expect(r.primaryResult).toBe('$992.65');
	});

	it('round trip: $1,000 at 1% with $100 a period for 12 periods grows to $2,395.08', () => {
		const r = run({ fv: '2395.08', rate: '1', periods: '12', pmt: '100', timing: 'end' });
		expect(r.primaryResult).toBe('$1,000.00');
	});

	it('zero rate: $10,000 less 100 payments of $50', () => {
		const r = run({ fv: '10000', rate: '0', periods: '100', pmt: '50' });
		expect(r.primaryResult).toBe('$5,000.00');
	});

	it('payments that already pass the goal give a negative present value', () => {
		const r = run({ fv: '500', rate: '0', periods: '10', pmt: '100' });
		expect(r.primaryResult).toBe('-$500.00');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ fv: '' });
		expect(r.primaryResult).toBe('—');
	});
});
