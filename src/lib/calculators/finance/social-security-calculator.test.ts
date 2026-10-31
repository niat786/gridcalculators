import { describe, expect, it } from 'vitest';
import calc, { claimFactor, fraMonths, pia } from './social-security-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('social security calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$2,345');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,642');
		expect(r.secondaryMetrics?.[3].value).toBe('$2,908');
	});
	it('uses the SSA full retirement ages', () => {
		expect(fraMonths(1950)).toBe(792);
		expect(fraMonths(1957)).toBe(66 * 12 + 6);
		expect(fraMonths(1960)).toBe(804);
	});
	it('applies the SSA reduction and credit percentages', () => {
		expect(claimFactor(62 * 12, 67 * 12)).toBeCloseTo(0.7, 10);
		expect(claimFactor(66 * 12, 66 * 12 + 4)).toBeCloseTo(1 - 20 / 900 * 1, 10);
		expect(claimFactor(65 * 12, 66 * 12)).toBeCloseTo(0.9333333, 6);
		expect(claimFactor(70 * 12, 66 * 12)).toBeCloseTo(1.32, 10);
	});
	it('applies the three bend points', () => {
		expect(pia(10000)).toBeCloseTo(1157.4 + 0.32 * 6463 + 0.15 * 2251, 1); // 3563.21 → 3563.2
		expect(pia(10000)).toBe(3563.2);
	});
	it('caps earnings at the wage base', () => {
		expect(run({ earnings: '500000' }).primaryResult).toBe(run({ earnings: '184500' }).primaryResult);
	});
	it('needs 10 years of work', () => {
		expect(run({ years: '8' }).primaryResult).toBe('—');
	});
});
