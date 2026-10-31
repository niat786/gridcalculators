import { describe, expect, it } from 'vitest';
import calc from './tdee-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('TDEE calculator', () => {
	it('matches the worked example (30-year-old woman, light activity)', () => {
		const r = run({ sex: 'female', age: '30', kg: '70', cm: '170', activity: 'light' });
		expect(r.primaryResult).toBe('1,996 kcal/day');
		expect(row(r, 'Sedentary (× 1.2)')).toBe('1,742 kcal/day');
		expect(row(r, 'Very active (× 1.9)')).toBe('2,758 kcal/day');
	});

	it('uses the moderate factor for a man of 80 kg and 180 cm', () => {
		const r = run({ sex: 'male', age: '30', kg: '80', cm: '180', activity: 'moderate' });
		expect(r.primaryResult).toBe('2,759 kcal/day');
	});

	it('uses the sedentary factor for a woman of 45 years, 60 kg, 165 cm', () => {
		const r = run({ sex: 'female', age: '45', kg: '60', cm: '165', activity: 'sedentary' });
		expect(r.primaryResult).toBe('1,494 kcal/day');
	});

	it('converts imperial units and uses the active factor', () => {
		const r = run({ units: 'imperial', sex: 'male', age: '40', lb: '200', ft: '6', in: '0', activity: 'active' });
		expect(r.primaryResult).toBe('3,200 kcal/day');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ kg: '' }).primaryResult).toBe('—');
		expect(run({ age: 'abc' }).primaryResult).toBe('—');
	});
});
