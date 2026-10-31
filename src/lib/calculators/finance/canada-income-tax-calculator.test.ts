import { beforeEach, describe, expect, it } from 'vitest';
import calc from './canada-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { canadaIncomeTax, bracketTax, FEDERAL_BRACKETS, ontarioHealthPremium, federalBpa } from '../data/ca-tax-2026';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Expected values below were worked out separately by hand with node (plain arithmetic from the CRA 2026 figures),
// not by calling the code under test.
describe('canada income tax calculator', () => {
	it('matches the worked example: $100,000 salary in Ontario', () => {
		const r = run({ province: 'ON', employment: '100000' });
		expect(r.primaryResult).toBe('CA$20,024.35');
		expect(metric(r, 'Federal tax')).toBe('CA$13,301.60');
		expect(metric(r, 'Ontario tax')).toBe('CA$6,722.75');
		expect(metric(r, 'Taxable income')).toBe('CA$98,873.00');
		expect(metric(r, 'Average tax rate')).toBe('20.02%');
		expect(metric(r, 'Marginal tax rate')).toBe('31.48%');
		expect(metric(r, 'CPP contributions')).toBe('CA$4,646.45');
		expect(metric(r, 'EI premiums')).toBe('CA$1,123.07');
	});

	it('Ontario at the bracket edge: $53,891 of other income', () => {
		const r = run({ province: 'ON', employment: '0', other: '53891' });
		expect(r.primaryResult).toBe('CA$7,907.01');
		// next dollar: 14% federal + 9.15% Ontario
		expect(metric(r, 'Marginal tax rate')).toBe('23.15%');
		// one dollar earlier the next dollar is still in the 5.05% bracket: 14% + 5.05%
		expect(metric(run({ province: 'ON', employment: '0', other: '53890' }), 'Marginal tax rate')).toBe('19.05%');
	});

	it('Ontario low income: tax reduction removes provincial tax, Health Premium starts above $20,000', () => {
		const r = run({ province: 'ON', employment: '20000' });
		expect(r.primaryResult).toBe('CA$103.49');
		expect(metric(r, 'Ontario tax')).toBe('CA$0.00');
		expect(ontarioHealthPremium(20_000)).toBe(0);
		expect(ontarioHealthPremium(22_000)).toBeCloseTo(120, 10);
		expect(ontarioHealthPremium(48_600)).toBe(600);
		expect(ontarioHealthPremium(200_600)).toBe(900);
		expect(metric(run({ province: 'ON', employment: '50000' }), 'Ontario tax')).toBe('CA$2,288.18');
	});

	it('British Columbia: 5.6% lowest rate, bracket edge and tax reduction credit', () => {
		expect(run({ province: 'BC', employment: '80000' }).primaryResult).toBe('CA$13,273.52');
		expect(run({ province: 'BC', employment: '30000' }).primaryResult).toBe('CA$1,679.87');
		const edge = run({ province: 'BC', employment: '0', other: '50363' });
		expect(edge.primaryResult).toBe('CA$6,827.77');
		expect(metric(edge, 'Marginal tax rate')).toBe('21.7%');
	});

	it('Alberta: $61,200 of other income is the top of the 8% bracket', () => {
		// by hand: federal 8,193.22 + 2,677 × 20.5% = 8,742.005 less 14% × 16,452 = 6,438.725;
		// Alberta 61,200 × 8% = 4,896 less 8% × 22,769 = 3,074.48
		const r = run({ province: 'AB', employment: '0', other: '61200' });
		expect(metric(r, 'Federal tax')).toBe('CA$6,438.73');
		expect(metric(r, 'Alberta tax')).toBe('CA$3,074.48');
		expect(r.primaryResult).toBe('CA$9,513.21');
		expect(metric(r, 'Marginal tax rate')).toBe('30.5%');
		expect(run({ province: 'AB', employment: '60000' }).primaryResult).toBe('CA$7,969.60');
		expect(run({ province: 'AB', employment: '150000' }).primaryResult).toBe('CA$36,772.52');
	});

	it('Manitoba: basic amount phases out between $200,000 and $400,000', () => {
		expect(run({ province: 'MB', employment: '250000' }).primaryResult).toBe('CA$89,472.23');
		expect(run({ province: 'MB', employment: '0', other: '300000' }).primaryResult).toBe('CA$116,681.37');
	});

	it('federal basic amount phases down from $181,440 to $258,482', () => {
		expect(federalBpa(181_440)).toBe(16_452);
		expect(federalBpa(258_482)).toBe(14_829);
		expect(federalBpa(219_961)).toBeCloseTo(15_640.5, 1);
		// 33% bracket starts at $258,482
		expect(bracketTax(258_482, FEDERAL_BRACKETS)).toBeCloseTo(8193.22 + 58522 * 0.205 + 64395 * 0.26 + 77042 * 0.29, 2);
	});

	it('Nova Scotia with an RRSP deduction', () => {
		expect(run({ province: 'NS', employment: '60000', rrsp: '5000' }).primaryResult).toBe('CA$9,427.13');
	});

	it('RRSP deduction and other income both change the result', () => {
		const base = canadaIncomeTax({ province: 'ON', employment: 100000, other: 0, rrsp: 0 }).totalTax;
		const withRrsp = canadaIncomeTax({ province: 'ON', employment: 100000, other: 0, rrsp: 10000 }).totalTax;
		expect(withRrsp).toBeLessThan(base);
		expect(base - withRrsp).toBeGreaterThan(2900);
	});

	it('explains that Quebec is not supported and rejects invalid input', () => {
		const q = run({ province: 'QC' });
		expect(q.primaryResult).toBe('—');
		expect(q.summary).toMatch(/Quebec/);
		expect(run({ employment: '', other: '' }).primaryResult).toBe('—');
		expect(run({ employment: '0', other: '0' }).primaryResult).toBe('—');
	});
});
