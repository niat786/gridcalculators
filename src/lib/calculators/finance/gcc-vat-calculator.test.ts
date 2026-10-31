import { beforeEach, describe, expect, it } from 'vitest';
import calc from './gcc-vat-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	const clean = (s: string) => s.replace(/ /g, ' ');
	return { ...r, primaryResult: clean(r.primaryResult), secondaryMetrics: r.secondaryMetrics?.map((m) => ({ ...m, value: clean(m.value) })) };
};
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

// All expected numbers are hand-computed from the standard rates: UAE 5%, Saudi 15%, Bahrain 10%, Oman 5%, Qatar and Kuwait 0%.
describe('GCC VAT calculator', () => {
	beforeEach(() => setCurrency('USD'));

	it('UAE: adding 5% to AED 1,000 gives AED 1,050.00', () => {
		const r = run({ country: 'AE', amount: '1000' });
		expect(r.primaryResult).toBe('AED 1,050.00');
		expect(metric(r, 'VAT')).toBe('AED 50.00');
	});

	it('Saudi Arabia: removing 15% from SAR 115 gives net SAR 100.00 and VAT SAR 15.00', () => {
		const r = run({ country: 'SA', mode: 'remove', amount: '115' });
		expect(r.primaryResult).toBe('SAR 100.00');
		expect(metric(r, 'VAT')).toBe('SAR 15.00');
	});

	it('Bahrain: 10% on BHD 250 is BHD 25.000, total BHD 275.000 (three decimals)', () => {
		const r = run({ country: 'BH', amount: '250' });
		expect(r.primaryResult).toBe('BHD 275.000');
		expect(metric(r, 'VAT rate')).toBe('10%');
	});

	it('Oman: removing 5% from OMR 105 gives OMR 100.000; adding to 7.777 rounds VAT to 0.389', () => {
		expect(run({ country: 'OM', mode: 'remove', amount: '105' }).primaryResult).toBe('OMR 100.000');
		const r = run({ country: 'OM', amount: '7.777' });
		expect(metric(r, 'VAT')).toBe('OMR 0.389');
		expect(r.primaryResult).toBe('OMR 8.166');
	});

	it('Qatar and Kuwait have no VAT: 0% and the amount is unchanged', () => {
		const q = run({ country: 'QA', amount: '100' });
		expect(q.primaryResult).toBe('QAR 100.00');
		expect(metric(q, 'VAT rate')).toBe('0%');
		expect(q.summary).toContain('no VAT');
		expect(run({ country: 'KW', mode: 'remove', amount: '12.345' }).primaryResult).toBe('KWD 12.345');
	});

	it('rounds half up to the currency unit: 15% of SAR 33.33 = 4.9995 -> 5.00', () => {
		const r = run({ country: 'SA', amount: '33.33' });
		expect(metric(r, 'VAT')).toBe('SAR 5.00');
		expect(r.primaryResult).toBe('SAR 38.33');
	});

	it('zero is fine; negative or empty gives a dash', () => {
		expect(run({ amount: '0' }).primaryResult).toBe('AED 0.00');
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ amount: '-5' }).primaryResult).toBe('—');
	});
});
