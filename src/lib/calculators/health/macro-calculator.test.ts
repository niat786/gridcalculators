import { describe, expect, it } from 'vitest';
import calc from './macro-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const cell = (r: ReturnType<typeof run>, macro: string, col: 'grams' | 'kcal') =>
	r.table?.rows.find((x) => x.macro.startsWith(macro))?.[col];

describe('macro calculator', () => {
	it('matches the worked example (30-year-old woman, maintain, balanced)', () => {
		const r = run({ sex: 'female', age: '30', kg: '70', cm: '170', activity: 'light', goal: 'maintain', split: 'balanced' });
		expect(r.primaryResult).toBe('1,996 kcal/day');
		expect(cell(r, 'Protein', 'grams')).toBe('150 g');
		expect(cell(r, 'Carbs', 'grams')).toBe('200 g');
		expect(cell(r, 'Fat', 'grams')).toBe('67 g');
	});

	it('subtracts 500 kcal for weight loss with the low-carb split', () => {
		const r = run({ sex: 'male', age: '25', kg: '80', cm: '180', activity: 'moderate', goal: 'lose', split: 'lowcarb' });
		expect(r.primaryResult).toBe('2,298 kcal/day');
		expect(cell(r, 'Protein', 'grams')).toBe('230 g');
		expect(cell(r, 'Carbs', 'grams')).toBe('115 g');
		expect(cell(r, 'Fat', 'grams')).toBe('102 g');
	});

	it('adds 500 kcal for weight gain with the high-protein split', () => {
		const r = run({ sex: 'female', age: '35', kg: '60', cm: '165', activity: 'sedentary', goal: 'gain', split: 'highprotein' });
		expect(r.primaryResult).toBe('2,054 kcal/day');
		expect(cell(r, 'Protein', 'grams')).toBe('206 g');
		expect(cell(r, 'Carbs', 'grams')).toBe('180 g');
		expect(cell(r, 'Fat', 'grams')).toBe('57 g');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ age: '0' });
		expect(r.primaryResult).toBe('—');
		expect(r.table).toBeUndefined();
	});
});
