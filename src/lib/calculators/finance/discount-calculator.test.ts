import { describe, expect, it } from 'vitest';
import calc from './discount-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('discount calculator', () => {
	it('takes 25% off $80 (default) to $60.00 and saves $20.00', () => {
		const r = run();
		expect(r.primaryResult).toBe('$60.00');
		expect(metric(r, 'You save')).toBe('$20.00');
		expect(metric(r, 'Effective discount')).toBe('25%');
	});

	it('matches the worked example: 25% then 10% off $80 gives $54.00', () => {
		const r = run({ second: '10' });
		expect(r.primaryResult).toBe('$54.00');
		expect(metric(r, 'After first discount')).toBe('$60.00');
		expect(metric(r, 'You save')).toBe('$26.00');
		expect(metric(r, 'Effective discount')).toBe('32.5%');
	});

	it('is not the same as adding the two percentages (35% off)', () => {
		expect(run({ second: '10' }).primaryResult).not.toBe('$48.00');
	});

	it('40% off $50 gives $30.00', () => {
		expect(run({ price: '50', discount: '40' }).primaryResult).toBe('$30.00');
	});

	it('a 0% discount leaves the price unchanged', () => {
		const r = run({ price: '200', discount: '0' });
		expect(r.primaryResult).toBe('$200.00');
		expect(metric(r, 'You save')).toBe('$0.00');
		expect(metric(r, 'Effective discount')).toBe('0%');
	});

	it('treats a blank second discount as none', () => {
		expect(run({ second: '' }).primaryResult).toBe('$60.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ price: 'abc' }).primaryResult).toBe('—');
		expect(run({ price: '0' }).primaryResult).toBe('—');
		expect(run({ discount: '150' }).primaryResult).toBe('—');
	});
});
