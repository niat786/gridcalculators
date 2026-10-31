import { describe, expect, it } from 'vitest';
import calc from './exponent-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) =>
	r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('exponent calculator', () => {
	it('matches the worked example: 2 to the power of 10', () => {
		const r = run({ base: '2', exponent: '10' });
		expect(r.primaryResult).toBe('1,024');
		expect(metric(r, 'Scientific notation')).toBe('1.024 × 10³');
	});

	it('handles a negative exponent: 2 to the power of -3 is 0.125', () => {
		const r = run({ base: '2', exponent: '-3' });
		expect(r.primaryResult).toBe('0.125');
		expect(metric(r, 'Reciprocal (1 ÷ result)')).toBe('8');
	});

	it('handles a negative base with a whole exponent: (-2)^3 = -8', () => {
		expect(run({ base: '-2', exponent: '3' }).primaryResult).toBe('−8');
	});

	it('handles a fractional exponent: 2^0.5 = √2', () => {
		expect(run({ base: '2', exponent: '0.5' }).primaryResult).toBe('1.414214');
	});

	it('shows very large results in scientific notation: 10^6 = 1 × 10⁶', () => {
		expect(run({ base: '10', exponent: '6' }).primaryResult).toBe('1 × 10⁶');
		expect(run({ base: '10', exponent: '-5' }).primaryResult).toBe('1 × 10⁻⁵');
	});

	it('returns a dash for a negative base with a fractional exponent', () => {
		const r = run({ base: '-8', exponent: '0.5' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/fractional exponent/);
	});

	it('returns a dash for zero to a negative power and for junk input', () => {
		expect(run({ base: '0', exponent: '-1' }).primaryResult).toBe('—');
		expect(run({ base: 'abc', exponent: '2' }).primaryResult).toBe('—');
		expect(run({ base: '10', exponent: '400' }).primaryResult).toBe('—');
	});
});
