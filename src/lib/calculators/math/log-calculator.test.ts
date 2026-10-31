import { describe, expect, it } from 'vitest';
import calc from './log-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('log calculator', () => {
	it('gives log base 10 of 1000 as 3 from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('3');
		expect(metric(r, 'Natural log, ln(x)')).toBe('6.907755');
		expect(metric(r, 'Common log, log₁₀(x)')).toBe('3');
		expect(metric(r, 'Binary log, log₂(x)')).toBe('9.965784');
		expect(metric(r, 'Check: b to the power of the result')).toBe('1,000');
	});

	it('gives log base 2 of 8 as 3', () => {
		expect(run({ x: '8', b: '2' }).primaryResult).toBe('3');
	});

	it('gives log base 3 of 81 as 4, matching the worked example', () => {
		expect(run({ x: '81', b: '3' }).primaryResult).toBe('4');
	});

	it('gives a negative result below 1: log base 10 of 0.001 is −3', () => {
		expect(run({ x: '0.001' }).primaryResult).toBe('-3');
	});

	it('gives 0 for log of 1 in any base', () => {
		expect(run({ x: '1', b: '5' }).primaryResult).toBe('0');
	});

	it('returns a dash for a zero or negative number', () => {
		expect(run({ x: '0' }).primaryResult).toBe('—');
		expect(run({ x: '-5' }).primaryResult).toBe('—');
	});

	it('returns a dash for a base of 1, 0 or a negative base', () => {
		expect(run({ b: '1' }).primaryResult).toBe('—');
		expect(run({ b: '0' }).primaryResult).toBe('—');
		expect(run({ b: '-2' }).primaryResult).toBe('—');
	});
});
