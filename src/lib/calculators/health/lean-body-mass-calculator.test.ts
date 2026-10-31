import { describe, expect, it } from 'vitest';
import calc from './lean-body-mass-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const row = (r: ReturnType<typeof run>, formula: string, col: 'lean' | 'fat') => r.table?.rows.find((x) => x.formula === formula)?.[col];

describe('lean body mass calculator', () => {
	it('matches the worked example (woman, 70 kg, 170 cm)', () => {
		const r = run({ sex: 'female', units: 'metric', kg: '70', cm: '170' });
		expect(r.primaryResult).toBe('49.8 kg');
		expect(metric(r, 'Fat mass (Boer)')).toBe('20.3 kg');
		expect(metric(r, 'Implied body fat (Boer)')).toBe('28.9%');
		expect(metric(r, 'Range across formulas')).toBe('48.5–49.8 kg');
		expect(row(r, 'Hume (1966)', 'lean')).toBe('48.5 kg');
		expect(row(r, 'Hume (1966)', 'fat')).toBe('30.7%');
		expect(row(r, 'James (1976)', 'fat')).toBe('28.8%');
	});

	it('computes the Boer, James and Hume results for a man, 80 kg, 180 cm', () => {
		const r = run({ sex: 'male', units: 'metric', kg: '80', cm: '180' });
		expect(r.primaryResult).toBe('61.4 kg');
		expect(row(r, 'James (1976)', 'lean')).toBe('62.7 kg');
		expect(row(r, 'Hume (1966)', 'lean')).toBe('57.8 kg');
		expect(metric(r, 'Implied body fat (Boer)')).toBe('23.2%');
	});

	it('converts imperial input: 154 lb, 5 ft 7 in, woman', () => {
		const r = run({ sex: 'female', units: 'imperial', lb: '154', ft: '5', in: '7' });
		expect(r.primaryResult).toBe('109.8 lb');
		expect(metric(r, 'Implied body fat (Boer)')).toBe('28.7%');
		expect(metric(r, 'Range across formulas')).toBe('107.0–109.8 lb');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ kg: '0' }).primaryResult).toBe('—');
		expect(run({ cm: '' }).primaryResult).toBe('—');
		expect(run({ kg: '1e309' }).primaryResult).toBe('—');
	});
});
