import { describe, expect, it } from 'vitest';
import calc from './engine-horsepower-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('engine horsepower calculator', () => {
	it('matches the worked example: 3,000 lb at 13.00 s gives 270 hp', () => {
		// 3000 ÷ (13 ÷ 5.825)³ = 3000 ÷ 11.1184 = 269.885 hp
		const r = run();
		expect(r.primaryResult).toBe('270 hp');
		expect(r.secondaryMetrics?.[0].value).toBe('201 kW');
		expect(r.secondaryMetrics?.[2].value).toBe('11.1 lb/hp');
	});

	it('uses the trap speed method: 3,000 lb at 105 mph gives 271 hp', () => {
		// 3000 × (105 ÷ 234)³ = 3000 × 0.090351 = 271.05 hp
		const r = run({ method: 'trap', trapMph: '105' });
		expect(r.primaryResult).toBe('271 hp');
		expect(r.secondaryMetrics?.[3].value).toBe('Hale trap speed');
	});

	it('takes kilograms and km/h: 1,361 kg at 169 km/h (105.0 mph) gives 271 hp', () => {
		// 1361 kg = 3000.5 lb; 169 km/h = 105.01 mph; 3000.5 × (105.01 ÷ 234)³ = 271.2 hp
		const r = run({ method: 'trap', units: 'met', weightKg: '1361', trapKmh: '169' });
		expect(r.primaryResult).toBe('271 hp');
	});

	it('gives a larger power for a faster time: 12.5 s at 3,000 lb is 304 hp', () => {
		// 3000 × 5.825³ ÷ 12.5³ = 3000 × 197.646 ÷ 1953.125 = 303.6 hp, shown as 304
		expect(run({ et: '12.5' }).primaryResult).toBe('304 hp');
	});

	it('returns a dash for zero weight or a zero quarter-mile time', () => {
		expect(run({ weightLb: '0' }).primaryResult).toBe('—');
		expect(run({ et: '0' }).primaryResult).toBe('—');
	});
});
