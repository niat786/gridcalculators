import { beforeEach, describe, expect, it } from 'vitest';
import calc from './zakat-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	const clean = (t: string) => t.replace(/\u00a0/g, ' ');
	return { ...r, primaryResult: clean(r.primaryResult), summary: clean(r.summary ?? ''), secondaryMetrics: r.secondaryMetrics?.map((m) => ({ ...m, value: clean(m.value) })) };
};
const metric = (r: ReturnType<typeof run>, start: string) => r.secondaryMetrics?.find((m) => m.label.startsWith(start))?.value;

// Expected values are hand-computed: zakat = 2.5% of net wealth when net >= nisab (595 g silver or 85 g gold)
// and the wealth has been held for one lunar year (Islamic Relief; Zakat Foundation of America).
describe('zakat calculator', () => {
	beforeEach(() => setCurrency('SAR'));

	it('matches the worked example: 20,000 cash, silver nisab 595 x 15 = 8,925, zakat 500', () => {
		const r = run();
		expect(r.primaryResult).toBe('SAR 500.00');
		expect(metric(r, 'Nisab')).toBe('SAR 8,925.00');
	});

	it('adds every asset and subtracts debts: net 56,000 -> 1,400 (gold nisab 85 x 400 = 34,000)', () => {
		const r = run({ cash: '10000', goldG: '100', goldP: '400', invest: '5000', stock: '3000', owed: '2000', debts: '4000', nisab: 'gold' });
		expect(metric(r, 'Total')).toBe('SAR 60,000.00');
		expect(metric(r, 'Net')).toBe('SAR 56,000.00');
		expect(r.primaryResult).toBe('SAR 1,400.00');
	});

	it('values silver and gold by grams: 10,000 + 50 g x 400 + 100 g x 5 = 30,500 -> 762.50', () => {
		expect(run({ cash: '10000', goldG: '50', goldP: '400', silverG: '100', silverP: '5' }).primaryResult).toBe('SAR 762.50');
	});

	it('exactly at the nisab is zakatable; just below is not', () => {
		expect(run({ cash: '8925' }).primaryResult).toBe('SAR 223.13');
		expect(run({ cash: '8924.99' }).primaryResult).toBe('SAR 0.00');
	});

	it('the gold nisab is higher: 20,000 is below 85 x 770 = 65,450', () => {
		const r = run({ nisab: 'gold' });
		expect(r.primaryResult).toBe('SAR 0.00');
		expect(metric(r, 'Nisab')).toBe('SAR 65,450.00');
	});

	it('debts can bring you below the nisab; debts above assets give zero', () => {
		expect(run({ cash: '10000', debts: '5000' }).primaryResult).toBe('SAR 0.00');
		expect(run({ cash: '1000', debts: '5000' }).primaryResult).toBe('SAR 0.00');
	});

	it('nothing is due before one lunar year has passed', () => {
		const r = run({ hawl: false });
		expect(r.primaryResult).toBe('SAR 0.00');
		expect(r.summary).toContain('SAR 500.00');
	});

	it('returns a dash when a needed price is missing or input is invalid', () => {
		expect(run({ silverP: '0' }).primaryResult).toBe('—');
		expect(run({ goldG: '10', goldP: '0' }).primaryResult).toBe('—');
		expect(run({ cash: '' }).primaryResult).toBe('—');
		expect(run({ cash: '-1' }).primaryResult).toBe('—');
	});
});
