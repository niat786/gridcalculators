import { describe, expect, it } from 'vitest';
import calc from './future-value-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('future value calculator', () => {
	it('defaults: $1,000 at 0.5% for 120 periods is $1,819.40', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,819.40');
	});

	it('matches the worked example: $1,000 plus $100 a period at 0.5% for 120 periods', () => {
		const r = run({ pmt: '100' });
		expect(r.primaryResult).toBe('$18,207.33');
		expect(r.secondaryMetrics?.[0].value).toBe('$13,000.00');
	});

	it('ordinary annuity: $100 a period at 1% for 12 periods', () => {
		const r = run({ pv: '0', rate: '1', periods: '12', pmt: '100', timing: 'end' });
		expect(r.primaryResult).toBe('$1,268.25');
	});

	it('annuity due: the same payments at the beginning earn one more period', () => {
		// 1,268.25 × 1.01
		const r = run({ pv: '0', rate: '1', periods: '12', pmt: '100', timing: 'beginning' });
		expect(r.primaryResult).toBe('$1,280.93');
	});

	it('zero rate is a straight sum: $500 + 10 × $50 = $1,000', () => {
		const r = run({ pv: '500', rate: '0', periods: '10', pmt: '50' });
		expect(r.primaryResult).toBe('$1,000.00');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ periods: '' });
		expect(r.primaryResult).toBe('—');
	});
});
