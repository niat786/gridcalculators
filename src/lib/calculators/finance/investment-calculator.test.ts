import { describe, expect, it } from 'vitest';
import calc from './investment-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('investment calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$300,850.72');
		expect(r.secondaryMetrics?.[0].value).toBe('$130,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$170,850.72');
		expect(r.secondaryMetrics?.[2].value).toBe('$500.00');
	});

	it('yearly raises with a 0% return: ending value equals contributions', () => {
		// $100 a month rising 10% a year for 10 years: 1200 × (1.1¹⁰ − 1) ÷ 0.1
		const r = run({ start: '0', monthly: '100', rate: '0', years: '10', raise: '10' });
		expect(r.primaryResult).toBe('$19,124.91');
		expect(r.secondaryMetrics?.[1].value).toBe('$0.00');
	});

	it('lump sum only: $1,000 at 5% for 1 year', () => {
		const r = run({ start: '1000', monthly: '0', rate: '5', years: '1' });
		expect(r.primaryResult).toBe('$1,051.16');
	});

	it('yearly table has one row per year', () => {
		const r = run({ years: '4' });
		expect(r.table?.rows).toHaveLength(4);
	});

	it('returns a dash for invalid input', () => {
		const r = run({ years: '' });
		expect(r.primaryResult).toBe('—');
	});
});
