import { describe, expect, it } from 'vitest';
import calc from './savings-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('savings calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$14,680.91');
		expect(r.secondaryMetrics?.[0].value).toBe('$13,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$1,680.91');
		expect(r.secondaryMetrics?.[2].value).toBe('4.594%');
	});

	it('zero rate: deposits only', () => {
		const r = run({ initial: '0', monthly: '100', rate: '0', years: '2' });
		expect(r.primaryResult).toBe('$2,400.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$0.00');
	});

	it('starting balance only: $10,000 at 6% for 1 year', () => {
		const r = run({ initial: '10000', monthly: '0', rate: '6', years: '1' });
		expect(r.primaryResult).toBe('$10,616.78');
		expect(r.secondaryMetrics?.[1].value).toBe('$616.78');
	});

	it('yearly table has one row per year', () => {
		const r = run({ years: '3' });
		expect(r.table?.rows).toHaveLength(3);
	});

	it('returns a dash for invalid input', () => {
		const r = run({ years: '0' });
		expect(r.primaryResult).toBe('—');
	});
});
