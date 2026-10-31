import { describe, expect, it } from 'vitest';
import calc from './lcm-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (values: string) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), values }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('LCM calculator', () => {
	it('finds 72 for 12, 18 and 24 from its defaults', () => {
		const r = run('12, 18, 24');
		expect(r.primaryResult).toBe('72');
		expect(metric(r, 'Greatest common factor')).toBe('6');
		expect(metric(r, 'Product of all numbers')).toBe('5,184');
	});

	it('finds 12 for 4 and 6 and shows the formula', () => {
		const r = run('4 6');
		expect(r.primaryResult).toBe('12');
		expect(r.summary).toContain('4 × 6 ÷ 2 = 12');
	});

	it('finds 42 for 21 and 6', () => {
		expect(run('21, 6').primaryResult).toBe('42');
	});

	it('finds 35 for coprime 5 and 7, which is their product', () => {
		expect(run('5, 7').primaryResult).toBe('35');
	});

	it('stays exact past 2⁵³: LCM of 10¹² and 10¹² − 1', () => {
		const r = run('1000000000000, 999999999999');
		expect(r.primaryResult).toBe('999,999,999,999,000,000,000,000');
		expect(r.long).toBe(true);
	});

	it('returns a dash for decimals', () => {
		expect(run('2.5, 4').primaryResult).toBe('—');
	});

	it('returns a dash for zero, a single number, or a value over 1e12', () => {
		expect(run('0, 4').primaryResult).toBe('—');
		expect(run('7').primaryResult).toBe('—');
		expect(run('1000000000001, 4').primaryResult).toBe('—');
	});
});
