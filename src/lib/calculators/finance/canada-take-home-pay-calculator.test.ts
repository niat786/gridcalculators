import { beforeEach, describe, expect, it } from 'vitest';
import calc from './canada-take-home-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Expected values worked out separately by hand with node from the CRA 2026 figures (not by the code under test).
describe('canada take-home pay calculator', () => {
	it('matches the worked example: $85,000 in Ontario every two weeks', () => {
		const r = run({ salary: '85000', province: 'ON', frequency: 'biweekly' });
		expect(r.primaryResult).toBe('CA$2,449.21');
		expect(metric(r, 'Net pay per year')).toBe('CA$63,679.43');
		expect(metric(r, 'Federal income tax')).toBe('CA$10,226.60');
		expect(metric(r, 'Ontario income tax')).toBe('CA$5,324.46');
		expect(metric(r, 'CPP and CPP2')).toBe('CA$4,646.45');
		expect(metric(r, 'EI premiums')).toBe('CA$1,123.07');
	});

	it('pay frequency only divides the year', () => {
		expect(run({ salary: '85000', frequency: 'monthly' }).primaryResult).toBe('CA$5,306.62');
		expect(run({ salary: '85000', frequency: 'weekly' }).primaryResult).toBe('CA$1,224.60');
		expect(run({ salary: '85000', frequency: 'semimonthly' }).primaryResult).toBe('CA$2,653.31');
	});

	it('British Columbia $60,000 monthly (CPP below the maximum)', () => {
		const r = run({ salary: '60000', province: 'BC', frequency: 'monthly' });
		expect(r.primaryResult).toBe('CA$3,979.55');
		expect(metric(r, 'CPP and CPP2')).toBe('CA$3,361.75');
		expect(metric(r, 'EI premiums')).toBe('CA$978.00');
	});

	it('Alberta $120,000 includes CPP2 and the EI maximum', () => {
		const r = run({ salary: '120000', province: 'AB', frequency: 'monthly' });
		expect(r.primaryResult).toBe('CA$7,354.83');
		expect(metric(r, 'CPP and CPP2')).toBe('CA$4,646.45');
	});

	it('Manitoba with pre-tax deductions, and Nova Scotia', () => {
		expect(run({ salary: '70000', province: 'MB', pretax: '3000', frequency: 'monthly' }).primaryResult).toBe('CA$4,158.07');
		expect(run({ salary: '45000', province: 'NS', frequency: 'monthly' }).primaryResult).toBe('CA$2,916.40');
		expect(run({ salary: '30000', province: 'ON', frequency: 'biweekly' }).primaryResult).toBe('CA$980.08');
	});

	it('very large salary: contributions stay at their maximums', () => {
		const r = run({ salary: '500000', province: 'ON', frequency: 'monthly' });
		expect(r.primaryResult).toBe('CA$22,756.47');
		expect(metric(r, 'CPP and CPP2')).toBe('CA$4,646.45');
	});

	it('Quebec and invalid input return a dash', () => {
		const q = run({ province: 'QC' });
		expect(q.primaryResult).toBe('—');
		expect(q.summary).toMatch(/Quebec/);
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '0' }).primaryResult).toBe('—');
		expect(run({ salary: '50000', pretax: '60000' }).primaryResult).toBe('—');
	});
});
