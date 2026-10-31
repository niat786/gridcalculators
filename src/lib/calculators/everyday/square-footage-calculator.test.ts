import { describe, expect, it } from 'vitest';
import calc from './square-footage-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('square footage calculator', () => {
	it('matches the worked example: 12 ft × 10 ft at $5 per square foot', () => {
		// 12 × 10 = 120 sq ft; × 0.09290304 = 11.15 sq m; 120 × $5 = $600.00
		const r = run();
		expect(r.primaryResult).toBe('120.00 sq ft');
		expect(r.secondaryMetrics?.[0].value).toBe('120.00 sq ft');
		expect(r.secondaryMetrics?.[1].value).toBe('11.15 sq m');
		expect(r.secondaryMetrics?.[2].value).toBe('$600.00');
	});

	it('gets a circle area: 10 ft diameter', () => {
		// π × 5² = 78.54 sq ft
		expect(run({ shape: 'circle' }).primaryResult).toBe('78.54 sq ft');
	});

	it('gets a triangle area: 10 ft base, 6 ft height', () => {
		// 10 × 6 ÷ 2 = 30 sq ft
		expect(run({ shape: 'triangle' }).primaryResult).toBe('30.00 sq ft');
	});

	it('works in metres: a circle of 2 m diameter', () => {
		// π × 1² = 3.14 sq m = 33.82 sq ft; cost at $54 per sq m = $169.65
		const r = run({ shape: 'circle', units: 'm', circDiaM: '2', priceM: '54' });
		expect(r.primaryResult).toBe('3.14 sq m');
		expect(r.secondaryMetrics?.[0].value).toBe('33.82 sq ft');
		expect(r.secondaryMetrics?.[2].value).toBe('$169.65');
	});

	it('returns a dash for a missing or zero measurement', () => {
		expect(run({ rectLenFt: '' }).primaryResult).toBe('—');
		expect(run({ shape: 'triangle', triBaseFt: '0' }).primaryResult).toBe('—');
	});
});
