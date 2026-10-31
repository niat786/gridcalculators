import { describe, expect, it } from 'vitest';
import calc from './army-body-fat-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('army body fat calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('0.514');
		expect(r.secondaryMetrics?.[2].value).toBe('38.5 in');
		expect(r.secondaryMetrics?.[3].value).toBe('2.5 in');
	});
	it('flags exactly 0.55', () => {
		expect(run({ hIn: '70', wIn: '38.5' }).secondaryMetrics?.[0].value).toBe('Does not meet');
	});
	it('works in centimeters', () => {
		const r = run({ units: 'cm', hCm: '180', wCm: '90' });
		expect(r.primaryResult).toBe('0.500');
		expect(r.secondaryMetrics?.[2].value).toBe('99 cm');
	});
});
