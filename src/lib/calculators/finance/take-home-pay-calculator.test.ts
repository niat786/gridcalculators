import { describe, expect, it } from 'vitest';
import calc from './take-home-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('take-home pay calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$2,256.44');
		expect(r.summary).toContain('$58,668');
	});
	it('caps Social Security at the wage base', () => {
		const r = run({ salary: '300000', period: 'annual', k401: '0' });
		expect(r.secondaryMetrics?.[1].value).toBe('$11,439.00'); // 184,500 × 6.2%
		// Medicare 1.45% × 300,000 + 0.9% × 100,000 = 4,350 + 900
		expect(r.secondaryMetrics?.[2].value).toBe('$5,250.00');
	});
	it('applies a flat state rate', () => {
		// 5% × (75,000 − 3,750) = 3,562.50 a year
		expect(run({ state: '5', period: 'annual' }).secondaryMetrics?.[3].value).toBe('$3,562.50');
	});
	it('rejects deductions above salary', () => {
		expect(run({ salary: '10000', health: '20000' }).primaryResult).toBe('—');
	});
});
