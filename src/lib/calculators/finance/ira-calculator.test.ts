import { describe, expect, it } from 'vitest';
import calc from './ira-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('IRA calculator', () => {
	it('matches the worked example logic (equal growth, one lump)', () => {
		// $1,000, 0 contributions, 100% return over 1 year, 22% now / 15% later
		const r = run({ balance: '0', contrib: '1000', ret: '0', age: '40', retire: '41' });
		expect(r.secondaryMetrics?.[0].value).toBe('$850'); // 1000 × 0.85
		expect(r.secondaryMetrics?.[1].value).toBe('$780'); // 1000 × 0.78
	});
	it('says Roth wins when tax later is higher', () => {
		expect(run({ taxNow: '12', taxLater: '24' }).summary).toContain('Roth comes out ahead');
	});
	it('caps contributions at the limit for the age', () => {
		const r = run({ balance: '0', contrib: '20000', ret: '0', age: '40', retire: '41' });
		expect(r.secondaryMetrics?.[2].value).toBe('$7,500');
		const r50 = run({ balance: '0', contrib: '20000', ret: '0', age: '50', retire: '51' });
		expect(r50.secondaryMetrics?.[2].value).toBe('$8,600');
	});
	it('rejects bad ages', () => {
		expect(run({ retire: '30' }).primaryResult).toBe('—');
	});
});
