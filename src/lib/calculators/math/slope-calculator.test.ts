import { describe, expect, it } from 'vitest';
import calc from './slope-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) =>
	r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('slope calculator', () => {
	it('matches the worked example: (2, 3) and (6, 11)', () => {
		const r = run({ x1: '2', y1: '3', x2: '6', y2: '11' });
		expect(r.primaryResult).toBe('2');
		expect(metric(r, 'Angle')).toBe('63.4349°');
		expect(metric(r, 'Distance')).toBe('8.944272');
		expect(metric(r, 'Y-intercept')).toBe('−1');
		expect(metric(r, 'Equation')).toBe('y = 2x − 1');
	});

	it('handles a negative slope with a positive intercept', () => {
		const r = run({ x1: '0', y1: '4', x2: '2', y2: '0' });
		expect(r.primaryResult).toBe('−2');
		expect(metric(r, 'Y-intercept')).toBe('4');
		expect(metric(r, 'Equation')).toBe('y = −2x + 4');
	});

	it('handles a fractional slope through the origin', () => {
		const r = run({ x1: '0', y1: '0', x2: '4', y2: '2' });
		expect(r.primaryResult).toBe('0.5');
		expect(metric(r, 'Distance')).toBe('4.472136');
		expect(metric(r, 'Equation')).toBe('y = 0.5x');
	});

	it('reports a horizontal line with slope 0 and equation y = b', () => {
		const r = run({ x1: '1', y1: '7', x2: '5', y2: '7' });
		expect(r.primaryResult).toBe('0');
		expect(metric(r, 'Equation')).toBe('y = 7');
	});

	it('reports a vertical line as Undefined with equation x = 3', () => {
		const r = run({ x1: '3', y1: '1', x2: '3', y2: '7' });
		expect(r.primaryResult).toBe('Undefined');
		expect(metric(r, 'Equation')).toBe('x = 3');
		expect(metric(r, 'Angle')).toBe('90°');
		expect(metric(r, 'Y-intercept')).toBe('None');
	});

	it('returns a dash for identical points or junk input', () => {
		expect(run({ x1: '2', y1: '2', x2: '2', y2: '2' }).primaryResult).toBe('—');
		expect(run({ x1: 'abc' }).primaryResult).toBe('—');
	});
});
