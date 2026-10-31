import { describe, expect, it } from 'vitest';
import calc from './one-rep-max-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('one rep max calculator', () => {
	it('matches the worked example (100 kg for 5 reps)', () => {
		const r = run({ unit: 'kg', weight: '100', reps: '5' });
		expect(r.primaryResult).toBe('116.7 kg');
		expect(row(r, 'Brzycki')).toBe('112.5 kg');
		expect(row(r, 'Lombardi')).toBe('117.5 kg');
		expect(r.table?.rows[0]).toEqual({ percent: '95%', load: '110.8 kg' });
	});

	it('reports pounds for a 225 lb set of 8 reps', () => {
		const r = run({ unit: 'lb', weight: '225', reps: '8' });
		expect(r.primaryResult).toBe('285.0 lb');
		expect(row(r, 'Brzycki')).toBe('279.3 lb');
		expect(row(r, 'Lombardi')).toBe('277.0 lb');
	});

	it('handles a heavy triple', () => {
		const r = run({ unit: 'kg', weight: '140', reps: '3' });
		expect(r.primaryResult).toBe('154.0 kg');
		expect(row(r, 'Brzycki')).toBe('148.2 kg');
		expect(row(r, 'Lombardi')).toBe('156.3 kg');
	});

	it('returns a dash for reps outside 1 to 12', () => {
		expect(run({ reps: '0' }).primaryResult).toBe('—');
		expect(run({ reps: '13' }).primaryResult).toBe('—');
	});
});
