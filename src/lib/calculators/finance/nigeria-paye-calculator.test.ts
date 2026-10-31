import { beforeEach, describe, expect, it } from 'vitest';
import calc from './nigeria-paye-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const N = (s: string) => `NGN ${s}`;
/** All pay in basic salary, no pension, NHF, rent or other deductions. */
const plain = (basic: string, over: Record<string, string> = {}) =>
	run({ basic, housing: '0', transport: '0', other: '0', rent: '0', pension: 'no', nhf: 'no', extra: '0', ...over });

beforeEach(() => setCurrency('NGN'));

// Expected values were worked out separately with node from the Nigeria Tax Act 2025 bands (not by the code under test).
describe('nigeria paye calculator', () => {
	it('matches the worked example: ₦500,000 a month with ₦2.4m rent', () => {
		const r = run();
		expect(r.primaryResult).toBe(N('403,335.00'));
		expect(metric(r, 'PAYE per month')).toBe(N('58,415.00'));
		expect(metric(r, 'Pension (employee 8%)')).toBe(N('32,000.00'));
		expect(metric(r, 'National Housing Fund')).toBe(N('6,250.00'));
		expect(metric(r, 'Rent relief per year')).toBe(N('480,000.00'));
		expect(metric(r, 'Taxable income per year')).toBe(N('5,061,000.00'));
		expect(metric(r, 'Marginal tax rate')).toBe('18%');
	});

	it('reproduces the published band examples (law firm worked examples)', () => {
		// Adeola Oyinlade & Co: chargeable ₦1.2m -> ₦60,000; ₦6m -> ₦870,000; ₦15m -> ₦2,580,000; ₦60m -> ₦12,930,000
		expect(metric(plain('100000'), 'PAYE per month')).toBe(N('5,000.00'));
		expect(metric(plain('500000'), 'PAYE per month')).toBe(N('72,500.00'));
		expect(metric(plain('1250000'), 'PAYE per month')).toBe(N('215,000.00'));
		expect(metric(plain('5000000'), 'PAYE per month')).toBe(N('1,077,500.00'));
		expect(metric(plain('5000000'), 'Marginal tax rate')).toBe('25%');
		// the same source's rent relief illustration: ₦6m with ₦3m rent -> ₦780,000 a year
		expect(metric(plain('500000', { rent: '3000000' }), 'PAYE per month')).toBe(N('65,000.00'));
	});

	it('is tax free up to ₦800,000 a year and respects band edges', () => {
		// ₦66,666 a month is ₦799,992 a year, just inside the 0% band
		expect(metric(plain('66666'), 'PAYE per month')).toBe(N('0.00'));
		// ₦3m a year (₦250,000 a month) -> ₦330,000
		expect(metric(plain('250000'), 'PAYE per month')).toBe(N('27,500.00'));
		// ₦12m a year (₦1m a month) -> ₦1,950,000
		expect(metric(plain('1000000'), 'PAYE per month')).toBe(N('162,500.00'));
		// below the exempt amount no PAYE is due and net pay equals gross
		expect(plain('50000').primaryResult).toBe(N('50,000.00'));
	});

	it('caps rent relief at ₦500,000 and applies pension on basic + housing + transport', () => {
		const big = run({ basic: '5000000', housing: '2000000', transport: '1000000', other: '2000000', rent: '10000000' });
		expect(metric(big, 'Rent relief per year')).toBe(N('500,000.00'));
		expect(metric(big, 'Pension (employee 8%)')).toBe(N('640,000.00'));
		expect(metric(big, 'National Housing Fund')).toBe(N('125,000.00'));
		expect(metric(big, 'PAYE per month')).toBe(N('2,125,833.33'));
		expect(big.primaryResult).toBe(N('7,109,166.67'));
		// other allowable deductions reduce taxable income only
		expect(run({ basic: '5000000', housing: '2000000', transport: '1000000', other: '2000000', rent: '10000000', extra: '1000000' }).primaryResult).toBe(N('7,130,000.00'));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ basic: '', housing: '0', transport: '0', other: '0' }).primaryResult).toBe('—');
		expect(plain('0').primaryResult).toBe('—');
		expect(plain('-5').primaryResult).toBe('—');
	});
});
