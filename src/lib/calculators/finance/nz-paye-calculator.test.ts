import { beforeEach, describe, expect, it } from 'vitest';
import calc, { nzPay } from './nz-paye-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { ietc, nzIncomeTax } from '../data/nz-tax-2026-27';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

beforeEach(() => setCurrency('NZD'));

// Expected values computed independently in node from the IRD bracket table, ACC 1.75%, 12% over $24,128 and IETC rules.
describe('nz paye calculator (2026-27)', () => {
	it('matches the worked example: $80,000, code M, 3.5% KiwiSaver', () => {
		// tax 16,277.50; ACC 1,400; KiwiSaver 2,800 → 59,522.50
		expect(run().primaryResult).toBe('NZ$59,522.50');
		expect(run({ period: 'monthly', salary: '6666.6666666667' }).primaryResult).toBe('NZ$4,960.21');
	});

	it('taxes exactly at each bracket edge', () => {
		expect(nzIncomeTax(15_600)).toBeCloseTo(1_638, 6);
		expect(nzIncomeTax(15_601)).toBeCloseTo(1_638.175, 6);
		expect(nzIncomeTax(53_500)).toBeCloseTo(8_270.5, 6);
		expect(nzIncomeTax(78_100)).toBeCloseTo(15_650.5, 6);
		expect(nzIncomeTax(180_000)).toBeCloseTo(49_277.5, 6);
		expect(nzIncomeTax(250_000)).toBeCloseTo(76_577.5, 6);
	});

	it('adds the IETC for code ME', () => {
		// $40,000: tax 5,908 − 520 = 5,388; ACC 700; KiwiSaver 1,400 → 32,512
		expect(run({ salary: '40000', code: 'ME' }).primaryResult).toBe('NZ$32,512.00');
		// $68,000: credit 520 − 13% × 2,000 = 260 → net 54,449.50 with no KiwiSaver
		expect(run({ salary: '68000', code: 'ME', ks: '0' }).primaryResult).toBe('NZ$54,449.50');
		expect(ietc(23_999)).toBe(0);
		expect(ietc(24_000)).toBe(520);
		expect(ietc(66_000)).toBe(520);
		expect(ietc(70_000)).toBe(0);
	});

	it('deducts student loan repayments over $24,128', () => {
		// $120,000: tax 29,477.50; ACC 2,100; loan 12% × 95,872 = 11,504.64; KiwiSaver 4,200 → 72,717.86
		expect(run({ salary: '120000', sl: true }).primaryResult).toBe('NZ$72,717.86');
		expect(nzPay(24_128, 'M', 0, true).sl).toBe(0);
	});

	it('stops the ACC levy at the maximum earnings', () => {
		// $250,000, 6% KiwiSaver, student loan: tax 76,577.50; ACC 2,741.22; loan 27,104.64; KS 15,000
		const r = nzPay(250_000, 'M', 6, true);
		expect(r.acc).toBeCloseTo(2_741.2175, 4);
		expect(r.net).toBeCloseTo(128_576.64, 2);
	});

	it('handles weekly pay, zero, and invalid input', () => {
		// $52,000: tax 8,008 + ACC 910 → 43,082 ÷ 52
		expect(run({ period: 'weekly', salary: '1000', ks: '0' }).primaryResult).toBe('NZ$828.50');
		expect(run({ salary: '0' }).primaryResult).toBe('NZ$0.00');
		expect(run({ salary: '' }).primaryResult).toBe('—');
	});
});
