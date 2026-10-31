import { beforeEach, describe, expect, it } from 'vitest';
import calc from './south-africa-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { ZA_REBATE_PRIMARY, ZA_REBATE_SECONDARY, ZA_REBATE_TERTIARY, ZA_THRESHOLDS } from '../data/za-2026-27';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const R = (s: string) => `ZAR ${s}`;

beforeEach(() => setCurrency('ZAR'));

// Expected values were worked out separately by hand and with node from the SARS 2026/27 table (not by the code under test).
describe('south africa income tax calculator', () => {
	it('matches the worked example: R500,000, under 65', () => {
		const r = run({ income: '500000', age: 'under65', members: '0' });
		expect(r.primaryResult).toBe(R('98,417.00'));
		expect(metric(r, 'Tax before rebates')).toBe(R('116,237.00'));
		expect(metric(r, 'Rebates')).toBe(R('17,820.00'));
		expect(metric(r, 'Average tax rate')).toBe('19.68%');
		expect(metric(r, 'Marginal tax rate')).toBe('31%');
		expect(metric(r, 'Tax per month')).toBe(R('8,201.42'));
	});

	it('is zero at each age threshold and taxed above it', () => {
		expect(run({ income: '99000', age: 'under65' }).primaryResult).toBe(R('0.00'));
		expect(run({ income: '99001', age: 'under65' }).primaryResult).toBe(R('0.18'));
		expect(run({ income: '153250', age: '65to74' }).primaryResult).toBe(R('0.00'));
		expect(run({ income: '171300', age: '75plus' }).primaryResult).toBe(R('0.00'));
		// the published thresholds equal (rebates ÷ 18%)
		expect(ZA_THRESHOLDS.under65).toBe(ZA_REBATE_PRIMARY / 0.18);
		expect(ZA_THRESHOLDS.age65).toBe((ZA_REBATE_PRIMARY + ZA_REBATE_SECONDARY) / 0.18);
		expect(ZA_THRESHOLDS.age75).toBe((ZA_REBATE_PRIMARY + ZA_REBATE_SECONDARY + ZA_REBATE_TERTIARY) / 0.18);
	});

	it('applies the medical scheme fees tax credit (R376, R376, R254 a month)', () => {
		const two = run({ income: '200000', age: 'under65', members: '2' });
		expect(two.primaryResult).toBe(R('9,156.00'));
		expect(metric(two, 'Medical scheme fees tax credit')).toBe(R('9,024.00'));
		// one member: 36,000 − 17,820 − 4,512 = 13,668
		expect(run({ income: '200000', members: '1' }).primaryResult).toBe(R('13,668.00'));
		// four members: credit (376 + 376 + 254 + 254) × 12 = 15,120; tax 18,180 − 15,120 = 3,060
		expect(run({ income: '200000', members: '4' }).primaryResult).toBe(R('3,060.00'));
		// the credit never takes the tax below zero
		expect(run({ income: '110000', members: '4' }).primaryResult).toBe(R('0.00'));
	});

	it('uses the top bracket and age rebates', () => {
		expect(run({ income: '2000000' }).primaryResult).toBe(R('703,149.00'));
		expect(metric(run({ income: '2000000' }), 'Marginal tax rate')).toBe('45%');
		expect(run({ income: '1878600' }).primaryResult).toBe(R('648,519.00'));
		// 75+, four members: 116,237 − 30,834 rebates − 15,120 credit = 70,283; 65–74, three members: 306,113 − 27,585 − 12,072 = 266,456
		expect(run({ income: '500000', age: '75plus', members: '4' }).primaryResult).toBe(R('70,283.00'));
		expect(run({ income: '1000000', age: '65to74', members: '3' }).primaryResult).toBe(R('266,456.00'));
	});

	it('marginal rate is 0% while rebates absorb the tax', () => {
		expect(metric(run({ income: '50000' }), 'Marginal tax rate')).toBe('0%');
		expect(run({ income: '0' }).primaryResult).toBe(R('0.00'));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ income: '-5' }).primaryResult).toBe('—');
	});
});
