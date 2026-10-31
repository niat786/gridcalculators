import { describe, expect, it } from 'vitest';
import calc from './annuity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('annuity calculator', () => {
	it('matches the worked example: $10,000 plus $200 a month at 6% for 20 years', () => {
		const r = run();
		expect(r.primaryResult).toBe('$125,510.22');
		expect(r.secondaryMetrics?.[0].value).toBe('$48,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$58,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$67,510.22');
	});

	it('beginning timing earns one more period on each addition', () => {
		// Beginning: 10,000 × 1.005²⁴⁰ + 200 × (1.005²⁴⁰ − 1) ÷ 0.005 × 1.005 = 125,972.26
		expect(run({ timing: 'beginning' }).primaryResult).toBe('$125,972.26');
	});

	it('yearly additions: $5,000 plus $300 a year at 5% for 10 years', () => {
		const r = run({ start: '5000', addition: '300', frequency: 'yearly', rate: '5', years: '10', timing: 'end' });
		expect(r.primaryResult).toBe('$11,917.84');
	});

	it('zero rate is a straight sum: $1,000 plus 10 × $100', () => {
		const r = run({ start: '1000', addition: '100', frequency: 'yearly', rate: '0', years: '10' });
		expect(r.primaryResult).toBe('$2,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$0.00');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ years: '' });
		expect(r.primaryResult).toBe('—');
	});
});
