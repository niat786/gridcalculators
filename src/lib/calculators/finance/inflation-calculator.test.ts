import { describe, expect, it } from 'vitest';
import calc from './inflation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('inflation calculator', () => {
	it('matches the worked example (2000 → 2024)', () => {
		const r = run({ from: '2000', to: '2024' });
		expect(r.primaryResult).toBe('$182.17');
		expect(r.secondaryMetrics?.[0].value).toBe('82.17%');
	});
	it('uses official BLS annual averages', () => {
		// $1 in 1913 → 2024: 313.689 / 9.883
		expect(run({ amount: '1', from: '1913', to: '2024' }).primaryResult).toBe('$31.74');
		expect(run({ amount: '1000', from: '2020', to: '2023' }).primaryResult).toBe('$1,177.31');
	});
	it('projects future cost at a fixed rate', () => {
		expect(run({ mode: 'rate', amount: '100', rate: '3', years: '10' }).primaryResult).toBe('$134.39');
	});
	it('rejects invalid input', () => {
		expect(run({ amount: 'abc' }).primaryResult).toBe('—');
	});
});
