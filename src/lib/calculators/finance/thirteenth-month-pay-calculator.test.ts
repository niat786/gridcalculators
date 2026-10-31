import { beforeEach, describe, expect, it } from 'vitest';
import calc from './thirteenth-month-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values are computed by hand: 13th month = basic salary earned in the year / 12.
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('PHP'));

describe('13th month pay calculator (Philippines)', () => {
	it('matches the worked example: 25,000 x 12 months', () => {
		const r = run();
		expect(r.primaryResult).toBe('₱25,000.00');
		expect(metric(r, 'Basic salary earned in the year')).toBe('₱300,000.00');
		expect(metric(r, 'Tax-free part')).toBe('₱25,000.00');
		expect(metric(r, 'Taxable part')).toBe('₱0.00');
		expect(metric(r, 'Tax-free limit still unused')).toBe('₱65,000.00');
	});

	it('DOLE guideline example: 9 months at 9,000 gives 6,750', () => {
		expect(run({ basic: '9000', months: '9' }).primaryResult).toBe('₱6,750.00');
	});

	it('total-for-the-year mode: 487,500 earned gives 40,625', () => {
		expect(run({ mode: 'total', total: '487500' }).primaryResult).toBe('₱40,625.00');
	});

	it('exemption boundary: 90,000 exactly is tax-free, 90,000.01 over is taxable', () => {
		const exact = run({ basic: '90000', months: '12' });
		expect(exact.primaryResult).toBe('₱90,000.00');
		expect(metric(exact, 'Taxable part')).toBe('₱0.00');
		const over = run({ basic: '120000', months: '12', other: '10000' });
		expect(over.primaryResult).toBe('₱120,000.00');
		expect(metric(over, 'Tax-free part')).toBe('₱90,000.00');
		expect(metric(over, 'Taxable part')).toBe('₱40,000.00');
	});

	it('other bonuses share the limit: 25,000 + 80,000 gives 15,000 taxable', () => {
		const r = run({ other: '80000' });
		expect(metric(r, '13th month pay plus other bonuses')).toBe('₱105,000.00');
		expect(metric(r, 'Taxable part')).toBe('₱15,000.00');
		expect(metric(r, 'Tax-free limit still unused')).toBe('₱0.00');
	});

	it('less than one month of service is not covered; half months pro-rate', () => {
		expect(run({ months: '0.5' }).primaryResult).toBe('₱0.00');
		expect(run({ months: '0' }).primaryResult).toBe('₱0.00');
		expect(run({ basic: '24000', months: '1.5' }).primaryResult).toBe('₱3,000.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ months: '13' }).primaryResult).toBe('—');
		expect(run({ mode: 'total', total: '-1' }).primaryResult).toBe('—');
		expect(run({ other: 'abc' }).primaryResult).toBe('—');
	});
});
