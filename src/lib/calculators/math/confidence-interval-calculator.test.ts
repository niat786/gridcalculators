import { describe, expect, it } from 'vitest';
import calc from './confidence-interval-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('confidence interval calculator', () => {
	it('uses the t interval for the default small sample (n = 25)', () => {
		const r = run();
		expect(r.primaryResult).toBe('45.0466 to 54.9534');
		expect(metric(r, 'z interval, for comparison')).toBe('45.296086 to 54.703914');
		expect(r.primaryLabel).toBe('95% confidence interval (t, df = 24)');
		expect(metric(r, 'Critical t (df = n − 1)')).toBe('2.063899');
		expect(metric(r, 'Standard error (s ÷ √n)')).toBe('2.4');
	});

	it('shows the t interval for n = 11 and matches t(0.975, 10) = 2.228139', () => {
		const r = run({ n: '11' });
		expect(metric(r, 'Critical t (df = n − 1)')).toBe('2.228139');
		expect(r.primaryResult).toBe('41.9383 to 58.0617');
	});

	it('does not show a t interval at n = 30 or more', () => {
		expect(metric(run({ n: '30' }), 'Critical t (df = n − 1)')).toBeUndefined();
	});

	it('gives the 99% z interval 9.4848 to 10.5152 for mean 10, sd 2, n 100', () => {
		const r = run({ mean: '10', sd: '2', n: '100', level: '99' });
		expect(r.primaryResult).toBe('9.4848 to 10.5152');
		expect(metric(r, 'Critical z')).toBe('2.575829');
	});

	it('gives a zero-width interval when the standard deviation is 0', () => {
		expect(run({ sd: '0' }).primaryResult).toBe('50 to 50');
	});

	it('returns a dash for a sample of one', () => {
		expect(run({ n: '1' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative standard deviation', () => {
		expect(run({ sd: '-3' }).primaryResult).toBe('—');
	});

	it('returns a dash for a mean that is not a number', () => {
		expect(run({ mean: 'abc' }).primaryResult).toBe('—');
	});
});
