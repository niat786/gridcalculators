import { describe, expect, it } from 'vitest';
import calc from './pythagorean-theorem-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) =>
	r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('pythagorean theorem calculator', () => {
	it('matches the worked example: legs 5 and 12', () => {
		const r = run({ solve: 'c', a: '5', b: '12' });
		expect(r.primaryResult).toBe('13');
		expect(metric(r, 'Angle opposite a')).toBe('22.6199°');
		expect(metric(r, 'Angle opposite b')).toBe('67.3801°');
		expect(metric(r, 'Area')).toBe('30');
	});

	it('solves for a leg: hypotenuse 13 and leg b 5 give leg a 12', () => {
		const r = run({ solve: 'a', b: '5', c: '13' });
		expect(r.primaryResult).toBe('12');
		expect(r.primaryLabel).toBe('Leg a');
	});

	it('solves for leg b: hypotenuse 10 and leg a 6 give leg b 8', () => {
		const r = run({ solve: 'b', a: '6', c: '10' });
		expect(r.primaryResult).toBe('8');
		expect(metric(r, 'Angle opposite a')).toBe('36.8699°');
	});

	it('handles a non-whole hypotenuse: legs 1 and 1 give √2', () => {
		expect(run({ solve: 'c', a: '1', b: '1' }).primaryResult).toBe('1.4142');
	});

	it('returns a dash when a leg is not shorter than the hypotenuse', () => {
		const r = run({ solve: 'a', b: '5', c: '4' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/longer than leg b/);
		expect(run({ solve: 'b', a: '13', c: '13' }).primaryResult).toBe('—');
	});

	it('returns a dash for zero or junk input', () => {
		expect(run({ solve: 'c', a: '0' }).primaryResult).toBe('—');
		expect(run({ solve: 'c', b: 'abc' }).primaryResult).toBe('—');
	});
});
