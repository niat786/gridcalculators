import { describe, expect, it } from 'vitest';
import calc, { convert, fmt } from './unit-converter.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('unit converter', () => {
	it('converts the default 100 cm to inches', () => {
		expect(run().primaryResult).toBe('39.37007874 in');
	});
	it('uses exact definitions', () => {
		expect(convert('length', 1, 'mi', 'km')).toBeCloseTo(1.609344, 12);
		expect(convert('mass', 1, 'kg', 'lb')).toBeCloseTo(2.2046226218, 9);
		expect(convert('volume', 1, 'gal', 'l')).toBeCloseTo(3.785411784, 12);
		expect(convert('area', 1, 'acre', 'ft2')).toBeCloseTo(43560, 6);
		expect(convert('pressure', 1, 'atm', 'psi')).toBeCloseTo(14.6959488, 6);
		expect(convert('data', 1, 'gib', 'mb')).toBeCloseTo(1073.741824, 9);
	});
	it('handles temperature offsets', () => {
		expect(convert('temperature', 100, 'c', 'f')).toBeCloseTo(212, 10);
		expect(convert('temperature', -40, 'f', 'c')).toBeCloseTo(-40, 10);
		expect(convert('temperature', 0, 'k', 'c')).toBeCloseTo(-273.15, 10);
		expect(run({ category: 'temperature', value: '-500', temperatureFrom: 'c' }).primaryResult).toBe('—');
	});
	it('formats extremes', () => {
		expect(fmt(1e-9)).toBe('1 × 10⁻⁹');
		expect(fmt(1234.5)).toBe('1,234.5');
		expect(run({ value: 'abc' }).primaryResult).toBe('—');
	});
});
