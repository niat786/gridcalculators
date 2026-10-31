import { describe, expect, it } from 'vitest';
import calc from './401k-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { limit401k } from '../data/us-retirement';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('401(k) calculator', () => {
	it('applies 2026 limits by age', () => {
		expect(limit401k(30)).toBe(24500);
		expect(limit401k(55)).toBe(32500);
		expect(limit401k(61)).toBe(35750);
		expect(limit401k(64)).toBe(32500);
	});
	it('matches a one-year hand calculation', () => {
		// $75,000, 8% → $6,000; match 50% of min(6,000, 4,500) = 2,250; 0% return, from $0
		const r = run({ age: '30', retire: '31', ret: '0', balance: '0' });
		expect(r.primaryResult).toBe('$8,250');
		expect(r.secondaryMetrics?.[1].value).toBe('$2,250');
	});
	it('caps contributions at the IRS limit', () => {
		const r = run({ salary: '500000', contrib: '20', match: '0', age: '30', retire: '31', ret: '0', balance: '0' });
		expect(r.primaryResult).toBe('$24,500');
	});
	it('flags match left on the table', () => {
		expect(run({ contrib: '3' }).summary).toContain('$1,125');
	});
	it('rejects a retirement age before the current age', () => {
		expect(run({ retire: '25' }).primaryResult).toBe('—');
	});
});
