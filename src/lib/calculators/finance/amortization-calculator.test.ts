import { describe, expect, it } from 'vitest';
import calc from './amortization-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('amortization calculator', () => {
	it('matches the worked example: $200,000 at 6% over 30 years', () => {
		const r = run();
		expect(r.primaryResult).toBe('$1,199.10');
		expect(metric(r, 'Total of payments')).toBe('$431,676.38');
		expect(metric(r, 'Total interest')).toBe('$231,676.38');
		expect(metric(r, 'Number of payments')).toBe('360 payments');
	});

	it('splits the first payment into interest and principal', () => {
		const first = run().table?.rows[0];
		expect(first).toMatchObject({
			month: '1',
			payment: '$1,199.10',
			principal: '$199.10',
			interest: '$1,000.00'
		});
	});

	it('shows the balance after 12 payments', () => {
		expect(run().table?.rows[11].balance).toBe('$197,543.98');
	});

	it('has one row per month and ends at zero', () => {
		const t = run({ years: '15', amount: '100000', rate: '4' }).table;
		expect(t?.rows).toHaveLength(180);
		expect(t?.rows[179].balance).toBe('$0.00');
		// 15 years at 4%: 739.6879 per month, total interest 33,143.83, balance after 60 months 73,059.11
		expect(t?.rows[59].balance).toBe('$73,059.11');
		expect(run({ years: '15', amount: '100000', rate: '4' }).primaryResult).toBe('$739.69');
	});

	it('uses P ÷ n when the rate is 0%', () => {
		const r = run({ amount: '12000', rate: '0', years: '1' });
		expect(r.primaryResult).toBe('$1,000.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
		expect(r.table?.rows).toHaveLength(12);
	});

	it('returns a dash for an empty amount', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
	});
});
