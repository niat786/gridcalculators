import { describe, expect, it } from 'vitest';
import calc from './carbohydrate-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const cell = (r: ReturnType<typeof run>, level: string, col: 'kcal' | 'grams') => r.table?.rows.find((x) => x.level === level)?.[col];

describe('carbohydrate calculator', () => {
	it('matches the worked example (30-year-old woman, 70 kg, 170 cm, light activity)', () => {
		const r = run({ mode: 'estimate', sex: 'female', age: '30', kg: '70', cm: '170', activity: 'light' });
		expect(r.primaryResult).toBe('225–324 g/day');
		expect(metric(r, 'Calorie target')).toBe('1,996 kcal/day');
		expect(metric(r, 'Middle of range (55%)')).toBe('275 g');
		expect(cell(r, 'Low', 'grams')).toBe('225 g');
		expect(cell(r, 'High', 'grams')).toBe('324 g');
	});

	it('uses a calorie target entered directly: 2,000 kcal gives 225 to 325 g', () => {
		const r = run({ mode: 'direct', kcal: '2000' });
		expect(r.primaryResult).toBe('225–325 g/day');
		expect(cell(r, 'Middle', 'kcal')).toBe('1,100 kcal');
		expect(cell(r, 'Middle', 'grams')).toBe('275 g');
		expect(cell(r, 'High', 'kcal')).toBe('1,300 kcal');
	});

	it('estimates a 25-year-old man, 80 kg, 180 cm, moderate activity (2,798 kcal)', () => {
		const r = run({ mode: 'estimate', sex: 'male', age: '25', kg: '80', cm: '180', activity: 'moderate' });
		expect(metric(r, 'Calorie target')).toBe('2,798 kcal/day');
		expect(r.primaryResult).toBe('315–455 g/day');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ mode: 'estimate', age: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'direct', kcal: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'direct', kcal: '1e309' }).primaryResult).toBe('—');
	});
});
