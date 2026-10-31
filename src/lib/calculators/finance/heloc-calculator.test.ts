import { describe, expect, it } from 'vitest';
import calc from './heloc-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('heloc calculator', () => {
	it('matches the worked example: $50,000 at 8.5%, 10-year draw, 20-year repayment', () => {
		const r = run({ drawn: '50000', rate: '8.5', drawYears: '10', repayYears: '20' });
		expect(r.primaryResult).toBe('$354.17');
		expect(metric(r, 'Repayment payment')).toBe('$433.91');
		expect(metric(r, 'Payment increase at repayment')).toBe('$79.74');
		expect(metric(r, 'Total interest')).toBe('$96,638.79');
		expect(metric(r, 'Total repaid')).toBe('$146,638.79');
	});

	it('handles a second known answer: $80,000 at 7%, 5-year draw, 15-year repayment', () => {
		const r = run({ drawn: '80000', rate: '7', drawYears: '5', repayYears: '15' });
		expect(r.primaryResult).toBe('$466.67');
		expect(metric(r, 'Repayment payment')).toBe('$719.06');
		expect(metric(r, 'Total interest')).toBe('$77,431.27');
	});

	it('uses principal divided by months for repayment at 0%, with no interest', () => {
		const r = run({ drawn: '30000', rate: '0', drawYears: '5', repayYears: '10' });
		expect(r.primaryResult).toBe('$0.00');
		expect(metric(r, 'Repayment payment')).toBe('$250.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash for an empty amount', () => {
		expect(run({ drawn: '' }).primaryResult).toBe('—');
	});
});
