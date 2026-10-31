import { beforeEach, describe, expect, it } from 'vitest';
import calc from './pakistan-salary-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { money, setCurrency } from '../format';

// Expected figures were computed independently with a node script using the published "Rs X + r% over Y" form of the
// First Schedule table (Finance Act 2026 / KPMG brief; Finance Act 2025 / Mercans for tax year 2026), not the code under test.
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), period: 'annual', ...over }));
const m = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((x) => x.label === label)?.value;
const rs = (n: number) => money(n, true);
const annualTax = (income: string) => m(run({ salary: income }), 'Annual tax');
const tax26 = (income: string) => m(run({ salary: income }), 'Annual tax, tax year 2026');

beforeEach(() => setCurrency('PKR'));

describe('pakistan salary tax calculator, tax year 2027', () => {
	it('matches the worked example: Rs 250,000 a month', () => {
		const r = run({ period: 'monthly', salary: '250000' });
		expect(r.primaryResult).toBe(rs(23000));
		expect(m(r, 'Annual tax')).toBe(rs(276000));
		expect(m(r, 'Monthly take-home')).toBe(rs(227000));
		expect(m(r, 'Annual taxable income')).toBe(rs(3000000));
		expect(m(r, 'Effective tax rate')).toBe('9.2%');
	});

	it('every slab boundary equals the published fixed amount', () => {
		expect(annualTax('0')).toBe(rs(0));
		expect(annualTax('600000')).toBe(rs(0));
		expect(annualTax('1200000')).toBe(rs(6000));
		expect(annualTax('2200000')).toBe(rs(116000));
		expect(annualTax('3200000')).toBe(rs(316000));
		expect(annualTax('4100000')).toBe(rs(541000));
		expect(annualTax('5600000')).toBe(rs(976000));
		expect(annualTax('7000000')).toBe(rs(1424000));
	});

	it('just above each boundary adds the next slab rate', () => {
		expect(annualTax('600100')).toBe(rs(1)); // 1% of 100
		expect(annualTax('1300000')).toBe(rs(17000)); // 6,000 + 11% of 100,000
		expect(annualTax('7100000')).toBe(rs(1459000)); // 1,424,000 + 35% of 100,000
	});

	it('has no surcharge for salaried people in tax year 2027', () => {
		expect(annualTax('10000000')).toBe(rs(2474000));
		expect(annualTax('12000000')).toBe(rs(3174000)); // 1,424,000 + 35% of 5,000,000
	});

	it('monthly entry equals annual entry', () => {
		const a = run({ period: 'monthly', salary: '100000' });
		const b = run({ period: 'annual', salary: '1200000' });
		expect(a.primaryResult).toBe(b.primaryResult);
		expect(m(a, 'Annual tax')).toBe(rs(6000));
	});

	it('compares with tax year 2026 (23/30/35% slabs, 9% surcharge above Rs 10m)', () => {
		expect(tax26('3200000')).toBe(rs(346000));
		expect(tax26('4100000')).toBe(rs(616000));
		expect(tax26('7000000')).toBe(rs(1631000));
		expect(tax26('10000000')).toBe(rs(2681000)); // exactly Rs 10m: no surcharge
		expect(tax26('12000000')).toBe(rs(3685290)); // 3,381,000 × 1.09
		const r = run({ salary: '12000000' });
		expect(m(r, 'Saving vs last year')).toBe(rs(3685290 - 3174000));
		expect(m(run({ salary: '3000000' }), 'Saving vs last year')).toBe(rs(24000)); // 300,000 − 276,000
	});

	it('shows the slab table with your tax in each slab', () => {
		const r = run({ salary: '3000000' });
		expect(r.table?.rows).toHaveLength(8);
		expect(r.table?.rows[3].yours).toBe(rs(160000));
		expect(r.table?.rows[4].yours).toBe(rs(0));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '-5' }).primaryResult).toBe('—');
	});
});
