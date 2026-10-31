import { describe, expect, it } from 'vitest';
import calc from './lease-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('lease calculator', () => {
	it('matches the default lease: $25,000 asset, 45% residual, 36 months at 6%, in advance', () => {
		// Residual 11,250. Arrears payment 474.55, advance = 474.55 ÷ 1.005 = 472.19
		const r = run();
		expect(r.primaryResult).toBe('$472.19');
		expect(r.secondaryMetrics?.[0].value).toBe('$16,998.86');
		expect(r.secondaryMetrics?.[1].value).toBe('$13,750.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$3,248.86');
		expect(r.secondaryMetrics?.[3].value).toBe('$11,250.00');
		expect(r.secondaryMetrics?.[4].value).toBe('6%');
		expect(r.secondaryMetrics?.[5].value).toBe('0.0025');
	});

	it('matches the worked example: $20,000 asset, $8,000 residual, 36 months at 6%', () => {
		const base = { asset: '20000', resMode: 'amount', resAmt: '8000', term: '36', rateType: 'rate', rate: '6' };
		expect(run({ ...base, timing: 'advance' }).primaryResult).toBe('$403.05');
		expect(run({ ...base, timing: 'advance' }).secondaryMetrics?.[0].value).toBe('$14,509.73');
		expect(run({ ...base, timing: 'advance' }).secondaryMetrics?.[2].value).toBe('$2,509.73');
		expect(run({ ...base, timing: 'arrears' }).primaryResult).toBe('$405.06');
	});

	it('gives the same payment for a money factor of 0.0025 as for a 6% rate', () => {
		const viaFactor = run({ rateType: 'factor', mf: '0.0025' });
		expect(viaFactor.primaryResult).toBe('$472.19');
		expect(viaFactor.secondaryMetrics?.[4].value).toBe('6%');
	});

	it('has no interest when the rate is 0%, so payments are the depreciation divided by the term', () => {
		// (10,000 − 0) ÷ 10 = 1,000
		const r = run({ asset: '10000', resMode: 'amount', resAmt: '0', term: '10', rate: '0', timing: 'advance' });
		expect(r.primaryResult).toBe('$1,000.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$10,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$0.00');
	});

	it('returns a dash when the residual value is not below the asset value', () => {
		expect(run({ resPct: '100' }).primaryResult).toBe('—');
	});

	it('returns a dash for a term of zero months', () => {
		expect(run({ term: '0' }).primaryResult).toBe('—');
	});
});
