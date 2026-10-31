import { describe, expect, it } from 'vitest';
import calc from './hex-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('hex calculator', () => {
	it('converts decimal 255 to FF from its defaults', () => {
		const r = run();
		expect(r.primaryResult).toBe('FF');
		expect(metric(r, 'Decimal')).toBe('255');
		expect(metric(r, 'Binary')).toBe('11111111');
	});

	it('converts hex 1A2B to decimal 6699, ignoring case', () => {
		expect(run({ from: 'hex', value: '1a2B' }).primaryResult).toBe('6,699');
		expect(metric(run({ from: 'hex', value: '1a2B' }), 'Hexadecimal')).toBe('1A2B');
	});

	it('stays exact for 2⁶⁴ − 1, which is FFFFFFFFFFFFFFFF', () => {
		const r = run({ value: '18446744073709551615' });
		expect(r.primaryResult).toBe('FFFFFFFFFFFFFFFF');
		expect(metric(r, 'Binary')).toBe('1'.repeat(64));
	});

	it('adds FF and 1A to get 119, which is 281', () => {
		const r = run({ mode: 'arithmetic' });
		expect(r.primaryResult).toBe('119');
		expect(metric(r, 'Decimal')).toBe('281');
		expect(metric(r, 'Binary')).toBe('100011001');
	});

	it('multiplies A by B to get 6E, which is 110', () => {
		const r = run({ mode: 'arithmetic', a: 'A', op: 'mul', b: 'B' });
		expect(r.primaryResult).toBe('6E');
		expect(metric(r, 'Decimal')).toBe('110');
	});

	it('divides FF by 10 to get quotient F and remainder F', () => {
		const r = run({ mode: 'arithmetic', op: 'div', b: '10' });
		expect(r.primaryResult).toBe('F');
		expect(metric(r, 'Remainder')).toBe('F (decimal 15)');
	});

	it('returns a dash for characters that are not hex', () => {
		expect(run({ from: 'hex', value: 'G1' }).primaryResult).toBe('—');
		expect(run({ mode: 'arithmetic', b: '1Z' }).primaryResult).toBe('—');
	});

	it('returns a dash when dividing by zero', () => {
		expect(run({ mode: 'arithmetic', op: 'div', b: '0' }).primaryResult).toBe('—');
	});
});
