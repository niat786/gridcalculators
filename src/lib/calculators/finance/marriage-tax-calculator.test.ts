import { describe, expect, it } from 'vitest';
import calc from './marriage-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('marriage tax calculator', () => {
	it('matches the worked example (bonus)', () => {
		const r = run();
		expect(r.primaryResult).toBe('$3,520');
		expect(r.primaryLabel).toBe('Marriage bonus');
	});
	it('shows no difference for equal middle incomes', () => {
		expect(run({ a: '80000', b: '80000' }).primaryResult).toBe('$0');
	});
	it('shows a penalty at the top bracket', () => {
		// Each $1,000,000: 37% joint threshold 768,700 < 2 × 640,600
		const r = run({ a: '1000000', b: '1000000' });
		expect(r.primaryLabel).toBe('Marriage penalty');
	});
	it('shows a penalty when a parent loses head of household', () => {
		expect(run({ a: '60000', b: '60000', kids: '1' }).primaryLabel).toBe('Marriage penalty');
	});
});
