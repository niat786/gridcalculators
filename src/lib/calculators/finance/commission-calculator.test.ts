import { describe, expect, it } from 'vitest';
import calc from './commission-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('commission calculator', () => {
	it('defaults: 5% flat on $25,000 is $1,250', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,250.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$1,250.00');
		expect(r.secondaryMetrics?.[2].value).toBe('5%');
	});

	it('flat rate with base pay: $10,000 at 4% plus $1,500 base is $1,900', () => {
		const r = run({ sale: '10000', rate: '4', base: '1500' });
		expect(r.primaryResult).toBe('$1,900.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$400.00');
	});

	it('matches the tiered worked example: $30,000 with $2,000 base', () => {
		// 20,000 × 5% = 1,000; 10,000 × 8% = 800; commission 1,800; total 3,800
		const r = run({ mode: 'tiered', sale: '30000', rate: '5', rate2: '8', threshold: '20000', base: '2000' });
		expect(r.primaryResult).toBe('$3,800.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$1,800.00');
		expect(r.secondaryMetrics?.[2].value).toBe('6%');
	});

	it('tiered: a sale below the threshold only uses the first rate', () => {
		// 15,000 × 5% = 750
		const r = run({ mode: 'tiered', sale: '15000', rate: '5', rate2: '8', threshold: '20000' });
		expect(r.primaryResult).toBe('$750.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ sale: '' }).primaryResult).toBe('—');
		expect(run({ mode: 'tiered', rate2: 'x' }).primaryResult).toBe('—');
	});
});
