import { describe, expect, it } from 'vitest';
import calc from './volume-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const surface = (over: Record<string, string>) => run(over).secondaryMetrics?.[0]?.value;

describe('volume calculator', () => {
	it('matches the worked example: cylinder, radius 3, height 10', () => {
		const over = { shape: 'cylinder', radius: '3', height: '10' };
		expect(run(over).primaryResult).toBe('282.7433');
		expect(surface(over)).toBe('245.0442');
	});

	it('computes a cube: 4 cm edge gives 64 and 96', () => {
		const over = { shape: 'cube', edge: '4' };
		expect(run(over).primaryResult).toBe('64');
		expect(surface(over)).toBe('96');
	});

	it('computes a box: 6 × 4 × 3 gives 72 and 108', () => {
		const over = { shape: 'box', length: '6', width: '4', height: '3' };
		expect(run(over).primaryResult).toBe('72');
		expect(surface(over)).toBe('108');
	});

	it('computes a sphere: radius 3 gives 36π and 36π of surface', () => {
		const over = { shape: 'sphere', radius: '3' };
		expect(run(over).primaryResult).toBe('113.0973');
		expect(surface(over)).toBe('113.0973');
	});

	it('computes a cone, a hemisphere, a square pyramid and a capsule', () => {
		expect(run({ shape: 'cone', radius: '3', height: '4' }).primaryResult).toBe('37.6991');
		expect(run({ shape: 'hemisphere', radius: '3' }).primaryResult).toBe('56.5487');
		expect(run({ shape: 'pyramid', baseEdge: '4', height: '9' }).primaryResult).toBe('48');
		expect(run({ shape: 'capsule', radius: '2', straight: '5' }).primaryResult).toBe('96.3422');
	});

	it('returns a dash for zero or junk input', () => {
		expect(run({ shape: 'cube', edge: '0' }).primaryResult).toBe('—');
		expect(run({ shape: 'cylinder', height: 'abc' }).primaryResult).toBe('—');
		expect(run({ shape: 'sphere', radius: '-2' }).primaryResult).toBe('—');
	});
});
