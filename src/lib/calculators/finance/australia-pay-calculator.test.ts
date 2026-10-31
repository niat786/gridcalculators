import { beforeEach, describe, expect, it } from 'vitest';
import calc from './australia-pay-calculator.calc';
import { auPay } from './australia-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

beforeEach(() => setCurrency('AUD'));

describe('australia pay calculator (2026-27)', () => {
	it('matches the worked example: $90,000 resident, super on top', () => {
		// tax 4,020 + 30% × 45,000 = 17,520; Medicare 1,800; net 70,680 → 5,890 a month
		const r = run({ period: 'monthly', income: '7500' });
		expect(r.primaryResult).toBe('A$5,890.00');
		const y = run();
		expect(y.primaryResult).toBe('A$70,680.00');
		expect(y.secondaryMetrics?.find((m) => m.label === 'Super per year')?.value).toBe('A$10,800.00');
	});

	it('uses the ATO bracket edges (hand-computed)', () => {
		expect(auPay(18_200, 'resident', 'none', false).incomeTax).toBe(0);
		expect(auPay(18_201, 'resident', 'none', false).incomeTax).toBeCloseTo(0, 10); // 15c, then LITO $700 wipes it out
		const at45 = auPay(45_000, 'resident', 'none', false);
		expect(at45.incomeTax).toBeCloseTo(4_020 - 325, 6); // ATO: $4,020 at $45,000, less LITO $325
		const at135 = auPay(135_000, 'resident', 'none', false);
		expect(at135.incomeTax).toBeCloseTo(31_020, 6);
		expect(auPay(190_000, 'resident', 'none', false).incomeTax).toBeCloseTo(51_370, 6);
		expect(auPay(250_000, 'resident', 'none', false).incomeTax).toBeCloseTo(78_370, 6);
	});

	it('applies LITO and the Medicare phase-in at $30,000', () => {
		// tax 15% × 11,800 = 1,770 less LITO 700 = 1,070; Medicare 10% × (30,000 − 28,011) = 198.90 (ATO example gives $98.90 at $29,000)
		const r = auPay(30_000, 'resident', 'none', false);
		expect(r.incomeTax).toBeCloseTo(1_070, 6);
		expect(r.medicare).toBeCloseTo(198.9, 6);
		expect(run({ income: '30000' }).primaryResult).toBe('A$28,731.10');
		expect(auPay(29_000, 'resident', 'none', false).medicare).toBeCloseTo(98.9, 6);
	});

	it('charges no Medicare at or below the lower threshold and full 2% above the upper one', () => {
		expect(auPay(28_011, 'resident', 'none', false).medicare).toBe(0);
		expect(auPay(35_013, 'resident', 'none', false).medicare).toBeCloseTo(700.2, 6);
		expect(auPay(35_014, 'resident', 'none', false).medicare).toBeCloseTo(700.28, 6);
	});

	it('adds the HELP repayment on the marginal scale', () => {
		// $100,000: tax 20,520, Medicare 2,000, HELP 15% × (100,000 − 69,528) = 4,570.80 → 72,909.20 → 6,075.77 a month
		const r = run({ income: '100000', help: true, period: 'annual' });
		expect(r.primaryResult).toBe('A$72,909.20');
		expect(r.secondaryMetrics?.find((m) => m.label === 'HELP repayment per year')?.value).toBe('A$4,570.80');
		// $150,000: 9,028 + 17% × (150,000 − 129,717) = 12,476.11
		expect(auPay(150_000, 'resident', 'none', true).help).toBeCloseTo(12_476.11, 6);
		// $200,000: 10% of total
		expect(auPay(200_000, 'resident', 'none', true).help).toBeCloseTo(20_000, 6);
	});

	it('works out a package that includes super', () => {
		// package 112,000 → salary 100,000, super 12,000
		const r = auPay(112_000, 'resident', 'included', false);
		expect(r.salary).toBeCloseTo(100_000, 6);
		expect(r.super).toBeCloseTo(12_000, 6);
		// above the maximum contribution base the super is capped at 12% × 270,830 = 32,499.60
		const big = auPay(400_000, 'resident', 'included', false);
		expect(big.super).toBeCloseTo(32_499.6, 6);
		expect(big.salary).toBeCloseTo(367_500.4, 6);
	});

	it('uses working holiday maker and foreign resident rates, with no Medicare', () => {
		// WHM $60,000: 6,750 + 30% × 15,000 = 11,250 → 48,750
		expect(run({ status: 'whm', income: '60000' }).primaryResult).toBe('A$48,750.00');
		// foreign resident $60,000: 30% = 18,000 → 42,000
		expect(run({ status: 'foreign', income: '60000' }).primaryResult).toBe('A$42,000.00');
		// foreign resident $200,000: 40,500 + 37% × 55,000 = 60,850 + 45% × 10,000 = 65,350
		expect(auPay(200_000, 'foreign', 'none', false).incomeTax).toBeCloseTo(65_350, 6);
	});

	it('converts weekly income', () => {
		// $1,500/week = $78,000: tax 13,920, Medicare 1,560 → 62,520 → 1,202.31 a week
		expect(run({ period: 'weekly', income: '1500' }).primaryResult).toBe('A$1,202.31');
	});

	it('handles zero and rejects invalid input', () => {
		expect(run({ income: '0' }).primaryResult).toBe('A$0.00');
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ income: '-5' }).primaryResult).toBe('—');
	});
});
