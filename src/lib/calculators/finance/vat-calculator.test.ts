import { describe, expect, it } from 'vitest';
import calc from './vat-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('vat calculator', () => {
	it('adds 20% VAT to a net amount (default: 250 gives 300.00)', () => {
		const r = run();
		expect(r.primaryResult).toBe('300.00');
		expect(metric(r, 'VAT')).toBe('50.00');
	});

	it('adds VAT at 12% and rounds it to two decimals: 49.99 gives 55.99 gross', () => {
		const r = run({ amount: '49.99', rate: '12' });
		expect(r.primaryResult).toBe('55.99');
		expect(metric(r, 'VAT')).toBe('6.00');
	});

	it('removes 20% VAT from a gross amount: 300 gives 250.00 net', () => {
		const r = run({ mode: 'remove', amount: '300', rate: '20' });
		expect(r.primaryResult).toBe('250.00');
		expect(metric(r, 'VAT')).toBe('50.00');
	});

	it('removes 12% VAT: 55.99 gives 49.99 net and 6.00 VAT', () => {
		const r = run({ mode: 'remove', amount: '55.99', rate: '12' });
		expect(r.primaryResult).toBe('49.99');
		expect(metric(r, 'VAT')).toBe('6.00');
	});

	it('uses no currency symbol', () => {
		expect(run().primaryResult).not.toMatch(/[$£€]/);
	});

	it('returns a dash for invalid input', () => {
		expect(run({ amount: 'abc' }).primaryResult).toBe('—');
		expect(run({ rate: '150' }).primaryResult).toBe('—');
		expect(run({ mode: 'remove', amount: '-5' }).primaryResult).toBe('—');
	});
});
