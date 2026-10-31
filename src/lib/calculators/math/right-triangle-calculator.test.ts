import { describe, expect, it } from 'vitest';
import calc from './right-triangle-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('right triangle calculator', () => {
	it('matches the default 3-4-5 triangle from two legs', () => {
		const over = { known: 'legs', a: '3', b: '4' };
		expect(run(over).primaryResult).toBe('5');
		expect(metric(over, 'Angle A (opposite a)')).toBe('36.8699°');
		expect(metric(over, 'Angle B (opposite b)')).toBe('53.1301°');
		expect(metric(over, 'Area')).toBe('6');
		expect(metric(over, 'Perimeter')).toBe('12');
		expect(metric(over, 'Height to hypotenuse')).toBe('2.4');
	});

	it('matches the worked example: legs 8 and 15', () => {
		const over = { known: 'legs', a: '8', b: '15' };
		expect(run(over).primaryResult).toBe('17');
		expect(metric(over, 'Angle A (opposite a)')).toBe('28.0725°');
		expect(metric(over, 'Angle B (opposite b)')).toBe('61.9275°');
		expect(metric(over, 'Area')).toBe('60');
		expect(metric(over, 'Perimeter')).toBe('40');
		expect(metric(over, 'Height to hypotenuse')).toBe('7.0588');
	});

	it('finds a missing leg from a leg and the hypotenuse, on either side', () => {
		expect(metric({ known: 'legHyp', legSide: 'a', leg: '5', c: '13' }, 'Leg b')).toBe('12');
		expect(metric({ known: 'legHyp', legSide: 'b', leg: '12', c: '13' }, 'Leg a')).toBe('5');
	});

	it('solves from a leg and an acute angle', () => {
		const over = { known: 'legAngle', legSide: 'a', leg: '10', angle: '45' };
		expect(run(over).primaryResult).toBe('14.1421');
		expect(metric(over, 'Leg b')).toBe('10');
		expect(run({ known: 'legAngle', legSide: 'b', leg: '10', angle: '45' }).primaryResult).toBe('14.1421');
	});

	it('solves from the hypotenuse and an acute angle', () => {
		const over = { known: 'hypAngle', c: '10', angle: '30' };
		expect(metric(over, 'Leg a')).toBe('5');
		expect(metric(over, 'Leg b')).toBe('8.6603');
	});

	it('returns a dash for impossible or junk input', () => {
		expect(run({ known: 'legHyp', legSide: 'a', leg: '5', c: '4' }).primaryResult).toBe('—');
		expect(run({ known: 'legs', a: '0', b: '4' }).primaryResult).toBe('—');
		expect(run({ known: 'legAngle', legSide: 'a', leg: '10', angle: '90' }).primaryResult).toBe('—');
		expect(run({ known: 'hypAngle', c: '10', angle: 'abc' }).primaryResult).toBe('—');
	});
});
