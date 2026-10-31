import { describe, expect, it } from 'vitest';
import calc from './big-number-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('big number calculator', () => {
	it('multiplies 123456789 × 987654321 exactly', () => {
		const r = run({ a: '123456789', b: '987654321', op: 'multiply' });
		expect(r.primaryResult).toBe('121932631112635269');
		expect(r.long).toBe(true);
		expect(metric(r, 'Digits in the result')).toBe('18');
	});

	it('adds 99999999999999999999 + 1 to get 100000000000000000000 (21 digits)', () => {
		const r = run({ a: '99999999999999999999', b: '1', op: 'add' });
		expect(r.primaryResult).toBe('100000000000000000000');
		expect(metric(r, 'Digits in the result')).toBe('21');
	});

	it('subtracts 5 − 12 to get −7, with a negative sign', () => {
		const r = run({ a: '5', b: '12', op: 'subtract' });
		expect(r.primaryResult).toBe('-7');
		expect(metric(r, 'Sign')).toBe('Negative');
	});

	it('gives 2¹⁰⁰ = 1267650600228229401496703205376 with 31 digits', () => {
		const r = run({ a: '2', b: '100', op: 'power' });
		expect(r.primaryResult).toBe('1267650600228229401496703205376');
		expect(metric(r, 'Digits in the result')).toBe('31');
	});

	it('gives 10¹⁰⁰⁰⁰ with 10,001 digits, the largest allowed power of 10', () => {
		const r = run({ a: '10', b: '10000', op: 'power' });
		expect(metric(r, 'Digits in the result')).toBe('10,001');
	});

	it('divides 10³⁰ by 7 to get quotient 142857142857142857142857142857', () => {
		const a = '1' + '0'.repeat(30);
		expect(run({ a, b: '7', op: 'quotient' }).primaryResult).toBe('142857142857142857142857142857');
		expect(run({ a, b: '7', op: 'remainder' }).primaryResult).toBe('1');
	});

	it('takes the remainder of −7 by 3 as −1 and the modulo as 2', () => {
		expect(run({ a: '-7', b: '3', op: 'remainder' }).primaryResult).toBe('-1');
		expect(run({ a: '-7', b: '3', op: 'modulo' }).primaryResult).toBe('2');
	});

	it('finds gcd(462, 1071) = 21, and gcd(0, 5) = 5', () => {
		expect(run({ a: '462', b: '1071', op: 'gcd' }).primaryResult).toBe('21');
		expect(run({ a: '0', b: '5', op: 'gcd' }).primaryResult).toBe('5');
	});

	it('returns a dash for a decimal', () => {
		expect(run({ a: '1.5', b: '2', op: 'add' }).primaryResult).toBe('—');
	});

	it('returns a dash for division by zero', () => {
		expect(run({ a: '10', b: '0', op: 'quotient' }).primaryResult).toBe('—');
	});

	it('returns a dash for a power with exponent 10,001 or a negative exponent', () => {
		expect(run({ a: '2', b: '10001', op: 'power' }).primaryResult).toBe('—');
		expect(run({ a: '2', b: '-1', op: 'power' }).primaryResult).toBe('—');
	});

	it('returns a dash for a power that would exceed 100,000 digits', () => {
		expect(run({ a: '99999999999', b: '10000', op: 'power' }).primaryResult).toBe('—');
	});

	it('returns a dash for a number with more than 10,000 digits', () => {
		expect(run({ a: '1'.repeat(10001), b: '1', op: 'add' }).primaryResult).toBe('—');
	});
});
