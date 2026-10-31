import { describe, expect, it } from 'vitest';
import calc from './down-payment-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('down payment calculator', () => {
	it('matches the worked example: $400,000 home, 20% down, 3% closing, $30,000 saved, $2,000 a month', () => {
		const r = run({ price: '400000', down: '20', closing: '3', savings: '30000', monthly: '2000' });
		expect(r.primaryResult).toBe('$92,000.00');
		expect(metric(r, 'Down payment')).toBe('$80,000.00');
		expect(metric(r, 'Closing costs (3%)')).toBe('$12,000.00');
		expect(metric(r, 'Loan amount')).toBe('$320,000.00');
		expect(metric(r, 'Still to save')).toBe('$62,000.00');
		expect(metric(r, 'Time to save')).toBe('31 months (2 years 7 months)');
	});

	it('reports the goal as already reached when savings cover the cash needed', () => {
		const r = run({ price: '250000', down: '10', closing: '5', savings: '40000', monthly: '1500' });
		expect(r.primaryResult).toBe('$37,500.00');
		expect(metric(r, 'Still to save')).toBe('$0.00');
		expect(metric(r, 'Time to save')).toBe('Already saved');
		expect(r.summary).toContain('already cover');
	});

	it('rounds the months up when there are no monthly savings', () => {
		const r = run({ price: '250000', down: '10', closing: '5', savings: '10000', monthly: '0' });
		expect(metric(r, 'Still to save')).toBe('$27,500.00');
		expect(metric(r, 'Time to save')).toBe('Not reached without monthly savings');
	});

	it('rounds a partial month up to the next whole month', () => {
		const r = run({ price: '400000', down: '20', closing: '3', savings: '0', monthly: '5000' });
		// 92,000 ÷ 5,000 = 18.4, so 19 months
		expect(metric(r, 'Time to save')).toBe('19 months (1 year 7 months)');
	});

	it('returns a dash for a missing price', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
