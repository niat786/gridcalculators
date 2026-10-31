import { describe, expect, it } from 'vitest';
import calc, { fromRoman, romanParts } from './roman-numeral-converter.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('roman numeral converter', () => {
	it('converts the default 1994 to MCMXCIV with its breakdown', () => {
		const r = run();
		expect(r.primaryResult).toBe('MCMXCIV');
		expect(r.long).toBe(true);
		expect(r.summary).toContain('1,994 = M + CM + XC + IV');
	});

	it('converts 2026 to MMXXVI', () => {
		expect(run({ value: '2026' }).primaryResult).toBe('MMXXVI');
	});

	it('converts the top of the range, 3999, to MMMCMXCIX', () => {
		expect(run({ value: '3999' }).primaryResult).toBe('MMMCMXCIX');
	});

	it('converts 4 to IV and 1 to I', () => {
		expect(run({ value: '4' }).primaryResult).toBe('IV');
		expect(run({ value: '1' }).primaryResult).toBe('I');
	});

	it('reads a Roman numeral back as a number, in any letter case', () => {
		const r = run({ value: 'mcmxciv' });
		expect(r.primaryResult).toBe('1,994');
		expect(r.long).toBeFalsy();
		expect(r.summary).toContain('M + CM + XC + IV');
	});

	it('rejects invalid Roman forms by round-tripping: IIII, VV and IC', () => {
		expect(run({ value: 'IIII' }).primaryResult).toBe('—');
		expect(run({ value: 'VV' }).primaryResult).toBe('—');
		expect(run({ value: 'IC' }).primaryResult).toBe('—');
	});

	it('rejects numbers outside 1 to 3,999', () => {
		expect(run({ value: '0' }).primaryResult).toBe('—');
		expect(run({ value: '4000' }).primaryResult).toBe('—');
		expect(run({ value: 'MMMM' }).primaryResult).toBe('—');
	});

	it('rejects text that is neither digits nor Roman letters', () => {
		expect(run({ value: 'hello' }).primaryResult).toBe('—');
		expect(run({ value: '' }).primaryResult).toBe('—');
	});

	it('helpers split and read numerals', () => {
		expect(romanParts(1994)).toEqual(['M', 'CM', 'XC', 'IV']);
		expect(fromRoman('MCMXCIV')).toBe(1994);
	});
});
