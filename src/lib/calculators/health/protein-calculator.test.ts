import { describe, expect, it } from 'vitest';
import calc from './protein-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const meal = (r: ReturnType<typeof run>, meals: string) => r.table?.rows.find((x) => x.meals === meals)?.perMeal;

describe('protein calculator', () => {
	it('matches the worked example (active adult, 70 kg)', () => {
		const r = run({ units: 'metric', kg: '70', goal: 'active' });
		expect(r.primaryResult).toBe('84–112 g/day');
		expect(metric(r, 'Per kg of body weight')).toBe('1.2–1.6 g/kg');
		expect(meal(r, '3 meals')).toBe('28–37 g');
		expect(meal(r, '4 meals')).toBe('21–28 g');
	});

	it('uses the RDA as a single figure for a sedentary adult: 0.8 g per kg gives 56 g', () => {
		const r = run({ units: 'metric', kg: '70', goal: 'sedentary' });
		expect(r.primaryResult).toBe('56 g/day');
		expect(metric(r, 'Calories from protein')).toBe('224 kcal');
	});

	it('uses the strength range for 80 kg: 128 to 176 g', () => {
		const r = run({ units: 'metric', kg: '80', goal: 'strength' });
		expect(r.primaryResult).toBe('128–176 g/day');
		expect(meal(r, '3 meals')).toBe('43–59 g');
	});

	it('converts imperial input: 154 lb is about 70 kg, so the active range is the same', () => {
		const r = run({ units: 'imperial', lb: '154', goal: 'active' });
		expect(r.primaryResult).toBe('84–112 g/day');
		expect(metric(r, 'Body weight used')).toBe('69.9 kg (154.0 lb)');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ kg: '0' }).primaryResult).toBe('—');
		expect(run({ kg: 'abc' }).primaryResult).toBe('—');
		expect(run({ goal: 'nope' }).primaryResult).toBe('—');
	});
});
