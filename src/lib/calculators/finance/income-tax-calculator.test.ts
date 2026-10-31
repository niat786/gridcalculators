import { describe, expect, it } from 'vitest';
import calc from './income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { federalTax, incomeTax } from '../data/us-tax-2026';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('income tax calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$9,870.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$68,900.00');
	});
	it('uses the 2026 joint brackets', () => {
		// MFJ $150,000: taxable 117,800 → 2,480 + 9,120 + 22% × 17,000 = 15,340
		expect(run({ status: 'mfj', income: '150000' }).primaryResult).toBe('$15,340.00');
	});
	it('taxes the top bracket for high earners', () => {
		// Single taxable 1,000,000: tax up to 640,600 = 192,979.25; + 37% × 359,400
		expect(incomeTax(1_000_000, 'single').tax).toBeCloseTo(192_979.25 + 132_978, 2);
	});
	it('applies the senior deductions', () => {
		// Single 65+, $60,000: 60,000 − (16,100 + 2,050) − 6,000 = 35,850 → 1,240 + 12% × 23,450 = 4,054
		expect(run({ income: '60000', me65: 'true' }).primaryResult).toBe('$4,054.00');
	});
	it('applies the child tax credit and its refundable part', () => {
		const r = federalTax({ status: 'mfj', income: 40000, adjustments: 0, itemized: 0, seniors: 0, children: 2 });
		// taxable 7,800 → tax 780; credit 4,400: 780 non-refundable + refundable min(3,620, 3,400, 5,625) = 3,400
		expect(r.taxBeforeCredits).toBe(780);
		expect(r.refundableCtc).toBe(3400);
		expect(r.tax).toBe(-3400);
	});
	it('shows a refund from withholding', () => {
		expect(run({ withheld: '10000' }).summary).toContain('$130.00');
	});
	it('ignores the spouse toggle unless filing jointly', () => {
		expect(run({ income: '60000', me65: 'true', sp65: 'true' }).primaryResult).toBe('$4,054.00');
	});
	it('rejects invalid income', () => {
		expect(run({ income: 'abc' }).primaryResult).toBe('—');
	});
});
