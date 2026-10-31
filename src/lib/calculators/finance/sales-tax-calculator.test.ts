import { describe, expect, it } from 'vitest';
import calc from './sales-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('sales tax calculator', () => {
	it('adds tax to a net price (default: $100 at 8%)', () => {
		const r = run();
		expect(r.primaryResult).toBe('$108.00');
		expect(metric(r, 'Sales tax')).toBe('$8.00');
	});

	it('matches the worked example: $250 at 7.5% adds $18.75', () => {
		const r = run({ amount: '250', rate: '7.5' });
		expect(r.primaryResult).toBe('$268.75');
		expect(metric(r, 'Sales tax')).toBe('$18.75');
	});

	it('rounds tax to the cent: $49.99 at 6.25% gives $3.12 tax and $53.11 total', () => {
		const r = run({ amount: '49.99', rate: '6.25' });
		expect(r.primaryResult).toBe('$53.11');
		expect(metric(r, 'Sales tax')).toBe('$3.12');
	});

	it('removes tax from a total: $268.75 at 7.5% gives $250.00 net', () => {
		const r = run({ mode: 'remove', amount: '268.75', rate: '7.5' });
		expect(r.primaryResult).toBe('$250.00');
		expect(metric(r, 'Sales tax')).toBe('$18.75');
	});

	it('removes tax from a total: $53.11 at 6.25% gives $49.99 net and $3.12 tax', () => {
		const r = run({ mode: 'remove', amount: '53.11', rate: '6.25' });
		expect(r.primaryResult).toBe('$49.99');
		expect(metric(r, 'Sales tax')).toBe('$3.12');
	});

	it('a 0% rate changes nothing', () => {
		expect(run({ rate: '0' }).primaryResult).toBe('$100.00');
		expect(run({ mode: 'remove', rate: '0' }).primaryResult).toBe('$100.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ amount: 'abc' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
		expect(run({ mode: 'remove', amount: '' }).primaryResult).toBe('—');
	});
});
