import { describe, expect, it } from 'vitest';
import { evaluate } from './expr';

const ev = (s: string, angle: 'deg' | 'rad' = 'deg') => evaluate(s, { angle });

describe('keypad expression evaluator', () => {
	it('follows the order of operations', () => {
		expect(ev('2+3×4')).toBe(14);
		expect(ev('(2+3)×4')).toBe(20);
		expect(ev('2^3^2')).toBe(512);
		expect(ev('−2^2')).toBe(-4);
		expect(ev('10÷4')).toBe(2.5);
	});
	it('treats a bare percentage after + or − as a percent of the left side', () => {
		expect(ev('200+10%')).toBeCloseTo(220, 10);
		expect(ev('200−15%')).toBeCloseTo(170, 10);
		expect(ev('50+(5+5)%')).toBeCloseTo(55, 10);
	});
	it('keeps % as ÷100 elsewhere', () => {
		expect(ev('10%')).toBeCloseTo(0.1, 12);
		expect(ev('200×10%')).toBeCloseTo(20, 10);
		expect(ev('200÷10%')).toBeCloseTo(2000, 8);
		expect(ev('200+10%×2')).toBeCloseTo(200.2, 10); // not a bare percentage
	});
	it('reads the keypad e key as Euler’s number, never as an exponent', () => {
		expect(ev('2ℯ3')).toBeCloseTo(2 * Math.E * 3, 12);
		expect(ev('ℯ')).toBeCloseTo(Math.E, 12);
		expect(ev('2e3')).toBe(2000); // typed scientific notation still works
	});
	it('handles functions, constants and implicit multiplication', () => {
		expect(ev('sin(30)')).toBeCloseTo(0.5, 12);
		expect(ev('2π')).toBeCloseTo(2 * Math.PI, 12);
		expect(ev('√(16)')).toBe(4);
		expect(ev('5!')).toBe(120);
		expect(ev('3(4)')).toBe(12);
	});
	it('rejects bad input', () => {
		expect(() => ev('1÷0')).toThrow();
		expect(() => ev('2+')).toThrow();
	});
});
