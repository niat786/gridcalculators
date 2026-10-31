import { describe, expect, it } from 'vitest';
import calc from './interest-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('interest calculator', () => {
	it('matches the worked example (monthly compound)', () => {
		const r = run();
		expect(r.primaryResult).toBe('$6,416.79');
		expect(r.secondaryMetrics?.[0].value).toBe('$1,416.79');
		expect(r.secondaryMetrics?.[2].value).toBe('60 periods');
	});

	it('simple interest: $1,000 at 4% for 2.5 years is $100 of interest', () => {
		const r = run({ principal: '1000', rate: '4', years: '2.5', method: 'simple' });
		expect(r.primaryResult).toBe('$1,100.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$100.00');
	});

	it('annual compound: $2,000 at 10% for 2 years is $2,420', () => {
		const r = run({ principal: '2000', rate: '10', years: '2', method: 'compound', compounding: 'annually' });
		expect(r.primaryResult).toBe('$2,420.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$420.00');
	});

	it('simple interest ignores the compounding choice', () => {
		const r = run({ principal: '1000', rate: '4', years: '2.5', method: 'simple', compounding: 'daily' });
		expect(r.primaryResult).toBe('$1,100.00');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ principal: '' });
		expect(r.primaryResult).toBe('—');
	});
});
