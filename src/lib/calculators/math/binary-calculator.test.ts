import { describe, expect, it } from 'vitest';
import calc from './binary-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('binary calculator', () => {
	it('converts decimal 100 to binary 1100100 from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('1100100');
		expect(metric(r, 'Decimal')).toBe('100');
		expect(metric(r, 'Hexadecimal')).toBe('64');
		expect(metric(r, 'Octal')).toBe('144');
	});

	it('converts binary 1011 to decimal 11', () => {
		const r = run({ from: 'binary', value: '1011' });
		expect(r.primaryResult).toBe('11');
		expect(metric(r, 'Binary')).toBe('1011');
	});

	it('stays exact for 2⁶⁴ − 1, which is sixty-four 1s', () => {
		const r = run({ value: '18446744073709551615' });
		expect(r.primaryResult).toBe('1'.repeat(64));
		expect(metric(r, 'Hexadecimal')).toBe('FFFFFFFFFFFFFFFF');
		expect(metric(r, 'Decimal')).toBe('18,446,744,073,709,551,615');
	});

	it('ignores spaces in binary input: 1010 1010 is 170', () => {
		expect(run({ from: 'binary', value: '1010 1010' }).primaryResult).toBe('170');
	});

	it('adds 1011 and 101 to get 10000, which is 16', () => {
		const r = run({ mode: 'arithmetic' });
		expect(r.primaryResult).toBe('10000');
		expect(metric(r, 'Decimal')).toBe('16');
	});

	it('subtracts 1011 from 101 to get −110, which is −6', () => {
		const r = run({ mode: 'arithmetic', a: '101', op: 'sub', b: '1011' });
		expect(r.primaryResult).toBe('−110');
		expect(metric(r, 'Decimal')).toBe('−6');
	});

	it('multiplies 1011 by 101 to get 110111, which is 55', () => {
		const r = run({ mode: 'arithmetic', op: 'mul' });
		expect(r.primaryResult).toBe('110111');
		expect(metric(r, 'Decimal')).toBe('55');
	});

	it('divides 1011 by 101 to get quotient 10 and remainder 1', () => {
		const r = run({ mode: 'arithmetic', op: 'div' });
		expect(r.primaryResult).toBe('10');
		expect(metric(r, 'Remainder')).toBe('1 (decimal 1)');
	});

	it('returns a dash for a digit that is not binary', () => {
		expect(run({ from: 'binary', value: '102' }).primaryResult).toBe('—');
		expect(run({ mode: 'arithmetic', a: '12' }).primaryResult).toBe('—');
	});

	it('returns a dash when dividing by zero', () => {
		expect(run({ mode: 'arithmetic', op: 'div', b: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for empty input', () => {
		expect(run({ value: '' }).primaryResult).toBe('—');
	});
});
