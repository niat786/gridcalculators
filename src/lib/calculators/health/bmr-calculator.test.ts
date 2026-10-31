import { describe, expect, it } from 'vitest';
import calc from './bmr-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, start: string) => r.secondaryMetrics?.find((m) => m.label.startsWith(start))?.value;

describe('BMR calculator', () => {
	it('matches the worked example (30-year-old woman, 70 kg, 170 cm)', () => {
		const r = run({ sex: 'female', age: '30', kg: '70', cm: '170' });
		expect(r.primaryResult).toBe('1,452 kcal/day');
		expect(row(r, 'Harris')).toBe('1,492 kcal/day');
	});

	it('computes all three equations for a man with body fat entered', () => {
		const r = run({ sex: 'male', age: '30', kg: '80', cm: '180', bodyFat: '15' });
		expect(r.primaryResult).toBe('1,780 kcal/day');
		expect(row(r, 'Harris')).toBe('1,854 kcal/day');
		expect(row(r, 'Katch')).toBe('1,839 kcal/day');
	});

	it('computes a woman at 45 years old, 60 kg, 165 cm with no body fat', () => {
		const r = run({ sex: 'female', age: '45', kg: '60', cm: '165' });
		expect(r.primaryResult).toBe('1,245 kcal/day');
		expect(row(r, 'Katch')).toBe('Enter body fat %');
	});

	it('converts imperial units before calculating', () => {
		const r = run({ units: 'imperial', sex: 'male', age: '40', lb: '200', ft: '6', in: '0' });
		expect(r.primaryResult).toBe('1,855 kcal/day');
		expect(row(r, 'Harris')).toBe('1,954 kcal/day');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ age: '0' }).primaryResult).toBe('—');
		expect(run({ bodyFat: 'abc' }).primaryResult).toBe('—');
	});
});
