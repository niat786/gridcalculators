import { describe, expect, it } from 'vitest';
import calc from './long-division-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('long division calculator', () => {
	it('matches the worked example: 1,234 ÷ 7', () => {
		// 7 × 176 = 1,232, remainder 2. 2/7 = 0.285714 285714…, so 176.(285714)
		const r = run();
		expect(r.primaryResult).toBe('176 R 2');
		expect(r.secondaryMetrics?.[0].value).toBe('176.2857142857');
		expect(r.secondaryMetrics?.[1].value).toBe('176.(285714)');
		expect(r.secondaryMetrics?.[2].value).toBe('6 digits');
		expect(r.secondaryMetrics?.[3].value).toBe('176 2/7');
	});

	it('shows one table row per digit of the dividend, with the working', () => {
		const rows = run().table?.rows ?? [];
		expect(rows).toHaveLength(4);
		expect(rows[0]).toMatchObject({ step: '1', bring: '1', partial: '1', divide: '1 ÷ 7 = 0 R 1' });
		expect(rows[1]).toMatchObject({ bring: '2', partial: '12', divide: '12 ÷ 7 = 1 R 5', multiply: '1 × 7 = 7', subtract: '12 − 7 = 5' });
		expect(rows[2]).toMatchObject({ partial: '53', divide: '53 ÷ 7 = 7 R 4', multiply: '7 × 7 = 49', subtract: '53 − 49 = 4' });
		expect(rows[3]).toMatchObject({ partial: '44', divide: '44 ÷ 7 = 6 R 2', multiply: '6 × 7 = 42', subtract: '44 − 42 = 2' });
	});

	it('finds a one-digit repeat: 100 ÷ 6 = 16 R 4, 16.(6)', () => {
		const r = run({ dividend: '100', divisor: '6' });
		expect(r.primaryResult).toBe('16 R 4');
		expect(r.secondaryMetrics?.[0].value).toBe('16.6666666666');
		expect(r.secondaryMetrics?.[1].value).toBe('16.(6)');
		expect(r.secondaryMetrics?.[2].value).toBe('1 digit');
		expect(r.secondaryMetrics?.[3].value).toBe('16 2/3');
	});

	it('shows an exact decimal with no repeat: 3 ÷ 8 = 0.375', () => {
		const r = run({ dividend: '3', divisor: '8' });
		expect(r.primaryResult).toBe('0 R 3');
		expect(r.secondaryMetrics?.[0].value).toBe('0.3750000000');
		expect(r.secondaryMetrics?.[1].value).toBe('0.375');
		expect(r.secondaryMetrics?.[2].value).toBe('None, the decimal ends');
		expect(r.secondaryMetrics?.[3].value).toBe('0 3/8');
	});

	it('handles the largest dividend: 1,000,000,000,000 ÷ 999,983 = 1,000,017 R 289', () => {
		// Checked with BigInt: 999,983 × 1,000,017 = 999,999,999,711, and 1e12 − that = 289.
		const r = run({ dividend: '1000000000000', divisor: '999983' });
		expect(r.primaryResult).toBe('1,000,017 R 289');
		expect(r.secondaryMetrics?.[0].value).toBe('1,000,017.0002890049');
		expect(r.table?.rows).toHaveLength(13);
	});

	it('returns a dash for decimals, zero divisors and out-of-range values', () => {
		expect(run({ dividend: '1.5' }).primaryResult).toBe('—');
		expect(run({ divisor: '0' }).primaryResult).toBe('—');
		expect(run({ divisor: '2000000' }).primaryResult).toBe('—');
		expect(run({ dividend: '-4' }).primaryResult).toBe('—');
	});
});
