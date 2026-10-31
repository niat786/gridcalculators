import { describe, expect, it } from 'vitest';
import calc from './simple-interest-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('simple interest calculator', () => {
	it('defaults: $2,000 at 5% for 3 years is $300 interest', () => {
		const r = run();
		expect(r.primaryResult).toBe('$300.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$2,300.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$100.00');
	});

	it('matches the worked example: $1,500 at 6% for 90 days', () => {
		const r = run({ principal: '1500', rate: '6', time: '90', unit: 'days' });
		expect(r.primaryResult).toBe('$22.19');
		expect(r.secondaryMetrics?.[0].value).toBe('$1,522.19');
		expect(r.secondaryMetrics?.[1].value).toBe('0.2466');
	});

	it('months: $1,000 at 12% for 6 months is $60 interest', () => {
		const r = run({ principal: '1000', rate: '12', time: '6', unit: 'months' });
		expect(r.primaryResult).toBe('$60.00');
	});

	it('zero time earns no interest', () => {
		const r = run({ time: '0' });
		expect(r.primaryResult).toBe('$0.00');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ time: '' });
		expect(r.primaryResult).toBe('—');
	});
});
