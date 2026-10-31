import { describe, expect, it } from 'vitest';
import calc from './roofing-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('roofing calculator', () => {
	it('matches the worked example: 40 × 30 ft house, 12 in overhang, 6/12 pitch, 10% waste', () => {
		// (40 + 2) × (30 + 2) = 1,344 sq ft; × √1.25 = 1.1180 → 1,502.6 sq ft
		// 1,502.6 ÷ 100 × 1.1 = 16.53 squares; × 3 = 49.59 → 50 bundles
		const r = run();
		expect(r.primaryResult).toBe('1,503 sq ft');
		expect(r.primaryLabel).toBe('Roof area');
		expect(r.secondaryMetrics?.[0].value).toBe('1,344 sq ft');
		expect(r.secondaryMetrics?.[1].value).toBe('1.1180');
		expect(r.secondaryMetrics?.[2].value).toBe('15.03');
		expect(r.secondaryMetrics?.[3].value).toBe('16.53');
		expect(r.secondaryMetrics?.[4].value).toBe('50 bundles');
	});

	it('handles a 12/12 pitch with no overhang and no waste: 20 × 10 ft', () => {
		// 200 × √2 = 282.84 sq ft = 2.83 squares; × 3 = 8.49 → 9 bundles
		const r = run({ length: '20', width: '10', overhang: '0', pitch: '12', waste: '0' });
		expect(r.primaryResult).toBe('283 sq ft');
		expect(r.secondaryMetrics?.[2].value).toBe('2.83');
		expect(r.secondaryMetrics?.[4].value).toBe('9 bundles');
	});

	it('handles a 4/12 pitch with no overhang and no waste: 30 × 20 ft', () => {
		// 600 × √(1 + (4/12)²) = 1.0541 → 632.46 sq ft = 6.32 squares; × 3 = 18.97 → 19 bundles
		const r = run({ length: '30', width: '20', overhang: '0', pitch: '4', waste: '0' });
		expect(r.secondaryMetrics?.[1].value).toBe('1.0541');
		expect(r.primaryResult).toBe('632 sq ft');
		expect(r.secondaryMetrics?.[4].value).toBe('19 bundles');
	});

	it('returns a dash for a zero house length', () => {
		expect(run({ length: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative overhang', () => {
		expect(run({ overhang: '-6' }).primaryResult).toBe('—');
	});
});
