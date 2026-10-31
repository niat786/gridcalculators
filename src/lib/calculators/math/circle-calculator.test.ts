import { describe, expect, it } from 'vitest';
import calc from './circle-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) =>
	r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('circle calculator', () => {
	it('matches the worked example: radius 5', () => {
		const r = run({ known: 'radius', radius: '5' });
		expect(metric(r, 'Diameter')).toBe('10');
		expect(metric(r, 'Circumference')).toBe('31.415927');
		expect(r.primaryResult).toBe('78.539816');
	});

	it('finds everything from a diameter of 30', () => {
		const r = run({ known: 'diameter', diameter: '30' });
		expect(metric(r, 'Radius')).toBe('15');
		expect(metric(r, 'Circumference')).toBe('94.24778');
		expect(r.primaryResult).toBe('706.858347');
	});

	it('finds the radius from a circumference of 10π', () => {
		const r = run({ known: 'circumference', circumference: '31.4159265358979' });
		expect(metric(r, 'Radius')).toBe('5');
		expect(r.primaryResult).toBe('78.539816');
	});

	it('finds the radius from an area of 100 (r = √(100 ÷ π) = 5.641896)', () => {
		const r = run({ known: 'area', area: '100' });
		expect(metric(r, 'Radius')).toBe('5.641896');
		expect(metric(r, 'Diameter')).toBe('11.283792');
		expect(metric(r, 'Circumference')).toBe('35.449077');
	});

	it('returns a dash for zero or junk input', () => {
		expect(run({ known: 'radius', radius: '0' }).primaryResult).toBe('—');
		expect(run({ known: 'area', area: 'abc' }).primaryResult).toBe('—');
		expect(run({ known: 'diameter', diameter: '-4' }).primaryResult).toBe('—');
	});
});
