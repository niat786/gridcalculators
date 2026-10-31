import { describe, expect, it } from 'vitest';
import calc from './fat-intake-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('fat intake calculator', () => {
	it('matches the worked example: 2,000 kcal target', () => {
		// 2000 × 20% ÷ 9 = 44.4 g; 2000 × 35% ÷ 9 = 77.8 g; saturated 2000 × 10% ÷ 9 = 22.2 g
		const r = run();
		expect(r.primaryResult).toBe('44–78 g');
		expect(row(r, 'Fat calories (20–35%)')).toBe('400–700 kcal');
		expect(row(r, 'Saturated fat limit (under 10%)')).toBe('22 g or less');
		expect(row(r, 'Middle of the range (27.5%)')).toBe('61 g');
	});

	it('works from a 1,500 kcal target', () => {
		// 1500 × 0.2 ÷ 9 = 33.3 g; 1500 × 0.35 ÷ 9 = 58.3 g; saturated 16.7 g → 16
		const r = run({ kcal: '1500' });
		expect(r.primaryResult).toBe('33–58 g');
		expect(row(r, 'Saturated fat limit (under 10%)')).toBe('16 g or less');
	});

	it('estimates calories for a man: 80 kg, 180 cm, 30 years, moderate activity', () => {
		// BMR = 800 + 1125 − 150 + 5 = 1780; × 1.55 = 2759 kcal
		// 2759 × 20% ÷ 9 = 61.3 g; 2759 × 35% ÷ 9 = 107.3 g
		const r = run({ mode: 'estimate', sex: 'male', age: '30', kg: '80', cm: '180', activity: 'moderate' });
		expect(r.primaryResult).toBe('61–107 g');
		expect(row(r, 'Calories used')).toBe('2,759 kcal');
	});

	it('returns a dash when the calorie target is missing', () => {
		expect(run({ kcal: '' }).primaryResult).toBe('—');
	});
});
