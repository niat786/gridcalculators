import { describe, expect, it } from 'vitest';
import calc from './mass-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('mass calculator', () => {
	it('matches the worked example: 20 L of water is 20 kg, 44.09 lb, 20,000 g', () => {
		const r = run();
		expect(r.primaryResult).toBe('20 kg');
		expect(r.secondaryMetrics?.[0].value).toBe('44.09 lb');
		expect(r.secondaryMetrics?.[1].value).toBe('20,000 g');
	});

	it('1 m³ of steel is 7,850 kg', () => {
		expect(run({ material: 'steel', volume: '1', volumeUnit: 'm3' }).primaryResult).toBe('7,850 kg');
	});

	it('2 ft³ of aluminium is 152.91 kg (337.11 lb)', () => {
		// 2700 kg/m³ × 2 × 0.0283168466 m³ = 152.911 kg; × 2.20462262 = 337.11 lb
		const r = run({ material: 'aluminium', volume: '2', volumeUnit: 'ft3' });
		expect(r.primaryResult).toBe('152.91 kg');
		expect(r.secondaryMetrics?.[0].value).toBe('337.11 lb');
	});

	it('1 US gallon of water is 3.79 kg', () => {
		// 1000 × 0.003785411784 = 3.785 kg
		expect(run({ material: 'water', volume: '1', volumeUnit: 'gal' }).primaryResult).toBe('3.79 kg');
	});

	it('custom density in lb/ft³: 125 lb/ft³ over 1 ft³ is 56.7 kg', () => {
		// 125 ÷ 0.0624279606 = 2002.31 kg/m³; × 0.0283168466 m³ = 56.70 kg
		const r = run({ material: 'custom', densityUnit: 'lbft3', customLb: '125', volume: '1', volumeUnit: 'ft3' });
		expect(r.primaryResult).toBe('56.7 kg');
	});

	it('returns a dash for a zero volume', () => {
		expect(run({ volume: '0' }).primaryResult).toBe('—');
		expect(run({ volume: 'abc' }).primaryResult).toBe('—');
	});
});
