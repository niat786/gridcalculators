import { describe, expect, it } from 'vitest';
import calc from './number-sequence-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('number sequence calculator', () => {
	it('arithmetic a₁ = 2, d = 3, n = 10 gives term 29 and sum 155', () => {
		const r = run({ mode: 'arithmetic', a1: '2', d: '3', n: '10' });
		expect(r.primaryResult).toBe('29');
		expect(metric(r, 'Sum of the first n terms')).toBe('155');
		expect(metric(r, 'Next term (n + 1)')).toBe('32');
		expect(r.table?.rows[0]).toEqual({ term: '1', value: '2' });
		expect(r.table?.rows[9]).toEqual({ term: '10', value: '29' });
	});

	it('arithmetic a₁ = 100, d = −7, n = 5 gives term 72 and sum 430', () => {
		const r = run({ mode: 'arithmetic', a1: '100', d: '-7', n: '5' });
		expect(r.primaryResult).toBe('72');
		expect(metric(r, 'Sum of the first n terms')).toBe('430');
	});

	it('geometric a₁ = 3, r = 0.5, n = 5 gives 0.1875, sum 5.8125 and infinite sum 6', () => {
		const r = run({ mode: 'geometric', a1: '3', r: '0.5', n: '5' });
		expect(r.primaryResult).toBe('0.1875');
		expect(metric(r, 'Sum of the first n terms')).toBe('5.8125');
		expect(metric(r, 'Infinite sum')).toBe('6');
	});

	it('geometric with |r| ≥ 1 has no infinite sum, and a₁ = 2, r = 2, n = 4 sums to 30', () => {
		const r = run({ mode: 'geometric', a1: '2', r: '2', n: '4' });
		expect(r.primaryResult).toBe('16');
		expect(metric(r, 'Sum of the first n terms')).toBe('30');
		expect(metric(r, 'Infinite sum')).toBe('Not defined, because |r| is 1 or more');
	});

	it('Fibonacci F(10) is 55 and F(50) is 12,586,269,025', () => {
		expect(run({ mode: 'fibonacci', n: '10' }).primaryResult).toBe('55');
		expect(run({ mode: 'fibonacci', n: '10' }).long).toBe(false);
		expect(run({ mode: 'fibonacci', n: '50' }).primaryResult).toBe('12,586,269,025');
	});

	it('Fibonacci F(100) is exact with 21 digits and is shown as long text', () => {
		const r = run({ mode: 'fibonacci', n: '100' });
		expect(r.primaryResult).toBe('354,224,848,179,261,915,075');
		expect(metric(r, 'Digits in the number')).toBe('21');
		expect(r.long).toBe(true);
		expect(r.table?.rows.map((x) => x.value)).toEqual(['1', '1', '2', '3', '5', '8', '13', '21', '34', '55']);
	});

	it('returns a dash for a term number of 0 or text', () => {
		expect(run({ n: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'fibonacci', n: 'abc' }).primaryResult).toBe('—');
	});

	it('returns a dash when a geometric value is too large to show', () => {
		expect(run({ mode: 'geometric', a1: '1', r: '10', n: '1000' }).primaryResult).toBe('—');
	});
});
