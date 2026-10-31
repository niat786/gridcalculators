import { describe, expect, it } from 'vitest';
import calc from './quadratic-formula-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('quadratic formula calculator', () => {
	it('solves x² − 3x + 2 = 0 with roots 1 and 2 and vertex (1.5, -0.25)', () => {
		const r = run();
		expect(r.primaryResult).toBe('1 and 2');
		expect(r.secondaryMetrics?.[0].value).toBe('1');
		expect(r.secondaryMetrics?.[1].value).toBe('(1.5, -0.25)');
	});

	it('finds one repeated root for x² + 2x + 1 = 0', () => {
		const r = run({ a: '1', b: '2', c: '1' });
		expect(r.primaryResult).toBe('-1');
		expect(r.primaryLabel).toBe('One repeated root (x)');
	});

	it('finds complex roots for x² + 2x + 5 = 0 as -1 ± 2i', () => {
		const r = run({ a: '1', b: '2', c: '5' });
		expect(r.primaryResult).toBe('-1 ± 2i');
		expect(r.secondaryMetrics?.[0].value).toBe('-16');
	});

	it('finds the purely imaginary pair for x² + 1 = 0 as 0 ± 1i', () => {
		expect(run({ a: '1', b: '0', c: '1' }).primaryResult).toBe('0 ± 1i');
	});

	it('handles a leading coefficient: 2x² + 4x − 6 = 0 has roots -3 and 1', () => {
		expect(run({ a: '2', b: '4', c: '-6' }).primaryResult).toBe('-3 and 1');
	});

	it('returns a dash when a is 0', () => {
		expect(run({ a: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty coefficient', () => {
		expect(run({ a: '' }).primaryResult).toBe('—');
	});
});
