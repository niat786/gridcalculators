import { describe, expect, it } from 'vitest';
import calc from './college-cost-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('college cost calculator', () => {
	it('matches the worked example: $25,000 a year, 10 years away, 5% cost rise', () => {
		// Cost in year 1 = 25,000 × 1.05^10 = 40,722.37; four years total 175,518.49
		// Savings: 20,000 × 1.005^120 + 500 × (1.005^120 − 1) ÷ 0.005 = 118,327.61
		const r = run();
		expect(r.primaryResult).toBe('$175,518.49');
		expect(r.secondaryMetrics?.[0].value).toBe('$40,722.37');
		expect(r.secondaryMetrics?.[1].value).toBe('$118,327.61');
		expect(r.secondaryMetrics?.[2].label).toBe('Shortfall');
		expect(r.secondaryMetrics?.[2].value).toBe('$57,190.88');
		expect(r.secondaryMetrics?.[3].value).toBe('$848.98');
		expect(r.secondaryMetrics?.[4].value).toBe('$348.98');
	});

	it('works with no inflation and no growth: $10,000 a year for 4 years needs $40,000', () => {
		// No savings, so the shortfall is 40,000 and 40,000 ÷ 12 months = 3,333.33 a month
		const r = run({ cost: '10000', years: '1', study: '4', inflation: '0', savings: '0', ret: '0', monthly: '0' });
		expect(r.primaryResult).toBe('$40,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$40,000.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$3,333.33');
		expect(r.secondaryMetrics?.[4].value).toBe('$3,333.33');
	});

	it('reports a surplus and no extra saving when savings already cover the cost', () => {
		// Two years of study at 10,000 = 20,000; savings 50,000 → surplus 30,000
		const r = run({ cost: '10000', years: '2', study: '2', inflation: '0', savings: '50000', ret: '0', monthly: '0' });
		expect(r.primaryResult).toBe('$20,000.00');
		expect(r.secondaryMetrics?.[2].label).toBe('Surplus');
		expect(r.secondaryMetrics?.[2].value).toBe('$30,000.00');
		expect(r.secondaryMetrics?.[4].value).toBe('$0.00');
	});

	it('grows savings monthly at the return: $10,000 for 12 months at 12% becomes $11,268.25', () => {
		// Cost 5,000 in one year of study → surplus 11,268.25 − 5,000 = 6,268.25
		const r = run({ cost: '5000', years: '1', study: '1', inflation: '0', savings: '10000', ret: '12', monthly: '0' });
		expect(r.secondaryMetrics?.[1].value).toBe('$11,268.25');
		expect(r.secondaryMetrics?.[2].value).toBe('$6,268.25');
	});

	it('returns a dash when years until college is zero', () => {
		expect(run({ years: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative yearly cost', () => {
		expect(run({ cost: '-5' }).primaryResult).toBe('—');
	});
});
