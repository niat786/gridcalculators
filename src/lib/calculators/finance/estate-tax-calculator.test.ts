import { describe, expect, it } from 'vitest';
import calc, { tentativeTax } from './estate-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('estate tax calculator', () => {
	it('matches the worked example', () => {
		expect(run().primaryResult).toBe('$1,800,000');
	});
	it('uses the §2001(c) schedule', () => {
		expect(tentativeTax(10_000)).toBe(1_800);
		expect(tentativeTax(1_000_000)).toBe(345_800);
		expect(tentativeTax(15_000_000)).toBe(5_945_800); // the 2026 unified credit
	});
	it('is zero under the exemption', () => {
		const r = run({ gross: '10000000', debts: '0' });
		expect(r.primaryResult).toBe('$0');
		expect(r.summary).toContain('$5,000,000');
	});
	it('applies marital, gifts and portability', () => {
		expect(run({ marital: '5000000' }).primaryResult).toBe('$0'); // 14.5M taxable
		expect(run({ gifts: '1000000' }).primaryResult).toBe('$2,200,000');
		expect(run({ dsue: '15000000' }).primaryResult).toBe('$0');
	});
	it('rejects deductions above the estate', () => {
		expect(run({ gross: '100', debts: '200' }).primaryResult).toBe('—');
	});
});
