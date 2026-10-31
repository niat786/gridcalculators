import { describe, expect, it } from 'vitest';
import calc from './scientific-notation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('scientific notation calculator', () => {
	it('writes 0.000123 as 1.23 × 10⁻⁴ from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('1.23 × 10⁻⁴');
		expect(metric(r, 'E notation')).toBe('1.23E-4');
		expect(metric(r, 'Engineering notation')).toBe('123E-6');
		expect(metric(r, 'Plain decimal')).toBe('0.000123');
		expect(metric(r, 'Significant figures')).toBe('3');
	});

	it('reads 1.23e-4 the same way', () => {
		expect(run({ value: '1.23e-4' }).primaryResult).toBe('1.23 × 10⁻⁴');
	});

	it('writes 1,230,000 as 1.23 × 10⁶', () => {
		const r = run({ value: '1,230,000' });
		expect(r.primaryResult).toBe('1.23 × 10⁶');
		expect(metric(r, 'E notation')).toBe('1.23E6');
		expect(metric(r, 'Plain decimal')).toBe('1230000');
	});

	it('rounds −45600 to 2 significant figures: −4.6 × 10⁴', () => {
		const r = run({ value: '-45600', sig: '2' });
		expect(r.primaryResult).toBe('−4.6 × 10⁴');
		expect(metric(r, 'Plain decimal')).toBe('−46000');
		expect(r.summary).toContain('Rounded half up to 2 significant figures');
	});

	it('rounds 1.2345 to 3 significant figures: 1.23 × 10⁰', () => {
		expect(run({ value: '1.2345', sig: '3' }).primaryResult).toBe('1.23 × 10⁰');
	});

	it('carries a round-up of 999.6 to 3 significant figures: 1.00 × 10³', () => {
		const r = run({ value: '999.6', sig: '3' });
		expect(r.primaryResult).toBe('1.00 × 10³');
		expect(metric(r, 'Plain decimal')).toBe('1000');
	});

	it('keeps every digit of a 30-digit integer on auto', () => {
		const r = run({ value: '123456789012345678901234567890' });
		expect(r.primaryResult).toBe('1.2345678901234567890123456789 × 10²⁹');
	});

	it('writes zero as 0 × 10⁰', () => {
		expect(run({ value: '0' }).primaryResult).toBe('0 × 10⁰');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ value: 'abc' }).primaryResult).toBe('—');
		expect(run({ value: '' }).primaryResult).toBe('—');
		expect(run({ value: '1.2.3' }).primaryResult).toBe('—');
	});
});
