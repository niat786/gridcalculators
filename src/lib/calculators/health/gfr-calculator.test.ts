import { describe, expect, it } from 'vitest';
import calc, { ckdEpi2021, gfrStage } from './gfr-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('GFR calculator', () => {
	it('matches the worked example', () => {
		expect(run().primaryResult).toBe('92 mL/min/1.73 m²');
	});
	it('matches CKD-EPI 2021 reference values', () => {
		expect(ckdEpi2021(1.0, 60, true)).toBeCloseTo(64.5, 1);
		expect(ckdEpi2021(0.8, 40, true)).toBeCloseTo(95.5, 1);
		expect(ckdEpi2021(2.5, 70, false)).toBeCloseTo(27.0, 1);
	});
	it('converts µmol/L', () => {
		expect(run({ unit: 'umol', scr: '88.4' }).primaryResult).toBe('92 mL/min/1.73 m²');
	});
	it('assigns KDIGO stages', () => {
		expect(gfrStage(95).stage).toBe('G1');
		expect(gfrStage(50).stage).toBe('G3a');
		expect(gfrStage(10).stage).toBe('G5');
	});
	it('rejects a µmol/L value entered as mg/dL', () => {
		expect(run({ scr: '88' }).primaryResult).toBe('—');
	});
});
