import { describe, expect, it } from 'vitest';
import calc from './voltage-drop-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('voltage drop calculator', () => {
	it('matches the worked example: 10 AWG copper, 50 ft, 20 A, 120 V single-phase', () => {
		// R = 1.21 × 50 ÷ 1000 = 0.0605 Ω; drop = 2 × 20 × 0.0605 = 2.42 V; 2.42 ÷ 120 = 2.02%
		const r = run();
		expect(r.primaryResult).toBe('2.02%');
		expect(row(r, 'Volts dropped')).toBe('2.42 V');
		expect(row(r, 'Voltage at the load')).toBe('117.6 V');
		expect(row(r, 'Against the 3% guide')).toBe('Within 3%');
	});

	it('flags 12 AWG copper over 100 ft at 20 A: 2 × 20 × 0.193 = 7.72 V, 6.43%', () => {
		const r = run({ awg: '12', lengthFt: '100', current: '20', volts: '120' });
		expect(r.primaryResult).toBe('6.43%');
		expect(row(r, 'Voltage at the load')).toBe('112.3 V');
		expect(row(r, 'Resistance, one way')).toBe('0.1930 Ω');
		expect(row(r, 'Against the 3% guide')).toBe('Above 3%');
	});

	it('uses √3 for three-phase: 4 AWG aluminum, 150 ft, 60 A, 208 V', () => {
		// R = 0.508 × 150 ÷ 1000 = 0.0762 Ω; drop = √3 × 60 × 0.0762 = 7.92 V; 7.92 ÷ 208 = 3.81%
		const r = run({ phase: 'three', material: 'aluminum', awg: '4', lengthFt: '150', current: '60', volts: '208' });
		expect(r.primaryResult).toBe('3.81%');
		expect(row(r, 'Voltage at the load')).toBe('200.1 V');
	});

	it('uses resistivity for mm²: 2.5 mm² copper, 30 m, 16 A, 230 V single-phase', () => {
		// R = 0.02156 ÷ 2.5 × 30 = 0.2587 Ω; drop = 2 × 16 × 0.2587 = 8.28 V; 8.28 ÷ 230 = 3.60%
		const r = run({ system: 'mm2', mm2: '2.5', units: 'metric', lengthM: '30', current: '16', volts: '230' });
		expect(r.primaryResult).toBe('3.60%');
		expect(row(r, 'Volts dropped')).toBe('8.28 V');
		expect(row(r, 'Voltage at the load')).toBe('221.7 V');
	});

	it('converts metres for AWG: 6 AWG copper, 10 m, 30 A, 240 V single-phase', () => {
		// 0.491 ÷ 1000 × 3.2808 = 0.0016109 Ω/m × 10 m = 0.0161 Ω; drop = 2 × 30 × 0.0161 = 0.97 V; 0.40%
		const r = run({ awg: '6', units: 'metric', lengthM: '10', current: '30', volts: '240' });
		expect(r.primaryResult).toBe('0.40%');
		expect(row(r, 'Resistance, one way')).toBe('0.0161 Ω');
	});

	it('returns a dash when the current is missing', () => {
		expect(run({ current: '' }).primaryResult).toBe('—');
	});
});
