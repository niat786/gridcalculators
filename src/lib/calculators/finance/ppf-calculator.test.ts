import { beforeEach, describe, expect, it } from 'vitest';
import calc from './ppf-calculator.calc';
import { ppfSchedule } from './ppf-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { PPF_MAX_DEPOSIT, PPF_MIN_DEPOSIT, PPF_RATE } from '../data/in-small-savings';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('PPF calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('uses the notified Oct–Dec 2026 rate and the legal limits from the data file', () => {
		expect(PPF_RATE).toBe(7.1);
		expect(PPF_MIN_DEPOSIT).toBe(500);
		expect(PPF_MAX_DEPOSIT).toBe(150000);
	});

	it('defaults reproduce the India Post example: ₹1.5 lakh a year, 15 years, 7.1% = ₹40.68 lakh', () => {
		// India Post PPF page example (₹40.68 lakh). Hand check: 150000 × 1.071 × (1.071^15 − 1) ÷ 0.071 = 40,68,209.22
		const r = run();
		expect(r.primaryResult).toBe('₹40,68,209');
		expect(metric(r, 'Total deposited')).toBe('₹22,50,000');
		expect(metric(r, 'Interest earned (tax-free)')).toBe('₹18,18,209');
		expect(r.table?.rows.length).toBe(15);
		expect(r.table?.rows[0].closing).toBe('₹1,60,650');
	});

	it('minimum deposit ₹500 a year at 7.1% for 15 years', () => {
		// 500 × 1.071 × (1.071^15 − 1) ÷ 0.071 = 13,560.70
		expect(run({ deposit: '500' }).primaryResult).toBe('₹13,561');
	});

	it('₹1 lakh a year at 8% for 15 years', () => {
		// 100000 × 1.08 × (1.08^15 − 1) ÷ 0.08 = 29,32,428.30
		expect(run({ deposit: '100000', rate: '8' }).primaryResult).toBe('₹29,32,428');
	});

	it('one 5-year extension with deposits runs 20 years', () => {
		// 150000 × 1.071 × (1.071^20 − 1) ÷ 0.071 = 66,58,288.17
		const r = run({ extensions: '1' });
		expect(r.primaryResult).toBe('₹66,58,288');
		expect(metric(r, 'Account term')).toBe('20 years');
		expect(metric(r, 'Total deposited')).toBe('₹30,00,000');
	});

	it('one 5-year extension without deposits only compounds the 15-year balance', () => {
		// 4068209.22 × 1.071^5 = 57,32,586.73
		const r = run({ extensions: '1', extDeposits: false });
		expect(r.primaryResult).toBe('₹57,32,587');
		expect(metric(r, 'Total deposited')).toBe('₹22,50,000');
	});

	it('zero rate gives back exactly what was deposited', () => {
		const r = run({ deposit: '25000', rate: '0' });
		expect(r.primaryResult).toBe('₹3,75,000');
		expect(metric(r, 'Interest earned (tax-free)')).toBe('₹0');
	});

	it('schedule compounds yearly on opening balance plus deposit', () => {
		const s = ppfSchedule(1000, 10, 2, 2);
		expect(s[0].closing).toBeCloseTo(1100, 9);
		expect(s[1].closing).toBeCloseTo(2310, 9); // (1100 + 1000) × 1.1
	});

	it('rejects deposits outside ₹500–₹1,50,000 and bad rates', () => {
		expect(run({ deposit: '499' }).primaryResult).toBe('—');
		expect(run({ deposit: '150001' }).primaryResult).toBe('—');
		expect(run({ deposit: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
		expect(run({ rate: 'abc' }).primaryResult).toBe('—');
	});

	it('accepts the limits exactly', () => {
		expect(run({ deposit: '150000' }).primaryResult).not.toBe('—');
		expect(run({ deposit: '500' }).primaryResult).not.toBe('—');
	});
});
