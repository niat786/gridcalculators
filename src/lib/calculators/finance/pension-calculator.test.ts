import { describe, expect, it } from 'vitest';
import calc from './pension-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('pension calculator', () => {
	it('matches the worked example: $300,000 lump vs $1,500 a month for 25 years at 4%', () => {
		const r = run();
		expect(r.primaryResult).toBe('$286,316.22');
		expect(r.secondaryMetrics?.[1].value).toBe('-$13,683.78');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,571.69');
		expect(r.secondaryMetrics?.[3].value).toBe('$450,000.00');
		expect(r.secondaryMetrics?.[4].value).toBe('3.54%');
		expect(r.summary).toBe('At 4%, the lump sum is worth $13,683.78 more than the pension in today’s money.');
	});

	it('at a 0% rate the present value is the plain total of the payments', () => {
		// 25 years × 12 × $1,500 = $450,000
		const r = run({ rate: '0' });
		expect(r.primaryResult).toBe('$450,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$1,000.00');
	});

	it('applies a 2% yearly increase: 23 years, $1,200 a month, 5% rate', () => {
		// Independent check: PV = Σ 1200 × 1.02^⌊(k−1)/12⌋ × 1.05^(−k/12) over 276 months = $238,876.81
		const r = run({ lump: '250000', monthly: '1200', retireAge: '62', lifeAge: '85', cola: '2', rate: '5' });
		expect(r.primaryResult).toBe('$238,876.81');
		expect(r.secondaryMetrics?.[3].value).toBe('$415,367.47');
	});

	it('says the pension is worth more when the lump sum is small', () => {
		const r = run({ lump: '100000' });
		expect(r.summary).toContain('the pension is worth');
		expect(r.secondaryMetrics?.[1].value.startsWith('$')).toBe(true);
	});

	it('returns a dash when life expectancy is not after retirement', () => {
		const r = run({ retireAge: '70', lifeAge: '65' });
		expect(r.primaryResult).toBe('—');
	});
});
