import { describe, expect, it } from 'vitest';
import calc from './area-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const perimeter = (over: Record<string, string>) => run(over).secondaryMetrics?.[0].value;

describe('area calculator', () => {
	it('matches the worked example: 4.5 m by 3.2 m rectangle', () => {
		const r = run({ shape: 'rectangle', length: '4.5', width: '3.2' });
		expect(r.primaryResult).toBe('14.4');
		expect(perimeter({ shape: 'rectangle', length: '4.5', width: '3.2' })).toBe('15.4');
	});

	it('computes a rectangle from its defaults', () => {
		expect(run().primaryResult).toBe('96');
		expect(perimeter({})).toBe('40');
	});

	it('computes a triangle as base × height ÷ 2, with no perimeter', () => {
		const r = run({ shape: 'triangle', base: '10', height: '6' });
		expect(r.primaryResult).toBe('30');
		expect(perimeter({ shape: 'triangle', base: '10', height: '6' })).toBe('Needs all side lengths');
	});

	it('computes a circle and an ellipse', () => {
		expect(run({ shape: 'circle', radius: '5' }).primaryResult).toBe('78.5398');
		expect(perimeter({ shape: 'circle', radius: '5' })).toBe('31.4159');
		expect(run({ shape: 'ellipse', semiMajor: '8', semiMinor: '5' }).primaryResult).toBe('125.6637');
		expect(perimeter({ shape: 'ellipse', semiMajor: '8', semiMinor: '5' })).toBe('41.3863');
	});

	it('computes a quarter-circle sector', () => {
		const over = { shape: 'sector', radius: '5', angle: '90' };
		expect(run(over).primaryResult).toBe('19.635');
		expect(perimeter(over)).toBe('17.854');
	});

	it('computes a trapezoid and a parallelogram', () => {
		expect(run({ shape: 'trapezoid', p1: '12', p2: '8', height: '6' }).primaryResult).toBe('60');
		expect(run({ shape: 'parallelogram', base: '10', height: '6' }).primaryResult).toBe('60');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ shape: 'rectangle', length: '0' }).primaryResult).toBe('—');
		expect(run({ shape: 'circle', radius: 'abc' }).primaryResult).toBe('—');
		expect(run({ shape: 'sector', radius: '5', angle: '400' }).primaryResult).toBe('—');
	});
});
