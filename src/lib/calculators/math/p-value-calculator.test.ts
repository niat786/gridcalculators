import { describe, expect, it } from 'vitest';
import calc from './p-value-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('p-value calculator', () => {
	it('z = 1.96 two-tailed gives 0.049996 (the 0.05 table value)', () => {
		const r = run({ type: 'z', stat: '1.96', tail: 'two' });
		expect(r.primaryResult).toBe('0.049996');
		expect(r.primaryLabel).toBe('P-value, two-tailed');
		expect(metric(r, 'Significant at α = 0.05')).toBe('Yes');
		expect(metric(r, 'Significant at α = 0.01')).toBe('No');
	});

	it('z = 1.96 right-tailed gives 0.024998 and z = −1.645 left-tailed gives 0.049985', () => {
		expect(run({ type: 'z', stat: '1.96', tail: 'right' }).primaryResult).toBe('0.024998');
		expect(run({ type: 'z', stat: '-1.645', tail: 'left' }).primaryResult).toBe('0.049985');
	});

	it('z = 0 two-tailed gives 1', () => {
		expect(run({ type: 'z', stat: '0', tail: 'two' }).primaryResult).toBe('1');
	});

	it('t = 2.228 with df 10 two-tailed gives 0.050012 (the 0.05 table value)', () => {
		const r = run({ type: 't', stat: '2.228', df: '10', tail: 'two' });
		expect(r.primaryResult).toBe('0.050012');
		expect(metric(r, 'Significant at α = 0.05')).toBe('No');
		expect(metric(r, 'Distribution')).toBe('Student t, df = 10');
	});

	it('t = 1 with df 1 right-tailed is exactly 0.25 (Cauchy distribution)', () => {
		expect(run({ type: 't', stat: '1', df: '1', tail: 'right' }).primaryResult).toBe('0.25');
	});

	it('chi-square 3.841 with df 1 right-tailed gives 0.050014', () => {
		expect(run({ type: 'chi2', stat: '3.841', df: '1', tail: 'right' }).primaryResult).toBe('0.050014');
	});

	it('chi-square 2 with df 2 right-tailed is e⁻¹ = 0.367879', () => {
		expect(run({ type: 'chi2', stat: '2', df: '2', tail: 'right' }).primaryResult).toBe('0.367879');
	});

	it('F = 4.96 with df1 1 and df2 10 right-tailed gives 0.050088 (about 0.05)', () => {
		const r = run({ type: 'f', stat: '4.96', df1: '1', df2: '10', tail: 'right' });
		expect(r.primaryResult).toBe('0.050088');
		expect(metric(r, 'Distribution')).toBe('F, df1 = 1, df2 = 10');
	});

	it('F = 3 with df1 2 and df2 2 right-tailed is exactly 0.25 (equals 1 ÷ (1 + F))', () => {
		expect(run({ type: 'f', stat: '3', df1: '2', df2: '2', tail: 'right' }).primaryResult).toBe('0.25');
	});

	it('returns a dash for a negative chi-square value', () => {
		expect(run({ type: 'chi2', stat: '-1', df: '2' }).primaryResult).toBe('—');
	});

	it('returns a dash for two-tailed chi-square or F tests', () => {
		expect(run({ type: 'chi2', stat: '3', df: '1', tail: 'two' }).primaryResult).toBe('—');
		expect(run({ type: 'f', stat: '3', df1: '2', df2: '5', tail: 'two' }).primaryResult).toBe('—');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ stat: 'abc' }).primaryResult).toBe('—');
	});
});
