import { describe, expect, it } from 'vitest';
import calc from './resistor-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('resistor color code calculator', () => {
	it('brown-black-red-gold is 1 kΩ ±5%', () => {
		// (10 × 1 + 0) × 100 = 1000 Ω; ±5% gives 950 Ω to 1050 Ω
		const r = run();
		expect(r.primaryResult).toBe('1 kΩ');
		expect(r.secondaryMetrics?.[0].value).toBe('±5%');
		expect(r.secondaryMetrics?.[1].value).toBe('950 Ω');
		expect(r.secondaryMetrics?.[2].value).toBe('1.05 kΩ');
		expect(r.secondaryMetrics?.[3].value).toBe('Brown · Black · Red · Gold');
	});

	it('yellow-violet-orange-gold is 47 kΩ, between 44.65 kΩ and 49.35 kΩ', () => {
		// (10 × 4 + 7) × 1000 = 47,000 Ω; 47,000 × 0.95 = 44,650; × 1.05 = 49,350
		const r = run({ b1: 'yellow', b2: 'violet', mult: 'orange' });
		expect(r.primaryResult).toBe('47 kΩ');
		expect(r.secondaryMetrics?.[1].value).toBe('44.65 kΩ');
		expect(r.secondaryMetrics?.[2].value).toBe('49.35 kΩ');
	});

	it('5-band brown-black-black-red-brown is 10 kΩ ±1%', () => {
		// (100 × 1 + 0 + 0) × 100 = 10,000 Ω; ±1% gives 9,900 to 10,100 Ω
		const r = run({ bands: '5', b1: 'brown', b2: 'black', b3: 'black', mult: 'red', tol: 'brown' });
		expect(r.primaryResult).toBe('10 kΩ');
		expect(r.secondaryMetrics?.[1].value).toBe('9.9 kΩ');
		expect(r.secondaryMetrics?.[2].value).toBe('10.1 kΩ');
	});

	it('a gold multiplier divides: yellow-violet-gold-silver is 4.7 Ω ±10%', () => {
		// 47 × 0.1 = 4.7 Ω; ±10% gives 4.23 Ω to 5.17 Ω
		const r = run({ b1: 'yellow', b2: 'violet', mult: 'gold', tol: 'silver' });
		expect(r.primaryResult).toBe('4.7 Ω');
		expect(r.secondaryMetrics?.[1].value).toBe('4.23 Ω');
		expect(r.secondaryMetrics?.[2].value).toBe('5.17 Ω');
	});

	it('white-white-white is 99 GΩ', () => {
		expect(run({ b1: 'white', b2: 'white', mult: 'white' }).primaryResult).toBe('99 GΩ');
	});

	it('returns a dash when a band is not a digit color or the multiplier is unknown', () => {
		expect(run({ b1: 'gold' }).primaryResult).toBe('—');
		expect(run({ mult: 'purple' }).primaryResult).toBe('—');
	});
});
