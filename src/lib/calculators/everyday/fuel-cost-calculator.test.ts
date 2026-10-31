import { describe, expect, it } from 'vitest';
import calc from './fuel-cost-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('fuel cost calculator', () => {
	it('prices a 250 mile trip at 28 mpg and $3.45 per gallon', () => {
		// 250 / 28 = 8.9286 gal; 8.9286 × 3.45 = 30.80
		const r = run();
		expect(r.primaryResult).toBe('$30.80');
		expect(r.secondaryMetrics?.[0].value).toBe('8.93 gal (33.80 L)');
	});

	it('matches the worked example with a round trip', () => {
		// 500 / 28 = 17.857 gal; × 3.45 = 61.61
		const r = run({ distUs: '250', mpg: '28', priceGal: '3.45', roundTrip: true });
		expect(r.primaryResult).toBe('$61.61');
		expect(r.secondaryMetrics?.[0].value).toBe('17.86 gal (67.60 L)');
		expect(r.secondaryMetrics?.[2].value).toBe('$12.32');
	});

	it('works in metric: 400 km at 6.5 L/100 km and $1.80 per litre', () => {
		// 400 × 6.5 / 100 = 26 L; × 1.80 = 46.80
		const r = run({ units: 'metric', distKm: '400', l100: '6.5', priceL: '1.8' });
		expect(r.primaryResult).toBe('$46.80');
		expect(r.secondaryMetrics?.[0].value).toBe('26.00 L (6.87 gal)');
	});

	it('doubles the metric distance for a round trip', () => {
		// 800 × 6.5 / 100 = 52 L; × 1.80 = 93.60
		expect(run({ units: 'metric', distKm: '400', l100: '6.5', priceL: '1.8', roundTrip: true }).primaryResult).toBe(
			'$93.60'
		);
	});

	it('returns a dash when distance or efficiency is missing or zero', () => {
		expect(run({ distUs: '' }).primaryResult).toBe('—');
		expect(run({ mpg: '0' }).primaryResult).toBe('—');
	});
});
