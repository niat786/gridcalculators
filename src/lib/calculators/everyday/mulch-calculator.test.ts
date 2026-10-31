import { describe, expect, it } from 'vitest';
import calc from './mulch-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('mulch calculator', () => {
	it('matches the worked example: 20 ft × 15 ft bed, 3 in deep', () => {
		// 300 × (3 ÷ 12) = 75 cu ft = 2.78 cu yd; 75 ÷ 2 = 37.5 → 38 bags; 75 ÷ 3 = 25 bags
		// 38 × $4.50 = $171.00; 25 × $6.75 = $168.75
		const r = run();
		expect(r.primaryResult).toBe('2.78 cu yd');
		expect(r.primaryLabel).toBe('Mulch needed');
		expect(r.secondaryMetrics?.[0].value).toBe('75 cu ft');
		expect(r.secondaryMetrics?.[1].value).toBe('38 bags');
		expect(r.secondaryMetrics?.[2].value).toBe('25 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('$171.00');
		expect(r.secondaryMetrics?.[4].value).toBe('$168.75');
	});

	it('handles a 12 ft circle at 2 in deep', () => {
		// π × 6² = 113.10 sq ft × (2 ÷ 12) = 18.85 cu ft = 0.70 cu yd
		// 18.85 ÷ 2 = 9.42 → 10 bags; 18.85 ÷ 3 = 6.28 → 7 bags
		// 10 × $4.50 = $45.00; 7 × $6.75 = $47.25
		const r = run({ shape: 'circle', diaFt: '12', depthIn: '2' });
		expect(r.primaryResult).toBe('0.70 cu yd');
		expect(r.secondaryMetrics?.[1].value).toBe('10 bags');
		expect(r.secondaryMetrics?.[2].value).toBe('7 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('$45.00');
		expect(r.secondaryMetrics?.[4].value).toBe('$47.25');
	});

	it('does not add an extra bag when the volume is an exact multiple', () => {
		// 12 × 8 ft = 96 sq ft × 0.25 ft = 24 cu ft; 24 ÷ 2 = 12 bags; 24 ÷ 3 = 8 bags exactly
		const r = run({ lenFt: '12', widFt: '8', depthIn: '3' });
		expect(r.secondaryMetrics?.[1].value).toBe('12 bags');
		expect(r.secondaryMetrics?.[2].value).toBe('8 bags');
	});

	it('leaves out the cost when a bag price is set to zero', () => {
		expect(run({ price2: '0' }).secondaryMetrics?.[3].value).toBe('—');
	});

	it('returns a dash for a zero length or a zero depth', () => {
		expect(run({ lenFt: '0' }).primaryResult).toBe('—');
		expect(run({ depthIn: '0' }).primaryResult).toBe('—');
	});
});
