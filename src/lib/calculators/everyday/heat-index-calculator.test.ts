import { describe, expect, it } from 'vitest';
import calc from './heat-index-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('heat index calculator', () => {
	it('matches the NWS chart: 90 °F at 70% gives 105.9 °F, shown as 106 °F', () => {
		const r = run();
		expect(r.primaryResult).toBe('106 °F');
		expect(r.secondaryMetrics?.[0].value).toBe('105.9 °F');
		expect(r.secondaryMetrics?.[1].value).toBe('41.1 °C');
		expect(r.secondaryMetrics?.[2].value).toBe('Danger');
	});

	it('uses the high-humidity adjustment: 85 °F at 90% gives 101.8 °F', () => {
		const r = run({ tempF: '85', rh: '90' });
		expect(r.secondaryMetrics?.[0].value).toBe('101.8 °F');
		expect(r.primaryResult).toBe('102 °F');
	});

	it('uses the low-humidity adjustment: 95 °F at 10% gives 89.4 °F, caution', () => {
		const r = run({ tempF: '95', rh: '10' });
		expect(r.secondaryMetrics?.[0].value).toBe('89.4 °F');
		expect(r.secondaryMetrics?.[2].value).toBe('Caution');
	});

	it('uses the regression at 100 °F and 50%: 118.3 °F is danger', () => {
		const r = run({ tempF: '100', rh: '50' });
		expect(r.primaryResult).toBe('118 °F');
		expect(r.secondaryMetrics?.[2].value).toBe('Danger');
	});

	it('uses the simple formula below 80 °F: 75 °F at 50% gives 74.6 °F', () => {
		// 0.5 × (75 + 61 + 7 × 1.2 + 50 × 0.094) = 74.55
		const r = run({ tempF: '75', rh: '50' });
		expect(r.secondaryMetrics?.[0].value).toBe('74.6 °F');
		expect(r.secondaryMetrics?.[2].value).toBe('Below NWS caution levels');
	});

	it('works in Celsius: 32 °C at 70% gives 104.7 °F, which is 40 °C', () => {
		const r = run({ units: 'c', tempC: '32', rh: '70' });
		expect(r.secondaryMetrics?.[0].value).toBe('104.7 °F');
		expect(r.primaryResult).toBe('40 °C');
	});

	it('returns a dash for humidity above 100% or a missing temperature', () => {
		expect(run({ rh: '120' }).primaryResult).toBe('—');
		expect(run({ tempF: '' }).primaryResult).toBe('—');
	});
});
