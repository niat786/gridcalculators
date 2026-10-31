import { describe, expect, it } from 'vitest';
import calc from './calories-burned-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('calories burned calculator', () => {
	it('matches the worked example (walking 3.5 mph, 70 kg, 45 minutes)', () => {
		const r = run({ units: 'metric', kg: '70', activity: 'walk-35', duration: '0:45' });
		expect(r.primaryResult).toBe('226 kcal');
		expect(row(r, 'MET value')).toBe('4.3');
	});

	it('running 8 mph for an hour at 80 kg', () => {
		const r = run({ units: 'metric', kg: '80', activity: 'run-8', duration: '1:0' });
		expect(r.primaryResult).toBe('944 kcal');
		expect(row(r, 'Calories per hour')).toBe('944 kcal');
	});

	it('cycling at 8.0 METs for 30 minutes at 180 lb', () => {
		const r = run({ units: 'imperial', lb: '180', activity: 'bike-moderate', duration: '0:30' });
		expect(r.primaryResult).toBe('327 kcal');
	});

	it('yoga at 60 kg for 90 minutes', () => {
		const r = run({ units: 'metric', kg: '60', activity: 'yoga', duration: '1:30' });
		expect(r.primaryResult).toBe('225 kcal');
		expect(row(r, 'Duration')).toBe('90 min');
	});

	it('returns a dash for a zero duration', () => {
		expect(run({ duration: '0:0' }).primaryResult).toBe('—');
	});
});
