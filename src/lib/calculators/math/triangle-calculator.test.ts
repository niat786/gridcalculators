import { describe, expect, it } from 'vitest';
import calc from './triangle-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;
const cell = (over: Record<string, string>, measure: string, col: 't1' | 't2' = 't1') =>
	run(over).table?.rows.find((r) => r.measure === measure)?.[col];

describe('triangle calculator', () => {
	it('solves three sides: 3-4-5 is a right scalene triangle', () => {
		const over = { mode: 'sss', sideA: '3', sideB: '4', sideC: '5' };
		expect(run(over).primaryResult).toBe('6');
		expect(cell(over, 'Angle A')).toBe('36.8699°');
		expect(cell(over, 'Angle C')).toBe('90°');
		expect(metric(over, 'Perimeter')).toBe('12');
		expect(metric(over, 'Type by angles')).toBe('Right');
		expect(metric(over, 'Type by sides')).toBe('Scalene');
	});

	it('solves an equilateral triangle: side 6 gives area 15.5885', () => {
		const over = { mode: 'sss', sideA: '6', sideB: '6', sideC: '6' };
		expect(run(over).primaryResult).toBe('15.5885');
		expect(cell(over, 'Angle B')).toBe('60°');
		expect(metric(over, 'Type by angles')).toBe('Acute');
		expect(metric(over, 'Type by sides')).toBe('Equilateral');
	});

	it('matches the worked example: SAS with sides 5 and 7 and angle C 60°', () => {
		const over = { mode: 'sas', sideA: '5', sideB: '7', angleC: '60' };
		expect(run(over).primaryResult).toBe('15.1554');
		expect(cell(over, 'Side c')).toBe('6.245');
		expect(cell(over, 'Angle A')).toBe('43.8979°');
		expect(cell(over, 'Angle B')).toBe('76.1021°');
		expect(metric(over, 'Perimeter')).toBe('18.245');
	});

	it('solves ASA: angles 30° and 60° with side c = 10 gives a right triangle', () => {
		const over = { mode: 'asa', angleA: '30', angleB: '60', sideC: '10' };
		expect(run(over).primaryResult).toBe('21.6506');
		expect(cell(over, 'Side a')).toBe('5');
		expect(cell(over, 'Side b')).toBe('8.6603');
		expect(metric(over, 'Type by angles')).toBe('Right');
	});

	it('solves AAS: angles 30° and 60° with side a = 5 gives the same triangle', () => {
		const over = { mode: 'aas', angleA: '30', angleB: '60', sideA: '5' };
		expect(cell(over, 'Side c')).toBe('10');
		expect(run(over).primaryResult).toBe('21.6506');
	});

	it('shows both triangles for SSA when two fit', () => {
		const over = { mode: 'ssa', sideA: '4', sideB: '5', angleA: '30' };
		expect(run(over).primaryResult).toBe('2 triangles');
		expect(cell(over, 'Angle B', 't1')).toBe('38.6822°');
		expect(cell(over, 'Angle B', 't2')).toBe('141.3178°');
		expect(metric(over, 'Area (Heron)')).toBe('9.3158 and 1.5095');
	});

	it('gives one triangle for SSA when side a is longer than side b', () => {
		const over = { mode: 'ssa', sideA: '10', sideB: '5', angleA: '30' };
		expect(run(over).primaryResult).toBe('17.5157');
		expect(cell(over, 'Angle B')).toBe('14.4775°');
	});

	it('returns a dash when no triangle can exist', () => {
		expect(run({ mode: 'sss', sideA: '1', sideB: '2', sideC: '10' }).primaryResult).toBe('—');
		expect(run({ mode: 'ssa', sideA: '2', sideB: '5', angleA: '30' }).primaryResult).toBe('—');
		expect(run({ mode: 'asa', angleA: '100', angleB: '90', sideC: '4' }).primaryResult).toBe('—');
		expect(run({ mode: 'sas', sideA: '5', sideB: '7', angleC: '0' }).primaryResult).toBe('—');
	});
});
