import { describe, expect, it } from 'vitest';
import calc from './factor-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (n: string) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), n }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('factor calculator', () => {
	it('lists 24 factors of 360 from its defaults', () => {
		const r = run('360');
		expect(r.primaryResult).toBe('1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180, 360');
		expect(metric(r, 'Number of factors')).toBe('24');
		expect(metric(r, 'Factor pairs')).toBe('12');
		expect(metric(r, 'Prime?')).toBe('No');
		expect(r.long).toBe(true);
	});

	it('finds the nine factors of 36, a perfect square', () => {
		const r = run('36');
		expect(r.primaryResult).toBe('1, 2, 3, 4, 6, 9, 12, 18, 36');
		expect(metric(r, 'Perfect square?')).toBe('Yes');
		expect(r.long).toBe(false);
	});

	it('recognises 13 as prime with factors 1 and 13', () => {
		const r = run('13');
		expect(r.primaryResult).toBe('1, 13');
		expect(metric(r, 'Prime?')).toBe('Yes');
	});

	it('counts 169 factors for 10¹² and caps the pairs table at 50 rows', () => {
		const r = run('1000000000000');
		expect(metric(r, 'Number of factors')).toBe('169');
		expect(r.table?.rows.length).toBe(50);
		expect(r.table?.title).toContain('first 50 shown');
	});

	it('treats 1 as not prime with one factor', () => {
		const r = run('1');
		expect(r.primaryResult).toBe('1');
		expect(metric(r, 'Prime?')).toBe('No');
	});

	it('returns a dash for decimals, zero or values over 1e12', () => {
		expect(run('2.5').primaryResult).toBe('—');
		expect(run('0').primaryResult).toBe('—');
		expect(run('1000000000001').primaryResult).toBe('—');
	});
});
