import { describe, expect, it } from 'vitest';
import calc from './gdp-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('gdp calculator', () => {
	it('matches the worked example: C 14,000 + I 3,500 + G 4,000 + (X 2,800 − M 3,100) is $21,200', () => {
		// 14,000 + 3,500 + 4,000 + (−300) = 21,200
		const r = run();
		expect(r.primaryResult).toBe('$21,200');
		expect(r.secondaryMetrics?.[3].value).toBe('-$300');
		expect(r.secondaryMetrics?.[0].value).toBe('66%');
		expect(r.secondaryMetrics?.[1].value).toBe('16.5%');
		expect(r.secondaryMetrics?.[2].value).toBe('18.9%');
		expect(r.secondaryMetrics?.[4].value).toBe('-1.4%');
	});

	it('shows each component in the table, with imports subtracted', () => {
		const rows = run().table?.rows ?? [];
		expect(rows[0]).toEqual({ part: 'Consumption (C)', amount: '$14,000', share: '66%' });
		expect(rows[4].amount).toBe('-$3,100');
		expect(rows[6].share).toBe('100%');
	});

	it('gives a small economy of C 100, I 20, G 30, X 25, M 35 as $140', () => {
		// 100 + 20 + 30 + (25 − 35) = 140; consumption share 100 ÷ 140 = 71.4%
		const r = run({ consumption: '100', investment: '20', government: '30', exports: '25', imports: '35' });
		expect(r.primaryResult).toBe('$140');
		expect(r.secondaryMetrics?.[0].value).toBe('71.4%');
	});

	it('shows a trade surplus when exports exceed imports: $22,500 with net exports of $1,000', () => {
		// 14,000 + 3,500 + 4,000 + (4,000 − 3,000) = 22,500
		const r = run({ exports: '4000', imports: '3000' });
		expect(r.primaryResult).toBe('$22,500');
		expect(r.secondaryMetrics?.[3].value).toBe('$1,000');
	});

	it('returns a dash for a negative amount, a missing amount or zero GDP', () => {
		expect(run({ investment: '-5' }).primaryResult).toBe('—');
		expect(run({ government: '' }).primaryResult).toBe('—');
		expect(run({ consumption: '0', investment: '0', government: '0', exports: '0', imports: '0' }).primaryResult).toBe('—');
	});
});
