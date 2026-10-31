import { describe, expect, it } from 'vitest';
import calc from './density-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('density calculator', () => {
	it('matches the worked example: 2.7 kg in 1 litre', () => {
		// 2.7 ÷ 0.001 m³ = 2,700 kg/m³ = 2.7 g/cm³; 2,700 ÷ 16.018463 = 168.555 lb/ft³
		const r = run({ solve: 'density', massUnit: 'kg', mass_kg: '2.7', volumeUnit: 'L', vol_L: '1', densityUnit: 'gcm3' });
		expect(r.primaryResult).toBe('2.7 g/cm³');
		expect(r.secondaryMetrics?.[0].value).toBe('2,700 kg/m³');
		expect(r.secondaryMetrics?.[1].value).toBe('2.7 g/cm³');
		expect(r.secondaryMetrics?.[2].value).toBe('168.555 lb/ft³');
	});

	it('finds the density of water: 1,000 g in 1 litre', () => {
		// 1,000 g ÷ 1 L = 1 kg/L = 1,000 kg/m³ = 1 g/cm³ = 62.428 lb/ft³
		const r = run({ solve: 'density', massUnit: 'g', mass_g: '1000', volumeUnit: 'L', vol_L: '1', densityUnit: 'gcm3' });
		expect(r.primaryResult).toBe('1 g/cm³');
		expect(r.secondaryMetrics?.[2].value).toBe('62.428 lb/ft³');
	});

	it('finds the mass of 2 litres of water: 1 g/cm³ × 2 L', () => {
		// 1,000 kg/m³ × 0.002 m³ = 2 kg = 2,000 g = 4.409 lb
		const r = run({ solve: 'mass', densityUnit: 'gcm3', den_gcm3: '1', volumeUnit: 'L', vol_L: '2', massUnit: 'kg' });
		expect(r.primaryResult).toBe('2 kg');
		expect(r.secondaryMetrics?.[1].value).toBe('2,000 g');
		expect(r.secondaryMetrics?.[2].value).toBe('4.409 lb');
	});

	it('finds the volume of 10 lb at 62.4 lb/ft³', () => {
		// 10 lb = 4.5359 kg; density 62.4 lb/ft³ = 999.5 kg/m³; volume 0.004538 m³ = 4.538 L = 0.160256 ft³
		const r = run({ solve: 'volume', massUnit: 'lb', mass_lb: '10', densityUnit: 'lbft3', den_lbft3: '62.4', volumeUnit: 'L' });
		expect(r.primaryResult).toBe('4.538 L');
		expect(r.secondaryMetrics?.[0].value).toBe('0.004538 m³');
		expect(r.secondaryMetrics?.[2].value).toBe('0.160256 ft³');
	});

	it('returns a dash for a zero volume when solving for density', () => {
		expect(run({ solve: 'density', vol_L: '0' }).primaryResult).toBe('—');
	});
});
