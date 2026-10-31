import { describe, expect, it } from 'vitest';
import calc from './fraction-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('fraction calculator', () => {
	it('adds 1/2 and 1/3 to 5/6 from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('5/6');
		expect(metric(r, 'Mixed number')).toBe('5/6');
		expect(metric(r, 'Decimal')).toBe('0.833333');
	});

	it('subtracts 1/6 from 3/4 to get 7/12', () => {
		const r = run({ num1: '3', den1: '4', op: 'sub', num2: '1', den2: '6' });
		expect(r.primaryResult).toBe('7/12');
		expect(metric(r, 'Decimal')).toBe('0.583333');
	});

	it('multiplies 2/3 by 3/4 to get 1/2 and shows the unsimplified product', () => {
		const r = run({ num1: '2', den1: '3', op: 'mul', num2: '3', den2: '4' });
		expect(r.primaryResult).toBe('1/2');
		expect(metric(r, 'Before simplifying')).toBe('6/12');
		expect(metric(r, 'Decimal')).toBe('0.5');
	});

	it('divides 1/2 by 1/4 to get 2', () => {
		const r = run({ op: 'div', num2: '1', den2: '4' });
		expect(r.primaryResult).toBe('2');
		expect(metric(r, 'Mixed number')).toBe('2');
	});

	it('adds the mixed numbers 1 1/2 and 1/4 to get 1 3/4', () => {
		const r = run({ whole1: '1', den2: '4' });
		expect(r.primaryResult).toBe('7/4');
		expect(metric(r, 'Mixed number')).toBe('1 3/4');
		expect(metric(r, 'Decimal')).toBe('1.75');
	});

	it('keeps the sign on a negative result: 1/2 minus 3/4 is -1/4', () => {
		const r = run({ op: 'sub', num2: '3', den2: '4' });
		expect(r.primaryResult).toBe('-1/4');
		expect(metric(r, 'Decimal')).toBe('-0.25');
	});

	it('returns a dash when a denominator is zero', () => {
		expect(run({ den1: '0' }).primaryResult).toBe('—');
		expect(run({ den2: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when dividing by zero', () => {
		expect(run({ op: 'div', num2: '0' }).primaryResult).toBe('—');
	});

	it('rejects non-integer parts', () => {
		expect(run({ num1: '1.5' }).primaryResult).toBe('—');
	});
});
