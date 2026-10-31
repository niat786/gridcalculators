import { describe, expect, it } from 'vitest';
import calc from './prime-factorization-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (n: string) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), n }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('prime factorization calculator', () => {
	it('writes 360 as 2³ × 3² × 5 from its defaults', () => {
		const r = run('360');
		expect(r.primaryResult).toBe('2³ × 3² × 5');
		expect(metric(r, 'Distinct primes')).toBe('3');
		expect(metric(r, 'Prime factors, with repeats')).toBe('6');
		expect(metric(r, 'Largest prime factor')).toBe('5');
		expect(r.table?.rows.at(-1)?.quotient).toBe('1');
	});

	it('writes 2310 as 2 × 3 × 5 × 7 × 11', () => {
		expect(run('2310').primaryResult).toBe('2 × 3 × 5 × 7 × 11');
	});

	it('writes 10¹² as 2¹² × 5¹²', () => {
		const r = run('1000000000000');
		expect(r.primaryResult).toBe('2¹² × 5¹²');
		expect(metric(r, 'Prime factors, with repeats')).toBe('24');
	});

	it('shows a prime as its own factorization: 13', () => {
		const r = run('13');
		expect(r.primaryResult).toBe('13');
		expect(metric(r, 'Is it prime?')).toBe('Yes');
	});

	it('returns a dash for 1, decimals or values over 1e12', () => {
		expect(run('1').primaryResult).toBe('—');
		expect(run('2.5').primaryResult).toBe('—');
		expect(run('1000000000001').primaryResult).toBe('—');
	});
});
