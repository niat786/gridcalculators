import { describe, expect, it } from 'vitest';
import calc from './gas-mileage-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('gas mileage calculator', () => {
	it('matches the worked example: 350 miles on 12.5 gallons', () => {
		// 350 / 12.5 = 28 mpg; 235.214583 / 28 = 8.40 L/100 km; 28 × 1.609344 / 3.785411784 = 11.90 km/L
		const r = run();
		expect(r.primaryResult).toBe('28.0 mpg');
		expect(r.secondaryMetrics?.[0].value).toBe('8.40 L/100 km');
		expect(r.secondaryMetrics?.[1].value).toBe('11.90 km/L');
	});

	it('gives the same economy from metric inputs: 560 km on 47.3 litres', () => {
		// 560 km = 347.9 mi; 47.3 L = 12.496 gal; 27.85 mpg; 8.45 L/100 km; 11.84 km/L
		const r = run({ units: 'metric', distKm: '560', litres: '47.3' });
		expect(r.primaryResult).toBe('27.8 mpg');
		expect(r.secondaryMetrics?.[0].value).toBe('8.45 L/100 km');
		expect(r.secondaryMetrics?.[1].value).toBe('11.84 km/L');
	});

	it('handles 100 miles on 4 gallons', () => {
		// 25 mpg; 9.41 L/100 km; 10.63 km/L
		const r = run({ distMi: '100', galUs: '4' });
		expect(r.primaryResult).toBe('25.0 mpg');
		expect(r.secondaryMetrics?.[0].value).toBe('9.41 L/100 km');
		expect(r.secondaryMetrics?.[1].value).toBe('10.63 km/L');
	});

	it('returns a dash when distance or fuel is missing or zero', () => {
		expect(run({ distMi: '' }).primaryResult).toBe('—');
		expect(run({ galUs: '0' }).primaryResult).toBe('—');
		expect(run({ units: 'metric', distKm: 'abc' }).primaryResult).toBe('—');
	});
});
