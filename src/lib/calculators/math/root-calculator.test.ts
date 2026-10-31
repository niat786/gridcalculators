import { describe, expect, it } from 'vitest';
import calc from './root-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) =>
	r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('root calculator', () => {
	it('matches the worked example: square root of 16 is 4', () => {
		const r = run({ x: '16', n: '2' });
		expect(r.primaryResult).toBe('4');
		expect(metric(r, 'Square root')).toBe('4');
		expect(metric(r, 'Cube root')).toBe('2.519842');
	});

	it('finds the fourth root of 81', () => {
		expect(run({ x: '81', n: '4' }).primaryResult).toBe('3');
	});

	it('finds the cube root of 27 and of -27', () => {
		expect(run({ x: '27', n: '3' }).primaryResult).toBe('3');
		const neg = run({ x: '-27', n: '3' });
		expect(neg.primaryResult).toBe('−3');
		expect(metric(neg, 'Square root')).toBe('Not real');
		expect(metric(neg, 'Cube root')).toBe('−3');
	});

	it('gives an irrational square root to six decimals: √2 = 1.414214', () => {
		expect(run({ x: '2', n: '2' }).primaryResult).toBe('1.414214');
	});

	it('returns a dash for an even root of a negative number', () => {
		const r = run({ x: '-16', n: '2' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/no real root of even degree/);
	});

	it('returns a dash for a degree below 2 or junk input', () => {
		expect(run({ x: '16', n: '0' }).primaryResult).toBe('—');
		expect(run({ x: 'abc', n: '2' }).primaryResult).toBe('—');
	});
});
