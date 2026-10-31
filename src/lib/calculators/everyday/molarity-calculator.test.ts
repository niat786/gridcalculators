import { describe, expect, it } from 'vitest';
import calc from './molarity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('molarity calculator', () => {
	it('matches the worked example: 5.844 g NaCl in 100 mL is 1 M', () => {
		const r = run();
		expect(r.primaryResult).toBe('1 M');
		expect(metric(r, 'Moles of solute')).toBe('0.1 mol');
		expect(metric(r, 'Volume of solution')).toBe('100 mL');
	});

	it('solves molarity for glucose: 9 g of C6H12O6 (180.16 g/mol) in 250 mL is 0.1998 M', () => {
		// 9 ÷ 180.16 = 0.04996 mol; 0.04996 ÷ 0.25 L = 0.1998 M
		const r = run({ solve: 'molarity', mass: '9', molarMass: '180.16', volume: '250' });
		expect(r.primaryResult).toBe('0.1998 M');
		expect(metric(r, 'Moles of solute')).toBe('0.04996 mol');
	});

	it('gives the mass for a target: 0.5 M NaCl in 100 mL needs 2.922 g', () => {
		// 0.5 × 0.1 L = 0.05 mol; 0.05 × 58.44 = 2.922 g
		const r = run({ solve: 'mass', targetM: '0.5', volume: '100', molarMass: '58.44' });
		expect(r.primaryResult).toBe('2.922 g');
		expect(metric(r, 'Molarity')).toBe('0.5 M');
	});

	it('gives the volume for a target: 5.844 g NaCl at 0.5 M is 200 mL', () => {
		// 0.1 mol ÷ 0.5 M = 0.2 L
		const r = run({ solve: 'volume', mass: '5.844', molarMass: '58.44', targetM: '0.5' });
		expect(r.primaryResult).toBe('200 mL');
	});

	it('works in litres: 0.1 M of a 180.16 g/mol solute in 0.25 L needs 4.504 g', () => {
		// 0.1 M × 0.25 L = 0.025 mol; 0.025 × 180.16 = 4.504 g
		const r = run({ solve: 'mass', targetM: '0.1', volume: '0.25', volumeUnit: 'L', molarMass: '180.16' });
		expect(r.primaryResult).toBe('4.504 g');
	});

	it('returns a dash for a zero volume when solving molarity', () => {
		expect(run({ volume: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a zero target molarity when solving volume', () => {
		expect(run({ solve: 'volume', targetM: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a blank molar mass', () => {
		expect(run({ molarMass: '' }).primaryResult).toBe('—');
	});
});
