import { describe, expect, it } from 'vitest';
import calc, { bodyShape } from './body-type-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

// Centimetre keys. Each case is checked in inches in the comment (1 cm = 0.3937 in).
const cm = (bust: number, waist: number, hip: number) => ({
	bustCm: String(bust),
	waistCm: String(waist),
	hipCm: String(hip),
	highHipCm: String(hip)
});

describe('body type calculator (fit guide)', () => {
	it('matches the default example: bust 90, waist 70, hip 97 cm → hourglass', () => {
		// Hips − bust 2.8 in (under 3.6); bust − waist 7.9 in; hips − waist 10.6 in (≥ 10)
		expect(run().primaryResult).toBe('Hourglass');
	});

	it('finds a bottom hourglass: bust 86, waist 64, hip 100 cm', () => {
		// Hips − bust 5.5 in; hips − waist 14.2 in
		expect(run(cm(86, 64, 100)).primaryResult).toBe('Bottom hourglass');
	});

	it('finds a top hourglass: bust 100, waist 70, hip 90 cm', () => {
		// Bust − hips 3.9 in; bust − waist 11.8 in
		expect(run(cm(100, 70, 90)).primaryResult).toBe('Top hourglass');
	});

	it('finds a spoon: bust 90, waist 76, hip 100 cm', () => {
		// Hips − bust 3.9 in; hips − waist 9.4 in (under 10); bust − waist 5.5 in (≥ 5)
		expect(run(cm(90, 76, 100)).primaryResult).toBe('Spoon');
	});

	it('finds a triangle (pear): bust 85, waist 80, hip 100 cm', () => {
		// Hips − bust 5.9 in; bust − waist 2.0 in (under 5)
		expect(run(cm(85, 80, 100)).primaryResult).toBe('Triangle (pear)');
	});

	it('finds an inverted triangle: bust 100, waist 90, hip 90 cm', () => {
		// Bust − hips 3.9 in; bust − waist 3.9 in (under 9)
		expect(run(cm(100, 90, 90)).primaryResult).toBe('Inverted triangle');
	});

	it('finds a rectangle: bust 90, waist 85, hip 92 cm', () => {
		// All differences under the thresholds
		expect(run(cm(90, 85, 92)).primaryResult).toBe('Rectangle');
	});

	it('works in inches: bust 35, waist 27.5, hip 38 in → hourglass', () => {
		const r = run({ units: 'imperial', bustIn: '35', waistIn: '27.5', highHipIn: '35', hipIn: '38' });
		expect(r.primaryResult).toBe('Hourglass');
		expect(r.secondaryMetrics?.[1].value).toBe('+7.5 in');
	});

	it('exposes the rule function directly', () => {
		expect(bodyShape(35, 27.5, 38)).toBe('Hourglass');
	});

	it('returns a dash when a measurement is missing', () => {
		expect(run({ bustCm: '' }).primaryResult).toBe('—');
	});
});
