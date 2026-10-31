import { describe, expect, it } from 'vitest';
import calc from './probability-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('probability calculator', () => {
	it('gives P(A and B) = 15% and P(A or B) = 65% for 30% and 50% (the default)', () => {
		const r = run();
		expect(r.primaryResult).toBe('15%');
		expect(metric(r, 'P(A or B)')).toBe('65%');
		expect(metric(r, 'P(A but not B)')).toBe('15%');
		expect(metric(r, 'P(neither A nor B)')).toBe('35%');
		expect(metric(r, 'P(not A)')).toBe('70%');
		expect(metric(r, 'P(not B)')).toBe('50%');
	});

	it('gives P(A and B) = 2.5% for 25% and 10%', () => {
		expect(run({ pA: '25', pB: '10' }).primaryResult).toBe('2.5%');
	});

	it('gives P(A or B) = 100% when one event is certain', () => {
		expect(metric(run({ pA: '100', pB: '20' }), 'P(A or B)')).toBe('100%');
	});

	it('gives exactly 2 successes in 5 trials at 10% as 7.29%', () => {
		const r = run({ mode: 'trials', pTrial: '10', trials: '5', k: '2' });
		expect(r.primaryResult).toBe('7.29%');
		expect(metric(r, 'P(no successes)')).toBe('59.049%');
		expect(metric(r, 'P(at least one success)')).toBe('40.951%');
		expect(metric(r, 'P(at most k successes)')).toBe('99.144%');
	});

	it('gives exactly 3 heads in 3 fair coin flips as 12.5%', () => {
		expect(run({ mode: 'trials', pTrial: '50', trials: '3', k: '3' }).primaryResult).toBe('12.5%');
	});

	it('gives 1 − 0.9^10 = 65.1322% for at least one success in 10 trials at 10%', () => {
		expect(metric(run({ mode: 'trials', pTrial: '10', trials: '10', k: '0' }), 'P(at least one success)')).toBe(
			'65.1322%'
		);
	});

	it('returns a dash when k is larger than the number of trials', () => {
		expect(run({ mode: 'trials', trials: '3', k: '4' }).primaryResult).toBe('—');
	});

	it('returns a dash for a probability above 100%', () => {
		expect(run({ pA: '150' }).primaryResult).toBe('—');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ pA: 'abc' }).primaryResult).toBe('—');
	});
});
