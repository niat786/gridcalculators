import { describe, expect, it } from 'vitest';
import calc from './permutation-and-combination-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('permutation and combination calculator', () => {
	it('computes 10 items taken 3 at a time: nPr 720, nCr 120', () => {
		expect(run({ kind: 'perm', n: '10', r: '3' }).primaryResult).toBe('720');
		expect(run({ kind: 'comb', n: '10', r: '3' }).primaryResult).toBe('120');
	});

	it('computes the with-repetition counts: 10³ = 1000 and C(12, 3) = 220', () => {
		expect(run({ kind: 'permRep', n: '10', r: '3' }).primaryResult).toBe('1,000');
		expect(run({ kind: 'combRep', n: '10', r: '3' }).primaryResult).toBe('220');
	});

	it('matches the worked example: five-card hands from 52 cards', () => {
		const over = { kind: 'comb', n: '52', r: '5' };
		expect(run(over).primaryResult).toBe('2,598,960');
		expect(metric(over, 'Permutations nPr')).toBe('311,875,200');
	});

	it('shows scientific form and exact digits for 20 items taken 20 at a time', () => {
		const result = run({ kind: 'perm', n: '20', r: '20' });
		expect(result.primaryResult).toBe('2432902008176640000');
		expect(result.long).toBe(true);
		expect(result.summary).toContain('2.4329 × 10¹⁸');
	});

	it('shows exact digits for C(100, 50), which has 30 digits', () => {
		const result = run({ kind: 'comb', n: '100', r: '50' });
		expect(result.primaryResult).toBe('100891344545564193334812497256');
		expect(result.long).toBe(true);
		expect(result.summary).toContain('1.0089 × 10²⁹');
	});

	it('gives 1 when r is 0 or n and r are both 0', () => {
		expect(run({ kind: 'perm', n: '0', r: '0' }).primaryResult).toBe('1');
		expect(run({ kind: 'combRep', n: '0', r: '0' }).primaryResult).toBe('1');
		expect(run({ kind: 'permRep', n: '0', r: '0' }).primaryResult).toBe('1');
	});

	it('returns a dash when r is above n, n is over 1,000, or the inputs are not whole numbers', () => {
		expect(run({ kind: 'perm', n: '5', r: '7' }).primaryResult).toBe('—');
		expect(run({ kind: 'comb', n: '1001', r: '3' }).primaryResult).toBe('—');
		expect(run({ kind: 'comb', n: '10', r: '-1' }).primaryResult).toBe('—');
		expect(run({ kind: 'comb', n: '2.5', r: '1' }).primaryResult).toBe('—');
	});
	it('allows r > n only when repetition is allowed', () => {
		expect(run({ kind: 'combRep', n: '2', r: '3' }).primaryResult).toBe('4');
		expect(run({ kind: 'permRep', n: '2', r: '3' }).primaryResult).toBe('8');
		expect(run({ kind: 'perm', n: '2', r: '3' }).primaryResult).toBe('—');
	});
});
