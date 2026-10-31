import { describe, expect, it } from 'vitest';
import calc from './margin-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('margin calculator', () => {
	it('cost $60 and price $100 (default) gives $40.00 profit, 40% margin, 66.67% markup', () => {
		const r = run();
		expect(r.primaryResult).toBe('$40.00');
		expect(metric(r, 'Gross margin')).toBe('40%');
		expect(metric(r, 'Markup')).toBe('66.67%');
	});

	it('cost $60 and a 40% margin give a $100.00 price (worked example)', () => {
		const r = run({ mode: 'margin', cost: '60', margin: '40' });
		expect(r.primaryResult).toBe('$100.00');
		expect(metric(r, 'Profit per unit')).toBe('$40.00');
		expect(metric(r, 'Markup')).toBe('66.67%');
	});

	it('cost $25 and a 50% margin give a $50.00 price and 100% markup', () => {
		const r = run({ mode: 'margin', cost: '25', margin: '50' });
		expect(r.primaryResult).toBe('$50.00');
		expect(metric(r, 'Markup')).toBe('100%');
	});

	it('shows a loss as a negative profit: cost $80, price $70', () => {
		const r = run({ cost: '80', price: '70' });
		expect(r.primaryResult).toBe('-$10.00');
		expect(metric(r, 'Gross margin')).toBe('-14.29%');
		expect(metric(r, 'Markup')).toBe('-12.5%');
	});

	it('returns a dash when the margin is 100% or more', () => {
		expect(run({ mode: 'margin', margin: '100' }).primaryResult).toBe('—');
		expect(run({ mode: 'margin', margin: '120' }).primaryResult).toBe('—');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ cost: 'abc' }).primaryResult).toBe('—');
		expect(run({ cost: '0' }).primaryResult).toBe('—');
		expect(run({ price: '0' }).primaryResult).toBe('—');
	});
});
