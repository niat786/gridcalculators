import { describe, expect, it } from 'vitest';
import calc from './bac-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('BAC calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('0.073%');
		expect(r.secondaryMetrics?.[2].value).toBe('4 h 52 min');
	});
	it('uses the female factor', () => {
		// 56 / (0.55 × 80,000) × 100 = 0.12727 − 0.03 = 0.097
		expect(run({ sex: 'female' }).primaryResult).toBe('0.097%');
	});
	it('handles custom drinks and pounds', () => {
		// 2 × 500 mL × 5% × 0.789 = 39.45 g; 176 lb = 79.83 kg; 0.0727 − 0 = 0.073
		expect(run({ drink: 'custom', count: '2', units: 'lb', hours: '0' }).primaryResult).toBe('0.073%');
	});
	it('never goes below zero', () => {
		expect(run({ hours: '20' }).primaryResult).toBe('0.000%');
	});
});
