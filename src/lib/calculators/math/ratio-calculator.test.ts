import { describe, expect, it } from 'vitest';
import calc from './ratio-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('ratio calculator', () => {
	it('simplifies 12 : 18 to 2 : 3 from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('2:3');
		expect(r.secondaryMetrics?.[0].value).toBe('0.666667');
	});

	it('simplifies decimals: 0.5 : 0.75 is 2 : 3', () => {
		expect(run({ a: '0.5', b: '0.75' }).primaryResult).toBe('2:3');
	});

	it('simplifies 1.25 : 2 to 5 : 8', () => {
		expect(run({ a: '1.25', b: '2' }).primaryResult).toBe('5:8');
	});

	it('leaves 7 : 5 unchanged', () => {
		expect(run({ a: '7', b: '5' }).primaryResult).toBe('7:5');
	});

	it('solves 2 : 3 = 4 : ? to get 6', () => {
		const r = run({ mode: 'solve', a: '2', b: '3', c: '4' });
		expect(r.primaryResult).toBe('6');
		expect(r.secondaryMetrics?.[0].value).toBe('2 : 3 = 4 : 6');
	});

	it('solves 3 : 5 = 9 : ? to get 15', () => {
		expect(run({ mode: 'solve', a: '3', b: '5', c: '9' }).primaryResult).toBe('15');
	});

	it('solves 0.5 : 1 = 4 : ? to get 8', () => {
		expect(run({ mode: 'solve', a: '0.5', b: '1', c: '4' }).primaryResult).toBe('8');
	});

	it('returns a dash for a zero value', () => {
		expect(run({ a: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'solve', a: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty value', () => {
		expect(run({ b: '' }).primaryResult).toBe('—');
	});
});
