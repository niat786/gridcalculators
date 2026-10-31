import { describe, expect, it } from 'vitest';
import calc from './height-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('height calculator', () => {
	it('matches the worked example: boy, father 180 cm, mother 165 cm', () => {
		// (180 + 165 + 13) ÷ 2 = 179; range 170.5 to 187.5
		const r = run({ sex: 'boy', fatherCm: '180', motherCm: '165' });
		expect(r.primaryResult).toBe('179 cm');
		expect(r.secondaryMetrics?.[0].value).toBe('170.5 to 187.5 cm');
	});

	it('subtracts 13 cm for a girl: father 175 cm, mother 160 cm', () => {
		// (175 + 160 − 13) ÷ 2 = 161; range 152.5 to 169.5
		const r = run({ sex: 'girl', fatherCm: '175', motherCm: '160' });
		expect(r.primaryResult).toBe('161 cm');
		expect(r.secondaryMetrics?.[0].value).toBe('152.5 to 169.5 cm');
	});

	it('converts feet and inches: boy, father 5 ft 11 in, mother 5 ft 5 in', () => {
		// 180.34 cm and 165.10 cm → (180.34 + 165.10 + 13) ÷ 2 = 179.22 cm = 5 ft 10.6 in
		const r = run({ units: 'imperial', sex: 'boy', fatherFt: '5', fatherIn: '11', motherFt: '5', motherIn: '5' });
		expect(r.primaryResult).toBe('5 ft 10.6 in');
	});

	it('girl in feet and inches: father 5 ft 9 in, mother 5 ft 3 in', () => {
		// 175.26 and 160.02 cm → (175.26 + 160.02 − 13) ÷ 2 = 161.14 cm = 5 ft 3.4 in
		const r = run({ units: 'imperial', sex: 'girl', fatherFt: '5', fatherIn: '9', motherFt: '5', motherIn: '3' });
		expect(r.primaryResult).toBe('5 ft 3.4 in');
	});

	it('returns a dash when a parent height is missing', () => {
		expect(run({ fatherCm: '' }).primaryResult).toBe('—');
	});
});
