import { describe, expect, it } from 'vitest';
import calc from './compound-interest-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('compound interest calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$50,969.84');
		expect(r.secondaryMetrics?.[0].value).toBe('$34,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$16,969.84');
		expect(r.secondaryMetrics?.[2].value).toBe('6.168%');
	});

	it('lump sum with annual compounding', () => {
		// $5,000 lump sum, no contributions, 8% compounded annually for 3 years: 5000 × 1.08³
		const r = run({ principal: '5000', monthly: '0', rate: '8', years: '3', compounding: 'annually' });
		expect(r.primaryResult).toBe('$6,298.56');
		expect(r.secondaryMetrics?.[1].value).toBe('$1,298.56');
	});

	it('handles zero interest: contributions only', () => {
		const r = run({ principal: '1000', monthly: '100', rate: '0', years: '5', compounding: 'annually' });
		expect(r.primaryResult).toBe('$7,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$0.00');
	});

	it('uses daily compounding converted to an effective monthly rate', () => {
		// $2,000 at 5% compounded daily for 1 year: 2000 × (1 + 0.05 ÷ 365)³⁶⁵
		const r = run({ principal: '2000', monthly: '0', rate: '5', years: '1', compounding: 'daily' });
		expect(r.primaryResult).toBe('$2,102.53');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ years: '' });
		expect(r.primaryResult).toBe('—');
	});
});
