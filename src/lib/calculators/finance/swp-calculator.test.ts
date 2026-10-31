import { beforeEach, describe, expect, it } from 'vitest';
import calc from './swp-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('SWP calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('matches the closed-form balance: ₹50,00,000, ₹30,000 a month, 8%, 10 years', () => {
		// Independent check (node): B(120) = 5,000,000 × 1.0066667^120 − 30,000 × (1.0066667^120 − 1) ÷ 0.0066667
		//   = 1,10,98,201.17 − 54,88,381.06 = 56,09,820.12
		const r = run({ corpus: '5000000', withdrawal: '30000', rate: '8', years: '10' });
		expect(r.primaryResult).toBe('₹56,09,820');
		expect(metric(r, 'Total withdrawn')).toBe('₹36,00,000');
		expect(metric(r, 'Growth earned')).toBe('₹42,09,820');
		expect(metric(r, 'Money runs out')).toBe('Not within the period');
	});

	it('finds the run-out month: ₹10,00,000, ₹10,000 a month, 6%', () => {
		// Closed form gives n* = −ln(1 − P·i ÷ W) ÷ ln(1 + i) = 138.976, so the balance cannot cover
		// the withdrawal in month 139 (year 12). Independent total withdrawn = 13,89,757.81.
		const r = run({ corpus: '1000000', withdrawal: '10000', rate: '6', years: '15' });
		expect(metric(r, 'Money runs out')).toBe('Month 139 (year 12)');
		expect(r.primaryResult).toBe('₹0');
		expect(metric(r, 'Total withdrawn')).toBe('₹13,89,758');
		expect(metric(r, 'Growth earned')).toBe('₹3,89,758');
		expect(r.summary).toContain('month 139');
	});

	it('keeps the balance flat when the return exactly covers the withdrawal', () => {
		// 6% a year on ₹10,00,000 is ₹5,000 a month, equal to the withdrawal
		const r = run({ corpus: '1000000', withdrawal: '5000', rate: '6', years: '10' });
		expect(r.primaryResult).toBe('₹10,00,000');
		expect(metric(r, 'Money runs out')).toBe('Not within the period');
		expect(metric(r, 'Total withdrawn')).toBe('₹6,00,000');
	});

	it('handles a 0% return: the money runs out in the month the corpus is used up', () => {
		// ₹12,00,000 ÷ ₹10,000 = 120 months exactly, so month 120 (year 10) is the last withdrawal
		const r = run({ corpus: '1200000', withdrawal: '10000', rate: '0', years: '10' });
		expect(metric(r, 'Money runs out')).toBe('Month 120 (year 10)');
		expect(r.primaryResult).toBe('₹0');
		expect(metric(r, 'Total withdrawn')).toBe('₹12,00,000');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ corpus: '' }).primaryResult).toBe('—');
		expect(run({ corpus: '0' }).primaryResult).toBe('—');
		expect(run({ withdrawal: '' }).primaryResult).toBe('—');
		expect(run({ years: '0' }).primaryResult).toBe('—');
	});
});
