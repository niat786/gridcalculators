import { describe, expect, it } from 'vitest';
import calc from './surface-area-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const part = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('surface area calculator', () => {
	it('computes a cube: edge 4 gives 96 with 16 per face', () => {
		const over = { shape: 'cube', edge: '4' };
		expect(run(over).primaryResult).toBe('96');
		expect(part(over, 'One face')).toBe('16');
		expect(part(over, 'Four side faces')).toBe('64');
		expect(part(over, 'Top and bottom')).toBe('32');
	});

	it('computes a box: 6 × 4 × 3 gives 108', () => {
		const over = { shape: 'box', length: '6', width: '4', height: '3' };
		expect(run(over).primaryResult).toBe('108');
		expect(part(over, 'Top and bottom')).toBe('48');
		expect(part(over, 'Front and back')).toBe('36');
		expect(part(over, 'Left and right')).toBe('24');
	});

	it('matches the cylinder check: radius 3, height 10 gives 245.0442', () => {
		const over = { shape: 'cylinder', radius: '3', height: '10' };
		expect(run(over).primaryResult).toBe('245.0442');
		expect(part(over, 'Curved side')).toBe('188.4956');
		expect(part(over, 'Top and bottom')).toBe('56.5487');
	});

	it('computes a sphere: radius 3 gives 36π, about 113.0973', () => {
		const over = { shape: 'sphere', radius: '3' };
		expect(run(over).primaryResult).toBe('113.0973');
		expect(part(over, 'Great circle area')).toBe('28.2743');
	});

	it('computes a cone: radius 3, height 4 has slant 5 and total 75.3982', () => {
		const over = { shape: 'cone', radius: '3', height: '4' };
		expect(run(over).primaryResult).toBe('75.3982');
		expect(part(over, 'Slant height')).toBe('5');
		expect(part(over, 'Curved side')).toBe('47.1239');
	});

	it('computes a square pyramid: base 6, height 4 gives 96', () => {
		const over = { shape: 'pyramid', baseEdge: '6', height: '4' };
		expect(run(over).primaryResult).toBe('96');
		expect(part(over, 'Slant height of a side')).toBe('5');
		expect(part(over, 'Square base')).toBe('36');
	});

	it('computes a triangular prism: base 6, length 10 gives 211.1769', () => {
		const over = { shape: 'prism', baseEdge: '6', prismLength: '10' };
		expect(run(over).primaryResult).toBe('211.1769');
		expect(part(over, 'One triangular end')).toBe('15.5885');
		expect(part(over, 'Three rectangular sides')).toBe('180');
	});

	it('computes a capsule: radius 2, straight length 5 gives 113.0973', () => {
		const over = { shape: 'capsule', radius: '2', straight: '5' };
		expect(run(over).primaryResult).toBe('113.0973');
		expect(part(over, 'Curved tube')).toBe('62.8319');
		expect(part(over, 'Two rounded ends')).toBe('50.2655');
	});

	it('returns a dash for zero or junk input', () => {
		expect(run({ shape: 'cube', edge: '0' }).primaryResult).toBe('—');
		expect(run({ shape: 'cone', radius: 'abc', height: '4' }).primaryResult).toBe('—');
		expect(run({ shape: 'prism', baseEdge: '-1', prismLength: '10' }).primaryResult).toBe('—');
	});
});
