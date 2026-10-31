import { describe, expect, it } from 'vitest';
import calc from './concrete-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('concrete calculator', () => {
	it('matches the worked example: 10 ft × 12 ft slab, 4 in thick, 10% waste', () => {
		// 10 × 12 × 4/12 = 40 cu ft; × 1.10 = 44 cu ft = 1.63 cu yd; 44 / 0.45 = 97.8 → 98; 44 / 0.6 = 73.3 → 74
		const r = run();
		expect(r.primaryResult).toBe('1.63 cu yd');
		expect(r.secondaryMetrics?.[0].value).toBe('1.48 cu yd (1.13 m³)');
		expect(r.secondaryMetrics?.[2].value).toBe('98 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('74 bags');
	});

	it('works in metric: 3 m × 4 m × 10 cm slab', () => {
		// 3 × 4 × 0.10 = 1.20 m³; × 1.10 = 1.32 m³ = 46.62 cu ft; 46.62 / 0.45 = 103.6 → 104; / 0.6 = 77.7 → 78
		const r = run({ units: 'metric' });
		expect(r.primaryResult).toBe('1.32 m³');
		expect(r.secondaryMetrics?.[2].value).toBe('104 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('78 bags');
	});

	it('handles a round column: 12 in diameter, 8 ft tall, 10% waste', () => {
		// π × 0.5² × 8 = 6.283 cu ft; × 1.10 = 6.912 cu ft = 0.256 cu yd; bags 15.4 → 16 and 11.5 → 12
		const r = run({ shape: 'column', units: 'imperial' });
		expect(r.primaryResult).toBe('0.26 cu yd');
		expect(r.secondaryMetrics?.[2].value).toBe('16 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('12 bags');
	});

	it('treats a round hole the same as a column, in metres', () => {
		// π × 0.15² × 2.4 = 0.1696 m³; × 1.10 = 0.1866 m³
		expect(run({ shape: 'hole', units: 'metric' }).primaryResult).toBe('0.19 m³');
	});

	it('drops the waste allowance when it is set to zero', () => {
		// 40 cu ft = 1.48 cu yd; 40 / 0.45 = 88.9 → 89; 40 / 0.6 = 66.7 → 67
		const r = run({ waste: '0' });
		expect(r.primaryResult).toBe('1.48 cu yd');
		expect(r.secondaryMetrics?.[2].value).toBe('89 bags');
		expect(r.secondaryMetrics?.[3].value).toBe('67 bags');
	});

	it('returns a dash for a zero dimension or a negative waste', () => {
		expect(run({ lenFt: '0', lenIn: '0' }).primaryResult).toBe('—');
		expect(run({ waste: '-1' }).primaryResult).toBe('—');
	});
});
