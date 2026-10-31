import { describe, expect, it } from 'vitest';
import calc from './distance-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('distance calculator', () => {
	it('matches the default 2D points (1, 2) and (4, 6): distance 5', () => {
		const over = { mode: '2d', x1: '1', y1: '2', x2: '4', y2: '6' };
		expect(run(over).primaryResult).toBe('5');
		expect(metric(over, 'Midpoint')).toBe('(2.5, 4)');
		expect(metric(over, 'Slope')).toBe('1.3333');
	});

	it('matches the worked example: (−3, −1) and (2, 11) give 13, midpoint (−0.5, 5), slope 2.4', () => {
		const over = { mode: '2d', x1: '-3', y1: '-1', x2: '2', y2: '11' };
		expect(run(over).primaryResult).toBe('13');
		expect(metric(over, 'Midpoint')).toBe('(-0.5, 5)');
		expect(metric(over, 'Slope')).toBe('2.4');
	});

	it('computes 3D distance: (1, 2, 3) and (4, 6, 15) give 13 with midpoint (2.5, 4, 9)', () => {
		const over = { mode: '3d', x1: '1', y1: '2', z1: '3', x2: '4', y2: '6', z2: '15' };
		expect(run(over).primaryResult).toBe('13');
		expect(metric(over, 'Midpoint')).toBe('(2.5, 4, 9)');
		expect(run({ mode: '3d', x1: '0', y1: '0', z1: '0', x2: '1', y2: '1', z2: '1' }).primaryResult).toBe('1.7321');
	});

	it('reports an undefined slope for a vertical line', () => {
		const over = { mode: '2d', x1: '2', y1: '1', x2: '2', y2: '7' };
		expect(run(over).primaryResult).toBe('6');
		expect(metric(over, 'Slope')).toBe('Undefined (vertical line)');
	});

	it('returns a dash for a missing or junk coordinate', () => {
		expect(run({ mode: '2d', x1: 'abc', y1: '2', x2: '4', y2: '6' }).primaryResult).toBe('—');
		expect(run({ mode: '3d', x1: '1', y1: '2', z1: '', x2: '4', y2: '6', z2: '15' }).primaryResult).toBe('—');
	});
});
