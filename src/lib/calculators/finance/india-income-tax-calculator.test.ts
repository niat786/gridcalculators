import { beforeEach, describe, expect, it } from 'vitest';
import calc from './india-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently with a separate node script (slab arithmetic, rebate,
// marginal relief, surcharge relief, 4% cess, rounding to Rs 10), not by calling the code under test.
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), d80c: '0', d80d: '0', ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

describe('india income tax calculator FY 2026-27', () => {
	it('matches the worked example: Rs 15 lakh salary, 80C 1.5L, 80D 25k', () => {
		const r = run({ d80c: '150000', d80d: '25000' });
		expect(metric(r, 'New regime tax')).toBe('₹97,500');
		expect(metric(r, 'Old regime tax')).toBe('₹2,02,800');
		expect(r.primaryResult).toBe('₹97,500');
		expect(metric(r, 'Difference')).toBe('₹1,05,300');
	});

	it('Rs 12.75 lakh salaried income is tax-free in the new regime (published example)', () => {
		const r = run({ salary: '1275000' });
		expect(metric(r, 'New regime tax')).toBe('₹0');
		expect(metric(r, 'New regime taxable income')).toBe('₹12,00,000');
	});

	it('marginal relief just above 12 lakh: taxable 12,05,000 pays only the excess plus cess', () => {
		expect(metric(run({ salary: '1280000' }), 'New regime tax')).toBe('₹5,200');
		expect(metric(run({ salary: '1275010' }), 'New regime tax')).toBe('₹10');
	});

	it('no marginal relief once slab tax is below the excess (taxable 12.75 lakh)', () => {
		expect(metric(run({ salary: '1350000' }), 'New regime tax')).toBe('₹74,100');
	});

	it('surcharge marginal relief at 50 lakh (taxable 50.10 lakh)', () => {
		expect(metric(run({ salary: '5085000' }), 'New regime tax')).toBe('₹11,33,600');
	});

	it('surcharge marginal relief at 1 crore, and 25% cap for very large income (new regime)', () => {
		expect(metric(run({ salary: '10175000' }), 'New regime tax')).toBe('₹30,55,520');
		expect(metric(run({ salary: '30075000' }), 'New regime tax')).toBe('₹1,11,54,000');
	});

	it('old regime: taxable 9.5 lakh, and rebate makes 5 lakh nil', () => {
		expect(metric(run({ salary: '1000000' }), 'Old regime tax')).toBe('₹1,06,600');
		expect(metric(run({ salary: '550000' }), 'Old regime tax')).toBe('₹0');
	});

	it('senior and super senior old-regime slabs', () => {
		expect(metric(run({ salary: '800000', age: 'age60to79' }), 'Old regime tax')).toBe('₹62,400');
		expect(metric(run({ salary: '800000', age: 'age80plus' }), 'Old regime tax')).toBe('₹52,000');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '0', other: '0' }).primaryResult).toBe('—');
	});
});

describe('india income tax content claims', () => {
	it('break-even example: about ₹5.44 lakh of deductions at ₹15 lakh salary', async () => {
		const calc = (await import('./india-income-tax-calculator.calc')).default;
		const { defaultRaw, toValues } = await import('../../components/calculator/state');
		const r = (d80c: string, otherDed: string) =>
			calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), salary: '1500000', d80c, d80d: '0', otherDed, hra: '0' }));
		const tbl = (x: ReturnType<typeof r>) => x.table!.rows;
		// 5,43,750 of deductions (1,50,000 80C + 3,93,750 other) makes the old regime equal ₹97,500.
		const last = tbl(r('150000', '393750')).at(-1)!;
		expect(last.oldR).toContain('97,500');
		expect(last.newR).toContain('97,500');
	});
});
