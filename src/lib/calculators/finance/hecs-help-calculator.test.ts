import { beforeEach, describe, expect, it } from 'vitest';
import calc, { helpPayoff } from './hecs-help-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { helpRepayment } from '../data/au-tax-2026-27';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('AUD'));

describe('hecs-help calculator (2026-27)', () => {
	it('matches the worked example', () => {
		// 15% × (85,000 − 69,528) = 2,320.80; simulated by hand in node: 17 years, 37,768.34 repaid
		const r = run();
		expect(r.primaryResult).toBe('A$2,320.80');
		expect(metric(r, 'Per month')).toBe('A$193.40');
		expect(metric(r, 'Estimated years to repay')).toBe('17 years');
		expect(metric(r, 'Total repaid (estimate)')).toBe('A$37,768');
	});

	it('follows the ATO thresholds exactly at each edge', () => {
		expect(helpRepayment(69_528)).toBe(0);
		expect(helpRepayment(69_529)).toBeCloseTo(0.15, 10);
		expect(helpRepayment(129_717)).toBeCloseTo(9_028.35, 6); // 15% × 60,189
		expect(helpRepayment(129_718)).toBeCloseTo(9_028.17, 6); // 9,028 + 17% × 1
		expect(helpRepayment(186_050)).toBeCloseTo(18_604.61, 6); // 9,028 + 17% × 56,333
		expect(helpRepayment(186_051)).toBeCloseTo(18_605.1, 6); // 10% of total
	});

	it('repays a $100,000 earner faster', () => {
		// 15% × 30,472 = 4,570.80 a year; hand simulation: 8 years, 33,625.39 total
		const r = run({ income: '100000' });
		expect(r.primaryResult).toBe('A$4,570.80');
		expect(metric(r, 'Estimated years to repay')).toBe('8 years');
		expect(metric(r, 'Total repaid (estimate)')).toBe('A$33,625');
	});

	it('caps the repayment at the balance', () => {
		// 150,000 income would repay 12,476.11, but only 10,000 × 1.028 = 10,280 is owed after indexation
		const r = run({ income: '150000', balance: '10000' });
		expect(r.primaryResult).toBe('A$10,000.00');
		expect(metric(r, 'Estimated years to repay')).toBe('1 year');
		expect(helpPayoff(10_000, 150_000, 2.8).repaid).toBeCloseTo(10_280, 6);
	});

	it('shows no repayment below the threshold, and never repays if indexation outpaces repayment', () => {
		const low = run({ income: '60000' });
		expect(low.primaryResult).toBe('A$0.00');
		expect(metric(low, 'Estimated years to repay')).toContain('No compulsory');
		// 72,000 income repays 370.80 a year on a 60,000 debt growing 1,680 a year
		expect(metric(run({ income: '72000', balance: '60000' }), 'Estimated years to repay')).toBe('More than 100 years');
	});

	it('handles zero balance and invalid input', () => {
		expect(metric(run({ balance: '0' }), 'Estimated years to repay')).toBe('No debt');
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ balance: '-1' }).primaryResult).toBe('—');
	});
});
