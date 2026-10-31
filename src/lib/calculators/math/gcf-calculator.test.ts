import { describe, expect, it } from 'vitest';
import calc from './gcf-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (values: string) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), values }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('GCF calculator', () => {
	it('finds 6 for 12, 18 and 24 from its defaults', () => {
		const r = run('12, 18, 24');
		expect(r.primaryResult).toBe('6');
		expect(metric(r, 'Count')).toBe('3');
		expect(metric(r, 'Relatively prime?')).toBe('No');
	});

	it('finds 12 for 48 and 180 and shows the Euclid steps', () => {
		const r = run('48, 180');
		expect(r.primaryResult).toBe('12');
		expect(r.summary).toContain('180 = 3 × 48 + 36; 48 = 1 × 36 + 12; 36 = 3 × 12 + 0');
	});

	it('finds 1 for 17 and 31, which are relatively prime', () => {
		const r = run('17 31');
		expect(r.primaryResult).toBe('1');
		expect(metric(r, 'Relatively prime?')).toBe('Yes');
	});

	it('finds 25 for 100, 75 and 50 by combining pairs', () => {
		const r = run('100, 75, 50');
		expect(r.primaryResult).toBe('25');
		expect(r.summary).toContain('gcf(100, 75) = 25, then gcf(25, 50) = 25');
	});

	it('returns a dash for decimals', () => {
		expect(run('2.5, 4').primaryResult).toBe('—');
	});

	it('returns a dash for zero, a single number, or a value over 1e12', () => {
		expect(run('0, 4').primaryResult).toBe('—');
		expect(run('12').primaryResult).toBe('—');
		expect(run('1000000000001, 4').primaryResult).toBe('—');
	});
});
