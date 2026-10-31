import { describe, expect, it } from 'vitest';
import calc, { solve, withPrefix } from './ohms-law-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe("ohm's law calculator", () => {
	it('matches the worked example: 12 V across 470 Ω gives 25.532 mA and 306.383 mW', () => {
		const r = run();
		expect(r.primaryResult).toBe('306.383 mW');
		expect(metric(r, 'Voltage')).toBe('12 V');
		expect(metric(r, 'Current')).toBe('25.532 mA');
		expect(metric(r, 'Resistance')).toBe('470 Ω');
		expect(metric(r, 'Power')).toBe('306.383 mW');
	});

	it('solves resistance from voltage and current: 12 V and 2 A gives 6 Ω', () => {
		const r = run({ pair: 'VI', voltage: '12', current: '2', target: 'R' });
		expect(r.primaryResult).toBe('6 Ω');
		expect(metric(r, 'Power')).toBe('24 W');
	});

	it('solves voltage from current and power: 2 A and 60 W gives 30 V and 15 Ω', () => {
		const r = run({ pair: 'IP', current: '2', power: '60', target: 'V' });
		expect(r.primaryResult).toBe('30 V');
		expect(metric(r, 'Resistance')).toBe('15 Ω');
	});

	it('solves current from voltage and power: 120 V and 60 W gives 500 mA', () => {
		expect(run({ pair: 'VP', voltage: '120', power: '60', target: 'I' }).primaryResult).toBe('500 mA');
	});

	it('solves voltage from resistance and power: 1000 Ω and 1 W gives 31.623 V and 31.623 mA', () => {
		const r = run({ pair: 'RP', resistance: '1000', power: '1', target: 'V' });
		expect(r.primaryResult).toBe('31.623 V');
		expect(metric(r, 'Current')).toBe('31.623 mA');
	});

	it('uses SI prefixes for large values: 1 kΩ and 1 MΩ', () => {
		expect(withPrefix(1000, 'Ω')).toBe('1 kΩ');
		expect(withPrefix(2_500_000, 'Ω')).toBe('2.5 MΩ');
		expect(withPrefix(0.144, 'W')).toBe('144 mW');
	});

	it('solve() returns all four quantities for a pair', () => {
		const s = solve('VR', 12, 1000);
		expect(s.I).toBeCloseTo(0.012, 12);
		expect(s.P).toBeCloseTo(0.144, 12);
	});

	it('returns a dash when a known value is zero', () => {
		expect(run({ pair: 'VI', voltage: '12', current: '0', target: 'R' }).primaryResult).toBe('—');
	});

	it('returns a dash when a known value is blank', () => {
		expect(run({ resistance: '' }).primaryResult).toBe('—');
	});
});
